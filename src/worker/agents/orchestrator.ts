import { Env, AgentConfig, Task, Message } from '../types/env';
import { AIGatewayClient } from '../lib/ai-gateway';
import { CloudflareAPI } from '../lib/cloudflare-api';
import { MCPClient } from '../lib/mcp-client';
import { RAGSystem } from '../lib/rag-system';
import { DockerHubClient } from '../lib/docker-hub';

/**
 * Multi-Agent System Orchestrator
 * Manages and coordinates multiple agent types for complex task execution
 */
export class AgentOrchestrator {
  private env: Env;
  private ai: AIGatewayClient;
  private cfAPI: CloudflareAPI;
  private mcp: MCPClient;
  private rag: RAGSystem;
  private docker: DockerHubClient;
  private agents: Map<string, AgentConfig>;

  constructor(env: Env) {
    this.env = env;
    this.ai = new AIGatewayClient(env);
    this.cfAPI = new CloudflareAPI(env);
    this.mcp = new MCPClient(env);
    this.rag = new RAGSystem(env);
    this.docker = new DockerHubClient(env);
    this.agents = new Map();
  }

  /**
   * Initialize orchestrator and load agents
   */
  async initialize(): Promise<void> {
    await this.mcp.initialize();
    await this.loadAgents();
  }

