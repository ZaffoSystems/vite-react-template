/**
 * Master Agent - Autonomous Infrastructure Management
 *
 * Understands natural language and executes:
 * - Worker deployment with automatic resource creation
 * - Code generation with bindings
 * - Resource provisioning (KV, D1, R2, Vectorize, Hyperdrive, Durable Objects)
 * - MCP server integration
 * - Task orchestration
 */

import { Env } from '../types/env';
import { AIGatewayClient } from '../lib/ai-gateway';
import { ResourceManager, ResourceBinding } from './resource-manager';
import { RAGService } from './rag-service';
import { CodeGeneratorAgent } from '../agents/code-generator';
import { CloudflareAPI } from '../lib/cloudflare-api';
import { AwesomeMCPManager } from '../lib/mcp-awesome-servers';

export interface MasterAgentCommand {
  userMessage: string;
  context?: any;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  resources: ResourceBinding[];
  mcpServers: string[];
}

export interface ExecutionStep {
  type: 'create_resource' | 'generate_code' | 'deploy_worker' | 'call_mcp' | 'query_database';
  description: string;
  params: any;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  deploymentUrl?: string;
  resourceIds?: Record<string, string>;
  data?: any;
  error?: string;
}

export class MasterAgent {
  private aiGateway: AIGatewayClient;
  private resourceManager: ResourceManager;
  private ragService: RAGService;
  private codeGenerator: CodeGeneratorAgent;
  private cloudflareAPI: CloudflareAPI;
  private mcpServers: AwesomeMCPManager;
  private env: Env;

  private systemPrompt = `You are the Master Control Agent for Cloudflare infrastructure management.

Your capabilities:
1. **Resource Management**: Create and manage KV, D1, R2, Vectorize, Hyperdrive, Durable Objects, Queues
2. **Worker Deployment**: Generate code, provision resources, deploy workers autonomously
3. **MCP Integration**: Access 71+ MCP servers for external services (GitHub, Slack, AWS, GCP, databases, etc.)
4. **Code Generation**: Generate TypeScript worker code with proper bindings and routing
5. **RAG Context**: Use semantic search to find relevant code examples and documentation
6. **Natural Language Understanding**: Parse user commands and create execution plans

When a user gives you a command, you must:
1. Analyze the intent and extract entities
2. Create an execution plan with specific steps
3. Determine required resources (KV, D1, R2, Vectorize, Hyperdrive, Durable Objects)
4. Identify which MCP servers to use
5. Generate any necessary code
6. Execute the plan autonomously
7. Return concrete results (URLs, IDs, data)

Examples:
- "build a worker to analyze google ads" → Create execution plan → Generate code → Provision KV/D1 → Deploy → Return URL
- "query my postgres database for users" → Detect Postgres MCP → Use neon/supabase/planetscale → Execute query → Return results
- "create a RAG system for my docs" → Create Vectorize index → Create D1 database → Generate RAG worker → Deploy → Return setup info
- "deploy a worker with hyperdrive connection to my mysql db" → Create Hyperdrive → Generate worker with DB binding → Deploy → Return URL

Always respond with actionable JSON execution plans, not just explanations.`;

  constructor(env: Env) {
    this.env = env;
    this.aiGateway = new AIGatewayClient(env);
    this.resourceManager = new ResourceManager(env);
    this.ragService = new RAGService(env);
    this.codeGenerator = new CodeGeneratorAgent(env);
    this.cloudflareAPI = new CloudflareAPI(env);
    this.mcpServers = new AwesomeMCPManager(env);
  }

