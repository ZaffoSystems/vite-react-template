/**
 * Migration Runner - Database Schema Initialization
 *
 * Runs migrations to initialize the D1 database schema
 */

import { Env } from '../types/env';

export class MigrationRunner {
  constructor(private env: Env) {}

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('Running database migrations...');

    // Check if migrations table exists
    try {
      await this.env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)'
      ).run();
    } catch (error) {
      console.error('Failed to create migrations table:', error);
      throw error;
    }

    // Check if initial schema has been applied
    const applied = await this.env.DB.prepare(
      'SELECT * FROM _migrations WHERE id = ?'
    ).bind('0001_initial_schema').first();

    if (applied) {
      console.log('Initial schema already applied');
      return;
    }

    // Run initial schema migration
    await this.runInitialSchema();

    // Mark migration as applied
    await this.env.DB.prepare(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)'
    ).bind('0001_initial_schema', Math.floor(Date.now() / 1000)).run();

    console.log('Migrations completed successfully');
  }

  /**
   * Run the initial schema migration
   */
  private async runInitialSchema(): Promise<void> {
    const migrations = [
      // Agents table
      `CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('utility', 'learning', 'dynamic', 'react', 'infrastructure', 'master')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'stopped')),
        capabilities TEXT NOT NULL,
        model TEXT DEFAULT 'dynamic/RE_Ant',
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 4096,
        system_prompt TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT
      )`,

      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        priority INTEGER DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        result TEXT,
        error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        started_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )`,

      // Task indexes
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)`,

      // Credentials table
      `CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        credential_type TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        env_var_name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        expires_at INTEGER
      )`,

      `CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_env_var ON credentials(env_var_name)`,

      // Deployments table
      `CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        worker_name TEXT NOT NULL,
        script_content TEXT NOT NULL,
        bindings TEXT,
        environment_vars TEXT,
        routes TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'deploying', 'active', 'failed', 'deleted')),
        worker_url TEXT,
        deployment_metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        deployed_at INTEGER,
        error TEXT
      )`,

      `CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_deployments_worker_name ON deployments(worker_name)`,

      // Document chunks table
      `CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        metadata TEXT,
        embedding_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,

      `CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_type ON document_chunks(document_type)`,

      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_message TEXT NOT NULL,
        agent_response TEXT NOT NULL,
        intent TEXT,
        entities TEXT,
        context TEXT,
        agent_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id)`,

      // CF resources table
      `CREATE TABLE IF NOT EXISTS cf_resources (
        id TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL CHECK(resource_type IN ('kv', 'd1', 'r2', 'vectorize', 'durable_object', 'queue', 'hyperdrive')),
        resource_name TEXT NOT NULL,
        resource_id TEXT,
        configuration TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        deleted_at INTEGER
      )`,

      `CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_name_type ON cf_resources(resource_name, resource_type)`,

      // Learning examples table
      `CREATE TABLE IF NOT EXISTS learning_examples (
        id TEXT PRIMARY KEY,
        input_pattern TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        actual_output TEXT,
        success BOOLEAN,
        feedback_score REAL,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,

      `CREATE INDEX IF NOT EXISTS idx_learning_success ON learning_examples(success)`,

      // System config table
      `CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,

      // Insert default system config
      `INSERT OR IGNORE INTO system_config (key, value, description) VALUES
        ('rag_enabled', 'true', 'Enable RAG for context retrieval'),
        ('rag_chunk_size', '1000', 'Default chunk size for RAG documents'),
        ('rag_chunk_overlap', '200', 'Overlap between chunks'),
        ('default_model', 'dynamic/RE_Ant', 'Default AI model to use'),
        ('max_task_retries', '3', 'Maximum retries for failed tasks'),
        ('auto_deploy_enabled', 'true', 'Enable automatic worker deployment')`,

      // Insert default Master Control Agent
      `INSERT OR IGNORE INTO agents (id, name, type, capabilities, system_prompt) VALUES (
        'master-control-agent',
        'Master Control Agent',
        'master',
        '{"canManageInfrastructure":true,"canDeployWorkers":true,"canAccessSSH":false,"canQueryRAG":true,"canLearn":true,"canReact":true,"canSyncDocker":false,"canUseMCP":true}',
        'You are the Master Control Agent. You can understand natural language commands and execute them by:
1. Deploying Cloudflare Workers
2. Creating and managing CF resources (KV, D1, R2, Vectorize)
3. Integrating with 71+ MCP servers for external services
4. Querying databases and vector stores
5. Generating code and infrastructure
6. Managing credentials and secrets

You use Cloudflare AI Gateway with the model dynamic/RE_Ant for all AI operations.
Always respond with actionable steps and execute them autonomously.'
      )`,
    ];

    for (const migration of migrations) {
      try {
        await this.env.DB.prepare(migration).run();
      } catch (error) {
        console.error('Migration failed:', migration.substring(0, 100), error);
        throw error;
      }
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    tables: string[];
    agentCount: number;
    taskCount: number;
    error?: string;
  }> {
    try {
      // List all tables
      const tablesResult = await this.env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all<{ name: string }>();

      const tables = tablesResult.results?.map(r => r.name) || [];

      // Count agents
      const agentCount = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM agents'
      ).first<{ count: number }>();

      // Count tasks
      const taskCount = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM tasks'
      ).first<{ count: number }>();

      return {
        healthy: true,
        tables,
        agentCount: agentCount?.count || 0,
        taskCount: taskCount?.count || 0,
      };
    } catch (error) {
      return {
        healthy: false,
        tables: [],
        agentCount: 0,
        taskCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
