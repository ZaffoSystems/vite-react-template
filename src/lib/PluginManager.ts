// PluginManager - Dynamic MCP server and capability loading system
import type { Env } from '../types';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  mcpServer?: string;
  capabilities: string[];
  initialize: (env: Env) => Promise<void>;
  execute: (action: string, params: any, env: Env) => Promise<any>;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  // Register a new plugin dynamically
  async registerPlugin(plugin: Plugin): Promise<void> {
    console.log(`🔌 [PLUGIN] Registering: ${plugin.name} v${plugin.version}`);
    
    await plugin.initialize(this.env);
    this.plugins.set(plugin.name, plugin);
    
    console.log(`✅ [PLUGIN] ${plugin.name} registered with ${plugin.capabilities.length} capabilities`);
  }

  // Load plugin from NPM package
  async loadFromNpm(packageName: string): Promise<void> {
    console.log(`📦 [PLUGIN] Loading from NPM: ${packageName}`);
    // In production, dynamically import the package
    // For now, this is a placeholder
  }

  // Execute plugin action
  async execute(pluginName: string, action: string, params: any): Promise<any> {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    return plugin.execute(action, params, this.env);
  }

  // Get all registered plugins
  listPlugins(): Array<{ name: string; capabilities: string[] }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
      capabilities: p.capabilities,
    }));
  }

  // Check if capability is available
  hasCapability(capability: string): boolean {
    for (const plugin of this.plugins.values()) {
      if (plugin.capabilities.includes(capability)) {
        return true;
      }
    }
    return false;
  }

  // Find plugins with specific capability
  findByCapability(capability: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(p =>
      p.capabilities.includes(capability)
    );
  }
}

// Example built-in plugins
export const DockerPlugin: Plugin = {
  name: 'docker',
  version: '1.0.0',
  description: 'Docker container management',
  mcpServer: 'MCP_DOCKER',
  capabilities: ['container-list', 'container-start', 'container-stop', 'container-deploy'],
  
  async initialize(env: Env): Promise<void> {
    // Test connection
    try {
      await env.MCP_DOCKER.listTools();
    } catch (error) {
      console.warn('Docker MCP server not available');
    }
  },
  
  async execute(action: string, params: any, env: Env): Promise<any> {
    switch (action) {
      case 'list':
        return env.MCP_DOCKER.call('list_containers', params);
      case 'start':
        return env.MCP_DOCKER.call('start_container', params);
      case 'stop':
        return env.MCP_DOCKER.call('stop_container', params);
      case 'deploy':
        return env.MCP_DOCKER.call('create_container', params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

export const SSHPlugin: Plugin = {
  name: 'ssh',
  version: '1.0.0',
  description: 'SSH remote host management',
  mcpServer: 'MCP_SSH',
  capabilities: ['remote-exec', 'file-transfer', 'host-monitoring'],
  
  async initialize(env: Env): Promise<void> {
    try {
      await env.MCP_SSH.listTools();
    } catch (error) {
      console.warn('SSH MCP server not available');
    }
  },
  
  async execute(action: string, params: any, env: Env): Promise<any> {
    switch (action) {
      case 'exec':
        return env.MCP_SSH.call('exec', params);
      case 'upload':
        return env.MCP_SSH.call('upload_file', params);
      case 'download':
        return env.MCP_SSH.call('download_file', params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

export const WebResearchPlugin: Plugin = {
  name: 'web-research',
  version: '1.0.0',
  description: 'Web research using Brave Search and Firecrawl',
  capabilities: ['web-search', 'web-scrape', 'url-analyze'],
  
  async initialize(env: Env): Promise<void> {
    // Initialize both services
  },
  
  async execute(action: string, params: any, env: Env): Promise<any> {
    switch (action) {
      case 'search':
        return env.MCP_BRAVE_SEARCH.call('brave_web_search', params);
      case 'scrape':
        return env.MCP_FIRECRAWL.call('scrape_url', params);
      case 'browser':
        return env.MCP_BROWSER.call('fetch_page', params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

export const CodeExecutionPlugin: Plugin = {
  name: 'code-execution',
  version: '1.0.0',
  description: 'Secure code execution using E2B sandboxes',
  mcpServer: 'MCP_E2B',
  capabilities: ['python-exec', 'javascript-exec', 'sandbox-create'],
  
  async initialize(env: Env): Promise<void> {
    try {
      await env.MCP_E2B.listTools();
    } catch (error) {
      console.warn('E2B MCP server not available');
    }
  },
  
  async execute(action: string, params: any, env: Env): Promise<any> {
    switch (action) {
      case 'execute':
        return env.MCP_E2B.call('execute_code', params);
      case 'create_sandbox':
        return env.MCP_E2B.call('create_sandbox', params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};
