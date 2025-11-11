// ExtensibilityEngine - Allows agents to dynamically add new capabilities
import type { Env, AgentConfig } from '../types';
import { PluginManager, type Plugin } from './PluginManager';

export class ExtensibilityEngine {
  private pluginManager: PluginManager;
  private customAgentTypes: Map<string, any> = new Map();
  private customMcpServers: Map<string, string> = new Map();

  constructor(env: Env) {
    this.pluginManager = new PluginManager(env);
  }

  // Register custom agent type
  registerAgentType(name: string, definition: any): void {
    console.log(`🤖 [EXTENSIBILITY] Registering custom agent type: ${name}`);
    this.customAgentTypes.set(name, definition);
  }

  // Register custom MCP server
  registerMcpServer(name: string, serverUrl: string): void {
    console.log(`🔌 [EXTENSIBILITY] Registering custom MCP server: ${name}`);
    this.customMcpServers.set(name, serverUrl);
  }

  // Register plugin
  async registerPlugin(plugin: Plugin): Promise<void> {
    await this.pluginManager.registerPlugin(plugin);
  }

  // Check if capability exists
  hasCapability(capability: string): boolean {
    return this.pluginManager.hasCapability(capability);
  }

  // Execute capability
  async executeCapability(capability: string, params: any): Promise<any> {
    const plugins = this.pluginManager.findByCapability(capability);
    
    if (plugins.length === 0) {
      throw new Error(`No plugin found with capability: ${capability}`);
    }

    // Use first available plugin
    return plugins[0].execute(capability, params, (this.pluginManager as any).env);
  }

  // Get all available capabilities
  listCapabilities(): string[] {
    const plugins = this.pluginManager.listPlugins();
    const capabilities = new Set<string>();
    
    for (const plugin of plugins) {
      plugin.capabilities.forEach(cap => capabilities.add(cap));
    }
    
    return Array.from(capabilities);
  }

  // Generate agent config with available capabilities
  enhanceAgentConfig(config: AgentConfig): AgentConfig {
    const availableCapabilities = this.listCapabilities();
    
    return {
      ...config,
      capabilities: [
        ...config.capabilities,
        ...availableCapabilities.slice(0, 5), // Add top 5 relevant capabilities
      ],
    };
  }

  // Get system extensibility info
  getInfo(): any {
    return {
      plugins: this.pluginManager.listPlugins(),
      customAgentTypes: Array.from(this.customAgentTypes.keys()),
      customMcpServers: Array.from(this.customMcpServers.entries()),
      totalCapabilities: this.listCapabilities().length,
    };
  }
}
