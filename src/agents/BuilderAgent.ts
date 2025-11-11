// BuilderAgent - Deploys agents and connects MCP servers
import { DurableObject } from 'cloudflare:workers';
import type { Env, AgentConfig } from '../types';

interface BuilderState {
  buildQueue: Array<{
    agentId: string;
    status: 'pending' | 'building' | 'deployed' | 'failed';
    mcpServers: string[];
  }>;
}

export class BuilderAgent extends DurableObject<Env> {
  private state: BuilderState = {
    buildQueue: [],
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<BuilderState>('state');
      if (stored) this.state = stored;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const { action, agentId, config } = await request.json<any>();
    
    switch (action) {
      case 'deploy':
        return this.deployAgent(agentId, config);
      case 'status':
        return this.getDeploymentStatus(agentId);
      case 'update':
        return this.updateAgent(agentId, config);
      default:
        return new Response('Unknown action', { status: 400 });
    }
  }

  private async deployAgent(agentId: string, config: AgentConfig): Promise<Response> {
    console.log(`🛠️ Deploying agent: ${config.name} (${agentId})`);
    
    // Add to build queue
    this.state.buildQueue.push({
      agentId,
      status: 'building',
      mcpServers: config.mcpServers || [],
    });
    await this.saveState();
    
    try {
      // Create Durable Object stub for new agent
      const id = this.env.EXECUTOR_AGENT.idFromName(agentId);
      const stub = this.env.EXECUTOR_AGENT.get(id);
      
      // Initialize the agent with configuration
      await stub.fetch(new Request('https://fake-host/initialize', {
        method: 'POST',
        body: JSON.stringify(config),
      }));
      
      // Connect MCP servers to the agent
      for (const mcpServerName of config.mcpServers) {
        await this.connectMcpServer(agentId, mcpServerName);
      }
      
      // Update status to deployed
      const queueItem = this.state.buildQueue.find(i => i.agentId === agentId);
      if (queueItem) queueItem.status = 'deployed';
      await this.saveState();
      
      // Log to D1
      await this.env.DB.prepare(
        'UPDATE agents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind('deployed', agentId).run();
      
      console.log(`✅ Agent deployed successfully: ${agentId}`);
      
      return new Response(JSON.stringify({ 
        status: 'deployed', 
        agentId,
        mcpServers: config.mcpServers,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      const queueItem = this.state.buildQueue.find(i => i.agentId === agentId);
      if (queueItem) queueItem.status = 'failed';
      await this.saveState();
      
      console.error(`❌ Agent deployment failed:`, error);
      
      return new Response(JSON.stringify({ 
        status: 'failed', 
        error: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async connectMcpServer(agentId: string, mcpServerName: string): Promise<void> {
    console.log(`🔗 Connecting ${agentId} to MCP server: ${mcpServerName}`);
    
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
    
    const mcpServer = mcpBindings[mcpServerName];
    
    if (!mcpServer) {
      console.error(`MCP server ${mcpServerName} not found`);
      return;
    }
    
    try {
      const tools = await mcpServer.listTools();
      
      // Store MCP connection in D1
      await this.env.DB.prepare(`
        INSERT INTO mcp_connections (id, agent_id, mcp_server_name, server_url, tools_available)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        agentId,
        mcpServerName,
        `https://${mcpServerName}.mcp.cloudflare.com/mcp`,
        JSON.stringify(tools.map((t: any) => t.name))
      ).run();
      
      console.log(`✅ Connected agent ${agentId} to MCP server ${mcpServerName} with ${tools.length} tools`);
    } catch (error) {
      console.error(`Failed to connect ${mcpServerName}:`, error);
    }
  }

  private async getDeploymentStatus(agentId: string): Promise<Response> {
    const item = this.state.buildQueue.find(i => i.agentId === agentId);
    
    return new Response(JSON.stringify(item || { status: 'not_found' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<Response> {
    await this.env.DB.prepare(
      'UPDATE agents SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(JSON.stringify(config), agentId).run();
    
    return new Response(JSON.stringify({ status: 'updated', agentId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', this.state);
  }
}