  /**
   * Process natural language command
   */
  async processCommand(command: MasterAgentCommand): Promise<ExecutionResult> {
    try {
      // Get RAG context if available
      const ragContext = await this.ragService.getContext(command.userMessage, 1500);

      // Create execution plan
      const plan = await this.createExecutionPlan(command.userMessage, ragContext);

      // Store conversation
      await this.storeConversation(command.userMessage, JSON.stringify(plan));

      // Execute plan
      const result = await this.executePlan(plan);

      // Update conversation with result
      await this.storeConversation(command.userMessage, JSON.stringify(result), plan);

      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process command',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create execution plan from natural language
   */
  private async createExecutionPlan(userMessage: string, ragContext: string): Promise<ExecutionPlan> {
    const prompt = `${this.systemPrompt}

RAG Context:
${ragContext}

User Command: "${userMessage}"

Create a detailed execution plan with:
1. Step-by-step actions (create_resource, generate_code, deploy_worker, call_mcp, query_database)
2. Required Cloudflare resources (specify type and name)
3. MCP servers to use (if any)

Respond with JSON in this exact format:
{
  "steps": [
    {"type": "create_resource", "description": "...", "params": {...}},
    {"type": "generate_code", "description": "...", "params": {...}},
    {"type": "deploy_worker", "description": "...", "params": {...}}
  ],
  "resources": [
    {"type": "kv|d1|r2|vectorize|hyperdrive|durable_object|queue", "name": "...", "config": {...}}
  ],
  "mcpServers": ["github", "slack", "postgres_neon", ...]
}`;

    const response = await this.aiGateway.compatChatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'dynamic/RE_Ant',
      temperature: 0.2,
      maxTokens: 2000
    });

    // Parse JSON from response
    const responseText = typeof response === 'string' ? response : JSON.stringify(response);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate execution plan');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Execute the plan step by step
   */
  private async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const resourceIds: Record<string, string> = {};
    let deploymentUrl: string | undefined;
    let data: any;

    // Step 1: Create resources
    for (const resource of plan.resources) {
      try {
        let result: { id: string; name: string };

        switch (resource.type) {
          case 'kv':
            result = await this.resourceManager.createKVNamespace(resource.name);
            break;
          case 'd1':
            result = await this.resourceManager.createD1Database(resource.name);
            break;
          case 'r2':
            result = await this.resourceManager.createR2Bucket(resource.name);
            break;
          case 'vectorize':
            result = await this.resourceManager.createVectorizeIndex(
              resource.name,
              resource.config?.dimensions,
              resource.config?.metric
            );
            break;
          case 'hyperdrive':
            result = await this.resourceManager.createHyperdrive(
              resource.name,
              resource.config?.connectionString,
              resource.config?.database
            );
            break;
          case 'queue':
            result = await this.resourceManager.createQueue(resource.name);
            break;
          default:
            continue;
        }

        resourceIds[resource.name] = result.id;
        resource.id = result.id; // Update binding with ID
      } catch (error) {
        console.error(`Failed to create ${resource.type} ${resource.name}:`, error);
      }
    }

    // Step 2: Execute plan steps
    for (const step of plan.steps) {
      try {
        switch (step.type) {
          case 'create_resource':
            // Already handled above
            break;

          case 'generate_code':
            const generatedCode = await this.codeGenerator.generateWorkerCode(
              step.params.description || step.description,
              plan.resources
            );
            step.params.generatedCode = generatedCode;
            break;

          case 'deploy_worker':
            const workerName = step.params.workerName || this.generateWorkerName();
            const workerCode = step.params.generatedCode || step.params.code;

            if (!workerCode) {
              throw new Error('No code provided for deployment');
            }

            // Generate binding config
            const bindingConfig = this.resourceManager.generateBindingConfig(plan.resources);

            // Deploy worker
            const deployment = await this.cloudflareAPI.deployWorker(
              workerName,
              workerCode,
              bindingConfig
            );

            deploymentUrl = `https://${workerName}.${deployment.subdomain || 'workers.dev'}`;

            // Store deployment in D1
            await this.storeDeployment(workerName, workerCode, plan.resources, deploymentUrl);
            break;

          case 'call_mcp':
            const mcpServer = step.params.server;
            const mcpMethod = step.params.method;
            const mcpParams = step.params.params || [];

            // Execute MCP call
            const mcpResult = await this.executeMCPCall(mcpServer, mcpMethod, mcpParams);
            data = mcpResult;
            break;

          case 'query_database':
            // Handle database queries
            const dbResult = await this.executeQuery(step.params);
            data = dbResult;
            break;
        }
      } catch (error) {
        console.error(`Failed to execute step ${step.type}:`, error);
        return {
          success: false,
          message: `Failed at step: ${step.description}`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: true,
      message: 'Execution completed successfully',
      deploymentUrl,
      resourceIds,
      data,
    };
  }

  /**
   * Execute MCP server call
   */
  private async executeMCPCall(server: string, method: string, params: any[]): Promise<any> {
    // Map server names to MCP methods
    const methodName = `${server}_${method}`;

    if (typeof (this.mcpServers as any)[methodName] === 'function') {
      return await (this.mcpServers as any)[methodName](...params);
    }

    throw new Error(`MCP method ${methodName} not found`);
  }

  /**
   * Execute database query
   */
  private async executeQuery(params: any): Promise<any> {
    const { query, bindings } = params;

    // Use D1 for queries
    const result = await this.env.DB.prepare(query).bind(...(bindings || [])).all();
    return result.results;
  }

  /**
   * Store deployment in D1
   */
  private async storeDeployment(
    workerName: string,
    workerCode: string,
    bindings: ResourceBinding[],
    workerUrl: string
  ): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO deployments (id, worker_name, script_content, bindings, status, worker_url, deployed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      workerName,
      workerCode,
      JSON.stringify(bindings),
      'active',
      workerUrl,
      Math.floor(Date.now() / 1000)
    ).run();
  }

  /**
   * Store conversation in D1
   */
  private async storeConversation(
    userMessage: string,
    agentResponse: string,
    plan?: ExecutionPlan
  ): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO conversations (id, user_message, agent_response, intent, entities, context, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      userMessage,
      agentResponse,
      plan ? this.detectIntent(plan) : null,
      plan ? JSON.stringify(this.extractEntities(plan)) : null,
      plan ? JSON.stringify(plan) : null,
      'master-control-agent'
    ).run();
  }

