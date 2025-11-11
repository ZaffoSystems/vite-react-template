// ExecutorAgent - Executes tasks using MCP tools and AI
import { DurableObject } from 'cloudflare:workers';
import type { Env, AgentConfig, Task } from '../types';

interface ExecutorState {
  config: AgentConfig | null;
  taskHistory: Task[];
  mcpConnections: Map<string, any>;
}

export class ExecutorAgent extends DurableObject<Env> {
  private state: ExecutorState = {
    config: null,
    taskHistory: [],
    mcpConnections: new Map(),
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<any>('state');
      if (stored) {
        this.state = {
          ...stored,
          mcpConnections: new Map(stored.mcpConnections || []),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/initialize':
        return this.initialize(request);
      case '/execute':
        return this.executeTask(request);
      case '/call-mcp-tool':
        return this.callMcpTool(request);
      case '/history':
        return this.getHistory();
      default:
        return new Response('Executor Agent Ready');
    }
  }

  private async initialize(request: Request): Promise<Response> {
    const config: AgentConfig = await request.json();
    this.state.config = config;
    
    console.log(`🔧 Initializing Executor Agent: ${config.name}`);
    
    // Initialize MCP connections
    for (const mcpServerName of config.mcpServers) {
      await this.initializeMcpConnection(mcpServerName);
    }
    
    await this.saveState();
    return new Response(JSON.stringify({ status: 'initialized', config }));
  }

  private async initializeMcpConnection(serverName: string): Promise<void> {
    const mcpBindings: Record<string, any> = {
      'docs': this.env.MCP_DOCS,
      'bindings': this.env.MCP_BINDINGS,
      'builds': this.env.MCP_BUILDS,
      'observability': this.env.MCP_OBSERVABILITY,
      'radar': this.env.MCP_RADAR,
      'container': this.env.MCP_CONTAINER,
      'browser': this.env.MCP_BROWSER,
      'logpush': this.env.MCP_LOGPUSH,
      'ai-gateway': this.env.MCP_AI_GATEWAY,
      'ai-search': this.env.MCP_AI_SEARCH,
      'audit-logs': this.env.MCP_AUDIT_LOGS,
      'dns-analytics': this.env.MCP_DNS_ANALYTICS,
      'dex': this.env.MCP_DEX,
      'casb': this.env.MCP_CASB,
      'graphql': this.env.MCP_GRAPHQL,
      'context7': this.env.MCP_CONTEXT7,
      'e2b': this.env.MCP_E2B,
      'firecrawl': this.env.MCP_FIRECRAWL,
      'brave-search': this.env.MCP_BRAVE_SEARCH,
      'sequential-thinking': this.env.MCP_SEQUENTIAL_THINKING,
      'filesystem': this.env.MCP_FILESYSTEM,
    };
    
    const connection = mcpBindings[serverName];
    if (connection) {
      this.state.mcpConnections.set(serverName, connection);
      console.log(`✅ Connected to MCP server: ${serverName}`);
    }
  }

  private async executeTask(request: Request): Promise<Response> {
    const { input, context } = await request.json<{ input: string; context?: string[] }>();
    
    if (!this.state.config) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    const startTime = Date.now();
    const taskId = crypto.randomUUID();
    
    console.log(`▶️ Executing task for ${this.state.config.name}: ${input}`);
    
    const task: Task = {
      id: taskId,
      input,
      output: '',
      status: 'running',
      mcpToolsUsed: [],
      timestamp: new Date().toISOString(),
    };
    
    try {
      // Determine if MCP tools are needed
      const mcpToolsNeeded = await this.determineMcpTools(input);
      
      let mcpResults = '';
      
      // Execute MCP tools if needed
      if (mcpToolsNeeded.length > 0) {
        console.log(`🔧 Using MCP tools: ${mcpToolsNeeded.map(t => t.tool).join(', ')}`);
        
        for (const toolCall of mcpToolsNeeded) {
          const result = await this.executeMcpTool(toolCall);
          task.mcpToolsUsed.push(`${toolCall.server}:${toolCall.tool}`);
          mcpResults += `[${toolCall.server}:${toolCall.tool}]\n${result}\n\n`;
        }
      }
      
      // Use AI to generate final response
      const systemPrompt = `You are ${this.state.config.name}, a ${this.state.config.role}.
Your goal: ${this.state.config.goal}
Backstory: ${this.state.config.backstory}

You have access to these MCP servers: ${Array.from(this.state.mcpConnections.keys()).join(', ')}

${mcpResults ? `MCP Tool Results:\n${mcpResults}` : ''}
${context && context.length > 0 ? `Context from previous interactions:\n${context.join('\n')}` : ''}`;
      
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        stream: false,
      });
      
      task.output = response.response;
      task.status = 'completed';
      task.executionTimeMs = Date.now() - startTime;
      
      // Store in history
      this.state.taskHistory.push(task);
      await this.saveState();
      
      // Log to D1
      await this.env.DB.prepare(`
        INSERT INTO tasks (id, agent_id, input, output, status, mcp_tools_used, execution_time_ms, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        taskId,
        this.state.config.id,
        input,
        task.output,
        'completed',
        JSON.stringify(task.mcpToolsUsed),
        task.executionTimeMs
      ).run();
      
      console.log(`✅ Task completed in ${task.executionTimeMs}ms`);
      
      return new Response(JSON.stringify(task), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      task.status = 'failed';
      task.output = `Error: ${error.message}`;
      task.executionTimeMs = Date.now() - startTime;
      
      console.error(`❌ Task failed:`, error);
      
      return new Response(JSON.stringify(task), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // AI determines which MCP tools are needed
  private async determineMcpTools(input: string): Promise<Array<{ server: string; tool: string; params: any }>> {
    const availableTools: any[] = [];
    
    for (const [serverName, connection] of this.state.mcpConnections.entries()) {
      try {
        const tools = await connection.listTools();
        availableTools.push(...tools.map((t: any) => ({ 
          server: serverName, 
          name: t.name,
          description: t.description 
        })));
      } catch (error) {
        console.error(`Failed to list tools from ${serverName}:`, error);
      }
    }
    
    if (availableTools.length === 0) {
      return [];
    }
    
    const toolsDescription = availableTools
      .slice(0, 30) // Limit to first 30 tools for token efficiency
      .map(t => `${t.server}:${t.name} - ${t.description}`)
      .join('\n');
    
    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'system',
        content: `Determine which MCP tools are needed for this task. Available tools:\n${toolsDescription}\n\nRespond with JSON array of tools needed, or empty array if none needed. Format: [{"server": "name", "tool": "tool_name", "params": {}}]`
      }, {
        role: 'user',
        content: input
      }],
      stream: false,
    });
    
    try {
      const parsed = JSON.parse(response.response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Execute a specific MCP tool
  private async executeMcpTool(toolCall: { server: string; tool: string; params: any }): Promise<string> {
    const connection = this.state.mcpConnections.get(toolCall.server);
    
    if (!connection) {
      return `Error: MCP server ${toolCall.server} not connected`;
    }
    
    try {
      const result = await connection.call(toolCall.tool, toolCall.params || {});
      return JSON.stringify(result, null, 2);
    } catch (error: any) {
      return `Error calling ${toolCall.server}:${toolCall.tool}: ${error.message}`;
    }
  }

  private async callMcpTool(request: Request): Promise<Response> {
    const { server, tool, params } = await request.json<{ server: string; tool: string; params: any }>();
    
    const result = await this.executeMcpTool({ server, tool, params });
    
    return new Response(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getHistory(): Promise<Response> {
    return new Response(JSON.stringify({
      count: this.state.taskHistory.length,
      tasks: this.state.taskHistory,
      config: this.state.config,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', {
      ...this.state,
      mcpConnections: Array.from(this.state.mcpConnections.entries()),
    });
  }
}