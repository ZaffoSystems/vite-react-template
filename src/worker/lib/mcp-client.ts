import { Env } from '../types/env';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  capabilities?: string[];
  status: 'connected' | 'disconnected' | 'error';
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP (Model Context Protocol) Client
 * Connects to MCP servers and provides tool/resource access to agents
 */
export class MCPClient {
  private servers: Map<string, Client>;
  private serverConfigs: Map<string, MCPServer>;
  private db: D1Database;

  constructor(env: Env) {
    this.servers = new Map();
    this.serverConfigs = new Map();
    this.db = env.DB;
  }

  /**
   * Initialize MCP client and load configured servers
   */
  async initialize(): Promise<void> {
    const servers = await this.db.prepare(
      'SELECT * FROM mcp_servers WHERE status = ?'
    ).bind('active').all();

    for (const server of servers.results) {
      await this.connectServer({
        id: server.id as string,
        name: server.name as string,
        url: server.url as string,
        capabilities: server.capabilities ? JSON.parse(server.capabilities as string) : [],
        status: 'disconnected',
      });
    }
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(config: MCPServer): Promise<boolean> {
    try {
      // For Workers environment, we use HTTP transport instead of stdio
      const client = new Client({
        name: 'mas-control-agent',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      });

      // In Workers, we'd use fetch-based transport
      // This is a simplified implementation
      await this.connectViaHTTP(client, config.url);

      this.servers.set(config.id, client);
      this.serverConfigs.set(config.id, { ...config, status: 'connected' });

      // Update database
      await this.db.prepare(
        'UPDATE mcp_servers SET status = ?, last_connected = ? WHERE id = ?'
      ).bind('connected', Date.now(), config.id).run();

      return true;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      this.serverConfigs.set(config.id, { ...config, status: 'error' });
      return false;
    }
  }

  /**
   * HTTP-based MCP connection for Workers environment
   */
  private async connectViaHTTP(client: Client, url: string): Promise<void> {
    // Implement HTTP-based MCP protocol
    // This would involve setting up request/response handlers
    // For now, this is a placeholder for the actual implementation

    const response = await fetch(`${url}/mcp/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocolVersion: '1.0',
        clientInfo: {
          name: 'mas-control-agent',
          version: '1.0.0',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP initialization failed: ${response.status}`);
    }
  }

  /**
   * List available tools from all connected servers
   */
  async listTools(serverId?: string): Promise<MCPTool[]> {
    const tools: MCPTool[] = [];

    if (serverId) {
      const client = this.servers.get(serverId);
      if (client) {
        const response = await client.listTools();
        tools.push(...response.tools);
      }
    } else {
      // List tools from all servers
      for (const [id, client] of this.servers) {
        try {
          const response = await client.listTools();
          tools.push(...response.tools);
        } catch (error) {
          console.error(`Failed to list tools from server ${id}:`, error);
        }
      }
    }

    return tools;
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = this.servers.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not found or not connected`);
    }

    try {
      const response = await client.callTool({
        name: toolName,
        arguments: args,
      });

      return response.content;
    } catch (error: any) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * List available resources from servers
   */
  async listResources(serverId?: string): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    if (serverId) {
      const client = this.servers.get(serverId);
      if (client) {
        const response = await client.listResources();
        resources.push(...response.resources);
      }
    } else {
      for (const [id, client] of this.servers) {
        try {
          const response = await client.listResources();
          resources.push(...response.resources);
        } catch (error) {
          console.error(`Failed to list resources from server ${id}:`, error);
        }
      }
    }

    return resources;
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const client = this.servers.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not found or not connected`);
    }

    try {
      const response = await client.readResource({ uri });
      return response.contents;
    } catch (error: any) {
      throw new Error(`Resource read failed: ${error.message}`);
    }
  }

  /**
   * List available prompts from servers
   */
  async listPrompts(serverId?: string): Promise<any[]> {
    const prompts: any[] = [];

    if (serverId) {
      const client = this.servers.get(serverId);
      if (client) {
        const response = await client.listPrompts();
        prompts.push(...response.prompts);
      }
    } else {
      for (const [id, client] of this.servers) {
        try {
          const response = await client.listPrompts();
          prompts.push(...response.prompts);
        } catch (error) {
          console.error(`Failed to list prompts from server ${id}:`, error);
        }
      }
    }

    return prompts;
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(serverId: string, promptName: string, args?: any): Promise<any> {
    const client = this.servers.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not found or not connected`);
    }

    try {
      const response = await client.getPrompt({
        name: promptName,
        arguments: args,
      });

      return response.messages;
    } catch (error: any) {
      throw new Error(`Prompt retrieval failed: ${error.message}`);
    }
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: {
    name: string;
    url: string;
    authConfig?: any;
  }): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.prepare(
      `INSERT INTO mcp_servers (id, name, url, auth_config, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      config.name,
      config.url,
      config.authConfig ? JSON.stringify(config.authConfig) : null,
      'inactive',
      Date.now()
    ).run();

    const serverConfig: MCPServer = {
      id,
      name: config.name,
      url: config.url,
      status: 'disconnected',
    };

    await this.connectServer(serverConfig);

    return id;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.servers.get(serverId);
    if (client) {
      await client.close();
      this.servers.delete(serverId);
    }

    const config = this.serverConfigs.get(serverId);
    if (config) {
      this.serverConfigs.set(serverId, { ...config, status: 'disconnected' });
    }

    await this.db.prepare(
      'UPDATE mcp_servers SET status = ?, disconnected_at = ? WHERE id = ?'
    ).bind('inactive', Date.now(), serverId).run();
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServer[] {
    return Array.from(this.serverConfigs.values()).filter(s => s.status === 'connected');
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const [id, client] of this.servers) {
      try {
        await client.ping();
        health.set(id, true);
      } catch {
        health.set(id, false);
        const config = this.serverConfigs.get(id);
        if (config) {
          this.serverConfigs.set(id, { ...config, status: 'error' });
        }
      }
    }

    return health;
  }
}
