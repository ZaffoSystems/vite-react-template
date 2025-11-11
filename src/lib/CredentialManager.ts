// src/lib/CredentialManager.ts
// Utility for agents to retrieve and use credentials from CREDENTIALS_KV

import { Env } from '../types';

export class CredentialManager {
  constructor(private env: Env) {}

  /**
   * Retrieve a credential value by label
   * Used by MetaAgent and other agents to access stored credentials
   */
  async getCredential(label: string): Promise<string | null> {
    return await this.env.CREDENTIALS_KV.get(`cred:${label}`);
  }

  /**
   * Retrieve multiple credentials at once
   * Returns a map of label -> value
   */
  async getCredentials(labels: string[]): Promise<Record<string, string>> {
    const credentials: Record<string, string> = {};
    
    await Promise.all(
      labels.map(async (label) => {
        const value = await this.getCredential(label);
        if (value) {
          credentials[label] = value;
        }
      })
    );
    
    return credentials;
  }

  /**
   * Track that an agent is using a credential
   * Updates the metadata to record which agents use which credentials
   */
  async trackUsage(label: string, agentId: string): Promise<void> {
    const metadataStr = await this.env.CREDENTIALS_KV.get(`meta:${label}`);
    if (!metadataStr) return;
    
    const metadata = JSON.parse(metadataStr);
    if (!metadata.usedBy) {
      metadata.usedBy = [];
    }
    
    if (!metadata.usedBy.includes(agentId)) {
      metadata.usedBy.push(agentId);
      metadata.updatedAt = new Date().toISOString();
      await this.env.CREDENTIALS_KV.put(`meta:${label}`, JSON.stringify(metadata));
    }
  }

  /**
   * Get credentials needed for a specific MCP server
   * Maps MCP server names to their required credential labels
   */
  async getCredentialsForMCPServer(mcpServer: string): Promise<Record<string, string>> {
    // Define which credentials each MCP server needs
    const mcpCredentialMap: Record<string, string[]> = {
      'e2b': ['E2B_API_KEY'],
      'e2b-sandbox': ['E2B_API_KEY'],
      'firecrawl': ['FIRECRAWL_API_KEY'],
      'brave-search': ['BRAVE_API_KEY'],
      'github': ['GITHUB_TOKEN', 'GITHUB_API_KEY'],
      'docker': ['DOCKER_HOST'],
      'ssh': ['SSH_HOST', 'SSH_USER', 'SSH_PASSWORD', 'SSH_KEY'],
    };
    
    const requiredLabels = mcpCredentialMap[mcpServer] || [];
    return await this.getCredentials(requiredLabels);
  }

  /**
   * Check if all required credentials exist for a list of MCP servers
   * Returns missing credentials if any
   */
  async checkRequiredCredentials(mcpServers: string[]): Promise<{
    allPresent: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];
    
    for (const server of mcpServers) {
      const creds = await this.getCredentialsForMCPServer(server);
      const required = this.getRequiredCredentialLabels(server);
      
      for (const label of required) {
        if (!creds[label]) {
          missing.push(`${server}:${label}`);
        }
      }
    }
    
    return {
      allPresent: missing.length === 0,
      missing
    };
  }

  /**
   * Get the list of credential labels required for an MCP server
   */
  private getRequiredCredentialLabels(mcpServer: string): string[] {
    const mcpCredentialMap: Record<string, string[]> = {
      'e2b': ['E2B_API_KEY'],
      'e2b-sandbox': ['E2B_API_KEY'],
      'firecrawl': ['FIRECRAWL_API_KEY'],
      'brave-search': ['BRAVE_API_KEY'],
      'github': ['GITHUB_TOKEN'],
      'docker': ['DOCKER_HOST'],
      'ssh': ['SSH_HOST', 'SSH_USER'],
    };
    
    return mcpCredentialMap[mcpServer] || [];
  }
}