  /**
   * Load agents from database
   */
  private async loadAgents(): Promise<void> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM agents WHERE status != ?'
    ).bind('deleted').all();

    for (const row of results.results) {
      const config: AgentConfig = {
        id: row.id as string,
        name: row.name as string,
        type: row.type as any,
        capabilities: JSON.parse(row.capabilities as string),
        ...JSON.parse(row.config as string),
      };

      this.agents.set(config.id, config);
    }
  }

  /**
   * Create and register a new agent
   */
  async createAgent(config: Omit<AgentConfig, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullConfig: AgentConfig = { ...config, id };

    // Store in database
    await this.env.DB.prepare(
      `INSERT INTO agents (id, name, type, capabilities, config, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      config.name,
      config.type,
      JSON.stringify(config.capabilities),
      JSON.stringify({ model: config.model, temperature: config.temperature, maxTokens: config.maxTokens }),
      'idle',
      Date.now()
    ).run();

    // Initialize Durable Object state
    const doStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(id));
    await doStub.fetch(new Request('https://dummy/initialize', {
      method: 'POST',
      body: JSON.stringify({ config: fullConfig }),
    }));

    this.agents.set(id, fullConfig);

    return id;
  }

  /**
   * Execute a task with the appropriate agent
   */
  async executeTask(task: Task): Promise<any> {
    const agent = task.agentId ? this.agents.get(task.agentId) : this.selectAgent(task);

    if (!agent) {
      throw new Error('No suitable agent found for task');
    }

    // Update task status
    await this.updateTask(task.id, { status: 'processing', startedAt: Date.now() });

    try {
      let result: any;

      switch (agent.type) {
        case 'utility':
          result = await this.executeUtilityTask(agent, task);
          break;
        case 'learning':
          result = await this.executeLearningTask(agent, task);
          break;
        case 'dynamic':
          result = await this.executeDynamicTask(agent, task);
          break;
        case 'react':
          result = await this.executeReactTask(agent, task);
          break;
        case 'infrastructure':
          result = await this.executeInfrastructureTask(agent, task);
          break;
        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      // Update task as completed
      await this.updateTask(task.id, {
        status: 'completed',
        completedAt: Date.now(),
        result: JSON.stringify(result),
      });

      // Update agent state
      await this.updateAgentState(agent.id, task);

      return result;
    } catch (error: any) {
      await this.updateTask(task.id, {
        status: 'failed',
        error: error.message,
        completedAt: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Utility Agent - General purpose tasks
   */
  private async executeUtilityTask(agent: AgentConfig, task: Task): Promise<any> {
    const messages: Message[] = [
      {
        role: 'system',
        content: agent.systemPrompt || 'You are a utility agent that performs general purpose tasks efficiently.',
      },
      {
        role: 'user',
        content: JSON.stringify(task.payload),
      },
    ];

    const response = await this.ai.runWithBinding(
      agent.model || '@cf/meta/llama-3.1-8b-instruct-fast',
      messages,
      {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
      }
    );

    if (!response.success) {
      throw new Error(`Utility task failed: ${response.error}`);
    }

    return response.result;
  }

  /**
   * Learning Agent - Learns from feedback and improves over time
   */
  private async executeLearningTask(agent: AgentConfig, task: Task): Promise<any> {
    // Retrieve past logs for learning
    const logs = await this.ai.getLogs({ limit: 50 });

    // Get agent memory
    const doStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agent.id));
    const memoryResp = await doStub.fetch(new Request('https://dummy/memory'));
    const memory = await memoryResp.json();

    const messages: Message[] = [
      {
        role: 'system',
        content: agent.systemPrompt || `You are a learning agent. You improve based on past experiences.

Past Performance Summary:
${JSON.stringify(memory.memory?.slice(-10) || [], null, 2)}`,
      },
      {
        role: 'user',
        content: JSON.stringify(task.payload),
      },
    ];

    const response = await this.ai.runWithBinding(
      agent.model || '@cf/meta/llama-3.1-8b-instruct-fast',
      messages
    );

    if (!response.success) {
      throw new Error(`Learning task failed: ${response.error}`);
    }

    // Store experience in memory
    await doStub.fetch(new Request('https://dummy/add-memory', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_execution',
        content: {
          task: task.type,
          result: response.result,
          logId: response.logId,
        },
      }),
    }));

    return response.result;
  }

  /**
   * Dynamic Agent - Adapts model selection based on task requirements
   */
  private async executeDynamicTask(agent: AgentConfig, task: Task): Promise<any> {
    // Analyze task complexity
    const complexity = this.analyzeTaskComplexity(task);

    // Select appropriate model based on complexity
    let model: string;
    if (complexity === 'high') {
      model = '@cf/meta/llama-3.1-8b-instruct';
    } else {
      model = '@cf/meta/llama-3.1-8b-instruct-fast';
    }

    // Use dynamic routing
    const response = await this.ai.runWithDynamicRoute(
      {
        name: `dynamic-${complexity}`,
        model,
        fallbackModel: '@cf/meta/llama-3-8b-instruct',
        rateLimit: {
          requestsPerMinute: 100,
          fallbackOnLimit: true,
        },
      },
      [
        {
          role: 'system',
          content: agent.systemPrompt || 'You are a dynamic agent that adapts to task requirements.',
        },
        {
          role: 'user',
          content: JSON.stringify(task.payload),
        },
      ],
      { taskComplexity: complexity }
    );

    if (!response.success) {
      throw new Error(`Dynamic task failed: ${response.error}`);
    }

    return response.result;
  }

  /**
   * React Agent - Reasons and acts in iterative loops
   */
  private async executeReactTask(agent: AgentConfig, task: Task): Promise<any> {
    const maxIterations = 5;
    let iteration = 0;
    const thoughtProcess: any[] = [];

    let currentThought = `Task: ${JSON.stringify(task.payload)}`;

    while (iteration < maxIterations) {
      // Thought phase
      const thinkResponse = await this.ai.runWithBinding(
        agent.model || '@cf/meta/llama-3.1-8b-instruct-fast',
        [
          {
            role: 'system',
            content: `You are a ReAct agent. Think step by step about what action to take next.

Previous thoughts:
${thoughtProcess.map(t => `Thought ${t.iteration}: ${t.thought}\nAction: ${t.action}\nObservation: ${t.observation}`).join('\n\n')}`,
          },
          {
            role: 'user',
            content: currentThought,
          },
        ]
      );

      if (!thinkResponse.success) {
        throw new Error('React agent thought phase failed');
      }

      const thought = thinkResponse.result.response || '';

      // Determine action
      const action = await this.determineAction(agent, thought, task);

      // Execute action
      const observation = await this.executeAction(agent, action);

      thoughtProcess.push({
        iteration: iteration + 1,
        thought,
        action,
        observation,
      });

      // Check if task is complete
      if (this.isTaskComplete(observation, task)) {
        break;
      }

      currentThought = `Based on observation: ${observation}, what should I do next?`;
      iteration++;
    }

    return {
      thoughtProcess,
      finalResult: thoughtProcess[thoughtProcess.length - 1]?.observation,
    };
  }

  /**
   * Infrastructure Agent - Manages CF resources
   */
  private async executeInfrastructureTask(agent: AgentConfig, task: Task): Promise<any> {
    const { action, params } = task.payload;

    switch (action) {
      case 'list_workers':
        return await this.cfAPI.listWorkers();

      case 'deploy_worker':
        return await this.cfAPI.deployWorker(params.name, params.script, params.bindings);

      case 'list_kv':
        return await this.cfAPI.listKVNamespaces();

      case 'list_d1':
        return await this.cfAPI.listD1Databases();

      case 'list_r2':
        return await this.cfAPI.listR2Buckets();

      case 'list_queues':
        return await this.cfAPI.listQueues();

      case 'get_analytics':
        return await this.cfAPI.getAccountAnalytics();

      case 'create_kv':
        return await this.cfAPI.createKVNamespace(params.name);

      case 'create_d1':
        return await this.cfAPI.createD1Database(params.name);

      case 'create_r2':
        return await this.cfAPI.createR2Bucket(params.name);

      case 'query_d1':
        return await this.cfAPI.queryD1(params.databaseId, params.sql, params.params);

      case 'docker_sync':
        await this.docker.watchRepository(
          params.repository,
          this.env.DB,
          async (image) => {
            // Trigger deployment on image update
            if (params.autoDeployWorker) {
              await this.cfAPI.deployWorker(params.autoDeployWorker, '', {});
            }
          }
        );
        return { synced: true };

      case 'rag_ingest':
        return await this.rag.ingestFromR2(params.prefix);

      case 'rag_search':
        return await this.rag.search(params.query, params.options);

      default:
        throw new Error(`Unknown infrastructure action: ${action}`);
    }
  }

  /**
   * Analyze task complexity
   */
  private analyzeTaskComplexity(task: Task): 'low' | 'medium' | 'high' {
    const payloadSize = JSON.stringify(task.payload).length;

    if (payloadSize > 1000) return 'high';
    if (payloadSize > 500) return 'medium';
    return 'low';
  }

  /**
   * Determine action for ReAct agent
   */
  private async determineAction(agent: AgentConfig, thought: string, task: Task): Promise<string> {
    // Extract action from thought (simple implementation)
    if (thought.toLowerCase().includes('search')) {
      return 'search';
    } else if (thought.toLowerCase().includes('query')) {
      return 'query';
    } else if (thought.toLowerCase().includes('mcp')) {
      return 'mcp_tool';
    }

    return 'complete';
  }

  /**
   * Execute action for ReAct agent
   */
  private async executeAction(agent: AgentConfig, action: string): Promise<string> {
    switch (action) {
      case 'search':
        const results = await this.rag.search('relevant query', { topK: 3 });
        return `Found ${results.length} results`;

      case 'query':
        return 'Query executed successfully';

      case 'mcp_tool':
        const tools = await this.mcp.listTools();
        return `Available MCP tools: ${tools.map(t => t.name).join(', ')}`;

      case 'complete':
        return 'Task completed';

      default:
        return 'Unknown action';
    }
  }

  /**
   * Check if task is complete
   */
  private isTaskComplete(observation: string, task: Task): boolean {
    return observation.toLowerCase().includes('complete') || observation.toLowerCase().includes('done');
  }

  /**
   * Select best agent for a task
   */
  private selectAgent(task: Task): AgentConfig | undefined {
    for (const agent of this.agents.values()) {
      if ((agent as any).status === 'idle' && this.canAgentHandleTask(agent, task)) {
        return agent;
      }
    }

    return Array.from(this.agents.values())[0];
  }

  /**
   * Check if agent can handle task
   */
  private canAgentHandleTask(agent: AgentConfig, task: Task): boolean {
    if (task.type.includes('infrastructure') && agent.capabilities.canManageInfrastructure) {
      return true;
    }

    if (task.type.includes('rag') && agent.capabilities.canQueryRAG) {
      return true;
    }

    return true; // Default to true for utility agents
  }

  /**
   * Update task in database
   */
  private async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }

    if (updates.startedAt) {
      setClauses.push('started_at = ?');
      values.push(updates.startedAt);
    }

    if (updates.completedAt) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    if (updates.result) {
      setClauses.push('result = ?');
      values.push(updates.result);
    }

    if (updates.error) {
      setClauses.push('error = ?');
      values.push(updates.error);
    }

    values.push(taskId);

    await this.env.DB.prepare(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  /**
   * Update agent state after task execution
   */
  private async updateAgentState(agentId: string, task: Task): Promise<void> {
    const doStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));

    await doStub.fetch(new Request('https://dummy/add-task', {
      method: 'POST',
      body: JSON.stringify(task),
    }));

    await doStub.fetch(new Request('https://dummy/heartbeat', {
      method: 'POST',
    }));
  }

  /**
   * Dispatch task to queue
   */
  async dispatchTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullTask: Task = {
      ...task,
      id,
      createdAt: Date.now(),
    };

    // Store in database
    await this.env.DB.prepare(
      `INSERT INTO tasks (id, type, agent_id, payload, status, priority, retry_count, max_retries, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      task.type,
      task.agentId || null,
      JSON.stringify(task.payload),
      task.status,
      task.priority,
      task.retryCount,
      task.maxRetries,
      fullTask.createdAt
    ).run();

    // Send to queue for async processing
    await this.env.TASK_QUEUE.send(fullTask);

    return id;
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<any> {
    const doStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));
    const response = await doStub.fetch(new Request('https://dummy/state'));
    return response.json();
  }

  /**
   * List all agents
   */
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }
}