  /**
   * Detect intent from plan
   */
  private detectIntent(plan: ExecutionPlan): string {
    const stepTypes = plan.steps.map(s => s.type);

    if (stepTypes.includes('deploy_worker')) return 'deploy_worker';
    if (stepTypes.includes('create_resource')) return 'manage_resource';
    if (stepTypes.includes('call_mcp')) return 'external_integration';
    if (stepTypes.includes('query_database')) return 'query_data';

    return 'unknown';
  }

  /**
   * Extract entities from plan
   */
  private extractEntities(plan: ExecutionPlan): any {
    return {
      resources: plan.resources.map(r => ({ type: r.type, name: r.name })),
      mcpServers: plan.mcpServers,
      stepCount: plan.steps.length,
    };
  }

  /**
   * Generate unique worker name
   */
  private generateWorkerName(): string {
    const adjectives = ['quick', 'smart', 'fast', 'bright', 'clever', 'swift', 'agile', 'sharp'];
    const nouns = ['worker', 'agent', 'service', 'handler', 'processor', 'engine'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const id = Math.random().toString(36).substr(2, 6);

    return `${adj}-${noun}-${id}`;
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    const resources = await this.resourceManager.listResources();
    const ragStats = await this.ragService.getStatistics();

    const deployments = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM deployments WHERE status = ?'
    ).bind('active').first();

    const tasks = await this.env.DB.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all();

    return {
      resources: {
        total: resources.length,
        byType: resources.reduce((acc: any, r: any) => {
          acc[r.resource_type] = (acc[r.resource_type] || 0) + 1;
          return acc;
        }, {}),
      },
      rag: ragStats,
      deployments: (deployments as any)?.count || 0,
      tasks: tasks.results || [],
    };
  }
}
