-- Enhanced database schema for multi-agent system
-- Run: wrangler d1 execute agent-database --file=schema.sql --remote

-- Agents table with memory and thinking capabilities
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  config TEXT NOT NULL,
  mcp_servers TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  memory_enabled BOOLEAN DEFAULT 1,
  sequential_thinking_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks with MCP tool tracking
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT DEFAULT 'pending',
  mcp_tools_used TEXT,
  thinking_steps TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Conversations with embeddings
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL,
  agent_id TEXT,
  embedding_stored BOOLEAN DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- MCP connections tracking
CREATE TABLE IF NOT EXISTS mcp_connections (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  mcp_server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  tools_available TEXT,
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Workflows with advanced orchestration
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agents TEXT NOT NULL,
  orchestration_type TEXT DEFAULT 'supervisor',
  status TEXT DEFAULT 'active',
  execution_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memory storage for persistent context
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  content TEXT NOT NULL,
  tags TEXT,
  importance REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Sequential thinking steps
CREATE TABLE IF NOT EXISTS thinking_steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  stage TEXT NOT NULL,
  thought TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Research sessions for web scraping/search
CREATE TABLE IF NOT EXISTS research_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  query TEXT NOT NULL,
  sources TEXT,
  findings TEXT,
  mcp_tools_used TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Code execution logs (E2B)
CREATE TABLE IF NOT EXISTS code_executions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'python',
  output TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  sandbox_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_agent ON mcp_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_thinking_steps_task ON thinking_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_agent ON research_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_code_executions_agent ON code_executions(agent_id);
