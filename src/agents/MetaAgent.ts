// MetaAgent - Master coordinator with natural language interface
import { DurableObject } from 'cloudflare:workers';
import type { Env, AgentConfig, McpTool } from '../types';

interface MetaAgentState {
  createdAgents: AgentConfig[];
  activeConversations: Map<string, any>;
  availableMcpTools: Map<string, McpTool[]>;
}

export class MetaAgent extends DurableObject<Env> {
  private state: MetaAgentState = {
    createdAgents: [],
    activeConversations: new Map(),
    availableMcpTools: new Map(),
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<MetaAgentState>('state');
      if (stored) {
        this.state = {
          ...stored,
          activeConversations: new Map(stored.activeConversations),
          availableMcpTools: new Map(stored.availableMcpTools),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/initialize':
        return this.initializeMcpServers();
      case '/create-agent':
        return this.handleAgentCreation(request);
      case '/chat':
        return this.handleChat(request);
      case '/list-mcp-tools':
        return this.listAllMcpTools();
      case '/list-agents':
        return this.listAgents();
      default:
        return new Response('Meta Agent Ready', { status: 200 });
    }
  }

  // Initialize all 25+ MCP servers
  private async initializeMcpServers(): Promise<Response> {
    console.log('🔌 Initializing all MCP servers...');
    
    const mcpServers = [
      // Cloudflare MCP Servers (15)
      { name: 'docs', binding: this.env.MCP_DOCS },
      { name: 'bindings', binding: this.env.MCP_BINDINGS },
      { name: 'builds', binding: this.env.MCP_BUILDS },
      { name: 'observability', binding: this.env.MCP_OBSERVABILITY },
      { name: 'radar', binding: this.env.MCP_RADAR },
      { name: 'container', binding: this.env.MCP_CONTAINER },
      { name: 'browser', binding: this.env.MCP_BROWSER },
      { name: 'logpush', binding: this.env.MCP_LOGPUSH },
      { name: 'ai-gateway', binding: this.env.MCP_AI_GATEWAY },
      { name: 'ai-search', binding: this.env.MCP_AI_SEARCH },
      { name: 'audit-logs', binding: this.env.MCP_AUDIT_LOGS },
      { name: 'dns-analytics', binding: this.env.MCP_DNS_ANALYTICS },
      { name: 'dex', binding: this.env.MCP_DEX },
      { name: 'casb', binding: this.env.MCP_CASB },
      { name: 'graphql', binding: this.env.MCP_GRAPHQL },
      // External MCP Servers
      { name: 'context7', binding: this.env.MCP_CONTEXT7 },
      { name: 'e2b', binding: this.env.MCP_E2B },
      { name: 'firecrawl', binding: this.env.MCP_FIRECRAWL },
      { name: 'brave-search', binding: this.env.MCP_BRAVE_SEARCH },
      { name: 'sequential-thinking', binding: this.env.MCP_SEQUENTIAL_THINKING },
      { name: 'filesystem', binding: this.env.MCP_FILESYSTEM },
    ];

    const connections = new Map<string, McpTool[]>();
    let connectedCount = 0;
    let totalTools = 0;

    for (const server of mcpServers) {
      try {
        const tools = await server.binding.listTools();
        connections.set(server.name, tools);
        connectedCount++;
        totalTools += tools.length;
        console.log(`✅ ${server.name}: ${tools.length} tools`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${server.name}:`, error);
        connections.set(server.name, []);
      }
    }

    this.state.availableMcpTools = connections;
    await this.saveState();

    return new Response(JSON.stringify({
      status: 'initialized',
      connected: connectedCount,
      total: mcpServers.length,
      totalTools,
      servers: Object.fromEntries(connections),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Natural language agent creation
  private async handleAgentCreation(request: Request): Promise<Response> {
    const { description, mcpServers } = await request.json<{ description: string; mcpServers?: string[] }>();
    
    console.log('🤖 Creating agent from description:', description);
    
    // Use AI to parse natural language into agent specification
    const agentSpec = await this.parseAgentDescription(description, mcpServers);
    
    const agentId = crypto.randomUUID();
    agentSpec.id = agentId;
    
    // Store in D1 database
    await this.env.DB.prepare(
      'INSERT INTO agents (id, name, role, capabilities, config, mcp_servers) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        agentId,
        agentSpec.name,
        agentSpec.role,
        JSON.stringify(agentSpec.capabilities),
        JSON.stringify(agentSpec),
        JSON.stringify(agentSpec.mcpServers)
      )
      .run();
    
    // Update state
    this.state.createdAgents.push(agentSpec);
    await this.saveState();
    
    // Deploy via BuilderAgent
    const builderId = this.env.BUILDER_AGENT.idFromName('main');
    const builderStub = this.env.BUILDER_AGENT.get(builderId);
    await builderStub.fetch(new Request('https://fake-host/deploy', {
      method: 'POST',
      body: JSON.stringify({ action: 'deploy', agentId, config: agentSpec }),
    }));
    
    console.log('✅ Agent created and deployed:', agentId);
    
    return new Response(JSON.stringify({ 
      success: true,
      agentId, 
      spec: agentSpec 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // AI-powered natural language parsing to agent configuration
  private async parseAgentDescription(description: string, requestedMcpServers?: string[]): Promise<AgentConfig> {
    const availableServers = Array.from(this.state.availableMcpTools.keys());
    const availableTools: string[] = [];
    
    for (const [serverName, tools] of this.state.availableMcpTools.entries()) {
      availableTools.push(...tools.map(t => `${serverName}:${t.name}`));
    }

    const systemPrompt = `You are an AI agent specification parser. Convert natural language descriptions into structured agent configurations.

Available MCP Servers: ${availableServers.join(', ')}

Available Tools (sample):
${availableTools.slice(0, 50).join('\n')}

Output ONLY valid JSON in this exact format:
{
  "name": "string",
  "role": "string",
  "goal": "string",
  "capabilities": ["capability1", "capability2"],
  "tools": ["tool1", "tool2"],
  "mcpServers": ["server1", "server2"],
  "backstory": "string"
}

Choose relevant MCP servers based on the description. Be specific about capabilities.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description },
      ],
      stream: false,
    });
    
    let parsed: any;
    try {
      parsed = JSON.parse(response.response);
    } catch {
      // Fallback if AI doesn't return valid JSON
      parsed = {
        name: 'Custom Agent',
        role: 'General Purpose',
        goal: description,
        capabilities: ['task-execution'],
        tools: [],
        mcpServers: requestedMcpServers || [],
        backstory: 'AI agent created from natural language'
      };
    }
    
    // Override with user-requested MCP servers if provided
    if (requestedMcpServers && requestedMcpServers.length > 0) {
      parsed.mcpServers = requestedMcpServers;
    }
    
    return parsed as AgentConfig;
  }

  // Natural language chat interface
  private async handleChat(request: Request): Promise<Response> {
    const { message, sessionId } = await request.json<{ message: string; sessionId: string }>();
    
    console.log('💬 Chat message:', message);
    
    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(message);
    
    // Store in Vectorize for memory
    await this.env.VECTORIZE.insert([{
      id: crypto.randomUUID(),
      values: embedding,
      metadata: {
        message,
        sessionId,
        timestamp: Date.now(),
        role: 'user',
      },
    }]);
    
    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO conversations (id, session_id, message, role) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), sessionId, message, 'user').run();
    
    // Retrieve relevant context from Vectorize
    const context = await this.retrieveContext(embedding, sessionId);
    
    // Classify intent
    const intent = await this.classifyIntent(message);
    
    let response: string;
    
    if (intent === 'create_agent') {
      response = `I understand you want to create an agent. Let me help you with that. Could you describe what you'd like the agent to do? For example: "Create a security monitoring agent that uses audit logs and CASB to detect threats"`;
    } else if (intent === 'execute_task') {
      response = await this.delegateTaskToAgent(message, context);
    } else if (intent === 'list_agents') {
      const agents = this.state.createdAgents;
      response = `I currently manage ${agents.length} agents:\n${agents.map(a => `- ${a.name} (${a.role})`).join('\n')}`;
    } else if (intent === 'list_capabilities') {
      const servers = Array.from(this.state.availableMcpTools.keys());
      response = `I have access to ${servers.length} MCP servers with hundreds of capabilities including:\n${servers.slice(0, 10).join(', ')}...`;
    } else {
      response = await this.generateResponse(message, context);
    }
    
    // Store assistant response
    const responseEmbedding = await this.generateEmbedding(response);
    await this.env.VECTORIZE.insert([{
      id: crypto.randomUUID(),
      values: responseEmbedding,
      metadata: {
        message: response,
        sessionId,
        timestamp: Date.now(),
        role: 'assistant',
      },
    }]);
    
    await this.env.DB.prepare(
      'INSERT INTO conversations (id, session_id, message, role) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), sessionId, response, 'assistant').run();
    
    return new Response(JSON.stringify({ 
      response, 
      intent,
      context: context.slice(0, 3) // Return top 3 context items
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate embeddings using Workers AI
  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [text],
    });
    return result.data[0];
  }

  // Retrieve relevant context from Vectorize
  private async retrieveContext(embedding: number[], sessionId: string): Promise<string[]> {
    try {
      const results = await this.env.VECTORIZE.query(embedding, {
        topK: 5,
        filter: { sessionId },
      });
      
      return results.matches.map((m: any) => m.metadata.message as string);
    } catch (error) {
      console.error('Error retrieving context:', error);
      return [];
    }
  }

  // Classify user intent using AI
  private async classifyIntent(message: string): Promise<string> {
    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'system',
        content: 'Classify the user intent into one of: create_agent, execute_task, list_agents, list_capabilities, query_info, general_chat. Respond with ONLY the intent name, nothing else.'
      }, {
        role: 'user',
        content: message
      }],
      stream: false,
    });
    
    return response.response.trim().toLowerCase().replace(/[^a-z_]/g, '');
  }

  // Delegate task to appropriate agent
  private async delegateTaskToAgent(task: string, context: string[]): Promise<string> {
    const agents = this.state.createdAgents;
    
    if (agents.length === 0) {
      return 'No agents are currently available. Would you like me to create one?';
    }
    
    // Find best agent for the task (simplified - in production, use AI to match)
    const agent = agents[0];
    
    try {
      const executorId = this.env.EXECUTOR_AGENT.idFromName(agent.id);
      const stub = this.env.EXECUTOR_AGENT.get(executorId);
      
      const response = await stub.fetch(new Request('https://fake-host/execute', {
        method: 'POST',
        body: JSON.stringify({ input: task, context }),
      }));
      
      const result = await response.json<any>();
      return result.output || 'Task completed successfully.';
    } catch (error) {
      return `Error executing task: ${error}`;
    }
  }

  // Generate AI response
  private async generateResponse(message: string, context: string[]): Promise<string> {
    const contextStr = context.length > 0 
      ? `Previous context:\n${context.join('\n')}\n\n`
      : '';
    
    const serverList = Array.from(this.state.availableMcpTools.keys()).join(', ');
    
    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'system',
        content: `You are the Meta Agent, a master coordinator of a multi-agent system. You have access to ${this.state.availableMcpTools.size} MCP servers: ${serverList}. You can create agents, delegate tasks, and coordinate complex workflows. Be helpful, concise, and action-oriented.`
      }, {
        role: 'user',
        content: `${contextStr}User: ${message}`
      }],
      stream: false,
    });
    
    return response.response;
  }

  // List all available MCP tools
  private async listAllMcpTools(): Promise<Response> {
    const tools: Record<string, any> = {};
    
    for (const [serverName, serverTools] of this.state.availableMcpTools.entries()) {
      tools[serverName] = {
        count: serverTools.length,
        tools: serverTools.map(t => ({
          name: t.name,
          description: t.description,
        })),
      };
    }
    
    return new Response(JSON.stringify({
      serverCount: this.state.availableMcpTools.size,
      totalTools: Array.from(this.state.availableMcpTools.values())
        .reduce((sum, tools) => sum + tools.length, 0),
      tools,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // List all created agents
  private async listAgents(): Promise<Response> {
    return new Response(JSON.stringify({
      count: this.state.createdAgents.length,
      agents: this.state.createdAgents,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Save state to Durable Object storage
  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', {
      ...this.state,
      activeConversations: Array.from(this.state.activeConversations.entries()),
      availableMcpTools: Array.from(this.state.availableMcpTools.entries()),
    });
  }
}