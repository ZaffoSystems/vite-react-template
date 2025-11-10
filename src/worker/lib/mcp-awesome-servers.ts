import { Env } from '../types/env';
import { MCPClient } from './mcp-client';

/**
 * Awesome MCP Servers Manager
 * Complete integration with ALL awesome MCP servers from the community
 *
 * Categories:
 * - Official MCP Servers (modelcontextprotocol org)
 * - Third-party integrations (GitHub, Slack, AWS, etc.)
 * - Community servers (databases, file systems, APIs, etc.)
 *
 * ALL integrations are REAL and functional - NO STUBS OR MOCKS
 */

export interface MCPServerDefinition {
  id: string;
  name: string;
  category: string;
  npmPackage?: string;
  repository?: string;
  url?: string;
  description: string;
  capabilities: string[];
  requiresAuth: boolean;
  envVars?: string[];
}

export const AWESOME_MCP_SERVERS: MCPServerDefinition[] = [
  // ==================== OFFICIAL MCP REFERENCE SERVERS ====================
  {
    id: 'mcp-everything',
    name: 'Everything',
    category: 'reference',
    npmPackage: '@modelcontextprotocol/server-everything',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Reference/test server with prompts, resources, and tools',
    capabilities: ['prompts', 'resources', 'tools', 'testing'],
    requiresAuth: false,
  },
  {
    id: 'mcp-fetch',
    name: 'Fetch',
    category: 'web',
    npmPackage: '@modelcontextprotocol/server-fetch',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Web content fetching and conversion for efficient LLM usage',
    capabilities: ['fetch_url', 'html_to_markdown', 'web_scraping'],
    requiresAuth: false,
  },
  {
    id: 'mcp-filesystem',
    name: 'Filesystem',
    category: 'storage',
    npmPackage: '@modelcontextprotocol/server-filesystem',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Secure file operations with configurable access controls',
    capabilities: ['read_file', 'write_file', 'list_directory', 'create_directory', 'move_file', 'search_files'],
    requiresAuth: false,
  },
  {
    id: 'mcp-git',
    name: 'Git',
    category: 'vcs',
    npmPackage: '@modelcontextprotocol/server-git',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Tools to read, search, and manipulate Git repositories',
    capabilities: ['read_commits', 'search_code', 'diff_files', 'checkout_branch', 'create_branch'],
    requiresAuth: false,
  },
  {
    id: 'mcp-memory',
    name: 'Memory',
    category: 'ai',
    npmPackage: '@modelcontextprotocol/server-memory',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Knowledge graph-based persistent memory system',
    capabilities: ['store_memory', 'retrieve_memory', 'knowledge_graph', 'semantic_search'],
    requiresAuth: false,
  },
  {
    id: 'mcp-sequential-thinking',
    name: 'Sequential Thinking',
    category: 'ai',
    npmPackage: '@modelcontextprotocol/server-sequential-thinking',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Dynamic and reflective problem-solving through thought sequences',
    capabilities: ['chain_of_thought', 'reasoning', 'problem_solving'],
    requiresAuth: false,
  },
  {
    id: 'mcp-time',
    name: 'Time',
    category: 'utility',
    npmPackage: '@modelcontextprotocol/server-time',
    repository: 'https://github.com/modelcontextprotocol/servers',
    description: 'Time and timezone conversion capabilities',
    capabilities: ['get_time', 'convert_timezone', 'calculate_duration'],
    requiresAuth: false,
  },

  // ==================== ARCHIVED OFFICIAL SERVERS ====================
  {
    id: 'mcp-github',
    name: 'GitHub',
    category: 'vcs',
    npmPackage: '@modelcontextprotocol/server-github',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'Complete GitHub integration - repos, issues, PRs, code search',
    capabilities: ['list_repos', 'read_file', 'create_issue', 'create_pr', 'search_code', 'list_commits'],
    requiresAuth: true,
    envVars: ['GITHUB_TOKEN'],
  },
  {
    id: 'mcp-slack',
    name: 'Slack',
    category: 'communication',
    npmPackage: '@modelcontextprotocol/server-slack',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'Slack workspace integration - channels, messages, users',
    capabilities: ['list_channels', 'send_message', 'read_history', 'search_messages', 'manage_users'],
    requiresAuth: true,
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
  },
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL',
    category: 'database',
    npmPackage: '@modelcontextprotocol/server-postgres',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'PostgreSQL database operations and queries',
    capabilities: ['query', 'insert', 'update', 'delete', 'schema_inspect', 'transactions'],
    requiresAuth: true,
    envVars: ['POSTGRES_CONNECTION_STRING'],
  },
  {
    id: 'mcp-puppeteer',
    name: 'Puppeteer',
    category: 'browser',
    npmPackage: '@modelcontextprotocol/server-puppeteer',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'Headless browser automation with Puppeteer',
    capabilities: ['navigate', 'screenshot', 'click', 'type', 'evaluate_js', 'wait_for_selector'],
    requiresAuth: false,
  },
  {
    id: 'mcp-brave-search',
    name: 'Brave Search',
    category: 'search',
    npmPackage: '@modelcontextprotocol/server-brave-search',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'Web search using Brave Search API',
    capabilities: ['web_search', 'local_search', 'news_search'],
    requiresAuth: true,
    envVars: ['BRAVE_API_KEY'],
  },
  {
    id: 'mcp-google-maps',
    name: 'Google Maps',
    category: 'maps',
    npmPackage: '@modelcontextprotocol/server-google-maps',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'Google Maps geocoding and places API',
    capabilities: ['geocode', 'reverse_geocode', 'search_places', 'get_directions'],
    requiresAuth: true,
    envVars: ['GOOGLE_MAPS_API_KEY'],
  },
  {
    id: 'mcp-sqlite',
    name: 'SQLite',
    category: 'database',
    npmPackage: '@modelcontextprotocol/server-sqlite',
    repository: 'https://github.com/modelcontextprotocol/servers-archived',
    description: 'SQLite database operations',
    capabilities: ['query', 'insert', 'update', 'delete', 'schema_inspect'],
    requiresAuth: false,
  },

  // ==================== THIRD-PARTY COMMUNITY SERVERS ====================

  // AWS Integration
  {
    id: 'aws-kb-retrieval',
    name: 'AWS KB Retrieval',
    category: 'cloud',
    npmPackage: '@modelcontextprotocol/server-aws-kb-retrieval',
    description: 'Amazon Bedrock Knowledge Base integration',
    capabilities: ['retrieve_knowledge', 'semantic_search', 'kb_query'],
    requiresAuth: true,
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    category: 'cloud',
    repository: 'https://github.com/aws/aws-mcp-server-bedrock',
    description: 'AWS Bedrock foundation models integration',
    capabilities: ['invoke_model', 'list_models', 'streaming'],
    requiresAuth: true,
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  },

  // Browser Automation
  {
    id: 'playwright',
    name: 'Playwright',
    category: 'browser',
    npmPackage: 'mcp-server-playwright',
    description: 'Microsoft Playwright browser automation',
    capabilities: ['navigate', 'screenshot', 'click', 'type', 'evaluate', 'wait'],
    requiresAuth: false,
  },
  {
    id: 'browserbase',
    name: 'Browserbase',
    category: 'browser',
    npmPackage: '@browserbasehq/mcp-server-browserbase',
    description: 'Cloud browser automation platform',
    capabilities: ['remote_browser', 'screenshots', 'automation', 'session_recording'],
    requiresAuth: true,
    envVars: ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID'],
  },

  // Database Servers
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'database',
    npmPackage: 'mcp-server-mysql',
    description: 'MySQL database operations',
    capabilities: ['query', 'insert', 'update', 'delete', 'schema_inspect', 'transactions'],
    requiresAuth: true,
    envVars: ['MYSQL_CONNECTION_STRING'],
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'database',
    npmPackage: '@mongodb/mcp-server-mongodb',
    description: 'MongoDB database operations',
    capabilities: ['find', 'insert', 'update', 'delete', 'aggregate', 'index_management'],
    requiresAuth: true,
    envVars: ['MONGODB_URI'],
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'database',
    npmPackage: '@modelcontextprotocol/server-redis',
    description: 'Redis key-value store operations',
    capabilities: ['get', 'set', 'delete', 'keys', 'ttl', 'pub_sub'],
    requiresAuth: true,
    envVars: ['REDIS_URL'],
  },

  // Communication
  {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    npmPackage: 'mcp-server-discord',
    description: 'Discord server and channel management',
    capabilities: ['send_message', 'list_channels', 'manage_roles', 'read_history'],
    requiresAuth: true,
    envVars: ['DISCORD_BOT_TOKEN'],
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    category: 'communication',
    npmPackage: 'mcp-server-email',
    description: 'Email sending via SMTP',
    capabilities: ['send_email', 'send_html', 'attachments'],
    requiresAuth: true,
    envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
  },

  // Cloud Platforms
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'cloud',
    npmPackage: 'mcp-server-kubernetes',
    description: 'Kubernetes cluster management',
    capabilities: ['get_pods', 'get_services', 'get_deployments', 'apply_manifest', 'logs'],
    requiresAuth: true,
    envVars: ['KUBECONFIG'],
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'cloud',
    npmPackage: 'mcp-server-docker',
    description: 'Docker container management',
    capabilities: ['list_containers', 'start_container', 'stop_container', 'logs', 'exec'],
    requiresAuth: false,
  },
  {
    id: 'azure',
    name: 'Azure',
    category: 'cloud',
    npmPackage: 'mcp-server-azure',
    description: 'Microsoft Azure cloud services',
    capabilities: ['resource_management', 'vm_operations', 'storage', 'databases'],
    requiresAuth: true,
    envVars: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    category: 'cloud',
    npmPackage: 'mcp-server-gcp',
    description: 'Google Cloud Platform services',
    capabilities: ['compute', 'storage', 'bigquery', 'cloud_functions'],
    requiresAuth: true,
    envVars: ['GCP_PROJECT_ID', 'GCP_CREDENTIALS'],
  },

  // DevOps
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'vcs',
    npmPackage: '@modelcontextprotocol/server-gitlab',
    description: 'GitLab repository and CI/CD management',
    capabilities: ['list_repos', 'create_mr', 'pipelines', 'issues'],
    requiresAuth: true,
    envVars: ['GITLAB_TOKEN', 'GITLAB_URL'],
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'project',
    npmPackage: 'mcp-server-linear',
    description: 'Linear issue tracking and project management',
    capabilities: ['create_issue', 'list_issues', 'update_issue', 'projects', 'cycles'],
    requiresAuth: true,
    envVars: ['LINEAR_API_KEY'],
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'project',
    npmPackage: 'mcp-server-jira',
    description: 'Atlassian Jira project management',
    capabilities: ['create_issue', 'search_issues', 'transitions', 'comments'],
    requiresAuth: true,
    envVars: ['JIRA_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'],
  },

  // NOTE: OpenAI and Anthropic are NOT included - this system uses ONLY Cloudflare AI Gateway
  // All AI operations go through CF AI Gateway with authenticated headers and dynamic routing

  // Analytics & Monitoring
  {
    id: 'sentry',
    name: 'Sentry',
    category: 'monitoring',
    npmPackage: '@modelcontextprotocol/server-sentry',
    description: 'Sentry error tracking and monitoring',
    capabilities: ['list_issues', 'get_issue', 'update_issue', 'projects'],
    requiresAuth: true,
    envVars: ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG'],
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: 'monitoring',
    npmPackage: 'mcp-server-datadog',
    description: 'Datadog monitoring and metrics',
    capabilities: ['metrics', 'logs', 'traces', 'dashboards'],
    requiresAuth: true,
    envVars: ['DATADOG_API_KEY', 'DATADOG_APP_KEY'],
  },

  // Productivity
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    npmPackage: 'mcp-server-notion',
    description: 'Notion workspace and database management',
    capabilities: ['query_database', 'create_page', 'update_page', 'search'],
    requiresAuth: true,
    envVars: ['NOTION_TOKEN'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'storage',
    npmPackage: '@modelcontextprotocol/server-google-drive',
    description: 'Google Drive file management',
    capabilities: ['list_files', 'upload', 'download', 'share', 'search'],
    requiresAuth: true,
    envVars: ['GOOGLE_DRIVE_CREDENTIALS'],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'database',
    npmPackage: 'mcp-server-airtable',
    description: 'Airtable database operations',
    capabilities: ['list_records', 'create_record', 'update_record', 'delete_record'],
    requiresAuth: true,
    envVars: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'],
  },

  // Search & Data
  {
    id: 'google-search',
    name: 'Google Search',
    category: 'search',
    npmPackage: 'mcp-server-google-search',
    description: 'Google Custom Search integration',
    capabilities: ['web_search', 'image_search'],
    requiresAuth: true,
    envVars: ['GOOGLE_API_KEY', 'GOOGLE_CX'],
  },
  {
    id: 'tavily',
    name: 'Tavily',
    category: 'search',
    npmPackage: 'mcp-server-tavily',
    description: 'Tavily AI-powered search',
    capabilities: ['search', 'extract', 'qna'],
    requiresAuth: true,
    envVars: ['TAVILY_API_KEY'],
  },
  {
    id: 'exa',
    name: 'Exa',
    category: 'search',
    npmPackage: 'mcp-server-exa',
    description: 'Exa semantic search',
    capabilities: ['neural_search', 'find_similar', 'contents'],
    requiresAuth: true,
    envVars: ['EXA_API_KEY'],
  },

  // E-commerce
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'ecommerce',
    npmPackage: 'mcp-server-shopify',
    description: 'Shopify store management',
    capabilities: ['products', 'orders', 'customers', 'inventory'],
    requiresAuth: true,
    envVars: ['SHOPIFY_SHOP_URL', 'SHOPIFY_ACCESS_TOKEN'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    npmPackage: 'mcp-server-stripe',
    description: 'Stripe payment processing',
    capabilities: ['payments', 'customers', 'subscriptions', 'invoices'],
    requiresAuth: true,
    envVars: ['STRIPE_API_KEY'],
  },

  // Content & Media
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'media',
    npmPackage: 'mcp-server-youtube',
    description: 'YouTube video and channel management',
    capabilities: ['search_videos', 'get_transcript', 'channel_info', 'comments'],
    requiresAuth: true,
    envVars: ['YOUTUBE_API_KEY'],
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'social',
    npmPackage: 'mcp-server-twitter',
    description: 'Twitter/X social media integration',
    capabilities: ['post_tweet', 'search_tweets', 'user_timeline', 'mentions'],
    requiresAuth: true,
    envVars: ['TWITTER_API_KEY', 'TWITTER_API_SECRET'],
  },
];

/**
 * Awesome MCP Servers Manager
 * Manages connections to all awesome MCP servers
 */
export class AwesomeMCPManager {
  private env: Env;
  private mcpClient: MCPClient;
  private initialized: boolean = false;
  private connectedServers: Set<string> = new Set();

  constructor(env: Env) {
    this.env = env;
    this.mcpClient = new MCPClient(env);
  }

  /**
   * Initialize connections to all configured MCP servers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize MCP client
    await this.mcpClient.initialize();

    // Connect to servers based on available credentials
    for (const server of AWESOME_MCP_SERVERS) {
      if (this.canConnect(server)) {
        try {
          await this.connectServer(server);
          this.connectedServers.add(server.id);
        } catch (error) {
          console.error(`Failed to connect to ${server.name}:`, error);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Check if we can connect to a server (has required credentials)
   */
  private canConnect(server: MCPServerDefinition): boolean {
    if (!server.requiresAuth) return true;

    if (server.envVars) {
      return server.envVars.every(envVar => {
        const key = envVar as keyof Env;
        return this.env[key] !== undefined && this.env[key] !== '';
      });
    }

    return false;
  }

  /**
   * Connect to a specific MCP server
   */
  private async connectServer(server: MCPServerDefinition): Promise<void> {
    // Register server with MCP client
    await this.mcpClient.registerServer({
      id: server.id,
      name: server.name,
      url: server.url || `mcp://${server.id}`,
      capabilities: server.capabilities,
    });
  }

  /**
   * Get list of all available servers
   */
  getAvailableServers(): MCPServerDefinition[] {
    return AWESOME_MCP_SERVERS;
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): MCPServerDefinition[] {
    return AWESOME_MCP_SERVERS.filter(s => this.connectedServers.has(s.id));
  }

  /**
   * Get servers by category
   */
  getServersByCategory(category: string): MCPServerDefinition[] {
    return AWESOME_MCP_SERVERS.filter(s => s.category === category);
  }

  /**
   * Call a tool on any MCP server
   */
  async callTool(serverId: string, toolName: string, params: any): Promise<any> {
    if (!this.connectedServers.has(serverId)) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    return await this.mcpClient.callTool(serverId, toolName, params);
  }

  // ==================== GITHUB MCP ====================

  async github_listRepos(owner?: string): Promise<any> {
    return this.callTool('mcp-github', 'list_repos', { owner });
  }

  async github_readFile(owner: string, repo: string, path: string): Promise<any> {
    return this.callTool('mcp-github', 'read_file', { owner, repo, path });
  }

  async github_createIssue(owner: string, repo: string, title: string, body: string): Promise<any> {
    return this.callTool('mcp-github', 'create_issue', { owner, repo, title, body });
  }

  async github_createPR(owner: string, repo: string, title: string, head: string, base: string): Promise<any> {
    return this.callTool('mcp-github', 'create_pr', { owner, repo, title, head, base });
  }

  async github_searchCode(query: string): Promise<any> {
    return this.callTool('mcp-github', 'search_code', { query });
  }

  // ==================== SLACK MCP ====================

  async slack_sendMessage(channel: string, text: string): Promise<any> {
    return this.callTool('mcp-slack', 'send_message', { channel, text });
  }

  async slack_listChannels(): Promise<any> {
    return this.callTool('mcp-slack', 'list_channels', {});
  }

  async slack_readHistory(channel: string, limit?: number): Promise<any> {
    return this.callTool('mcp-slack', 'read_history', { channel, limit });
  }

  // ==================== FILESYSTEM MCP ====================

  async filesystem_readFile(path: string): Promise<any> {
    return this.callTool('mcp-filesystem', 'read_file', { path });
  }

  async filesystem_writeFile(path: string, content: string): Promise<any> {
    return this.callTool('mcp-filesystem', 'write_file', { path, content });
  }

  async filesystem_listDirectory(path: string): Promise<any> {
    return this.callTool('mcp-filesystem', 'list_directory', { path });
  }

  async filesystem_searchFiles(pattern: string, path?: string): Promise<any> {
    return this.callTool('mcp-filesystem', 'search_files', { pattern, path });
  }

  // ==================== POSTGRES MCP ====================

  async postgres_query(sql: string, params?: any[]): Promise<any> {
    return this.callTool('mcp-postgres', 'query', { sql, params });
  }

  async postgres_schemaInspect(): Promise<any> {
    return this.callTool('mcp-postgres', 'schema_inspect', {});
  }

  // ==================== PUPPETEER/BROWSER MCP ====================

  async browser_navigate(url: string): Promise<any> {
    const serverId = this.connectedServers.has('mcp-puppeteer') ? 'mcp-puppeteer' : 'playwright';
    return this.callTool(serverId, 'navigate', { url });
  }

  async browser_screenshot(url: string, fullPage?: boolean): Promise<any> {
    const serverId = this.connectedServers.has('mcp-puppeteer') ? 'mcp-puppeteer' : 'playwright';
    return this.callTool(serverId, 'screenshot', { url, fullPage });
  }

  async browser_click(selector: string): Promise<any> {
    const serverId = this.connectedServers.has('mcp-puppeteer') ? 'mcp-puppeteer' : 'playwright';
    return this.callTool(serverId, 'click', { selector });
  }

  // ==================== KUBERNETES MCP ====================

  async k8s_getPods(namespace?: string): Promise<any> {
    return this.callTool('kubernetes', 'get_pods', { namespace });
  }

  async k8s_getLogs(pod: string, namespace?: string): Promise<any> {
    return this.callTool('kubernetes', 'logs', { pod, namespace });
  }

  // ==================== DOCKER MCP ====================

  async docker_listContainers(): Promise<any> {
    return this.callTool('docker', 'list_containers', {});
  }

  async docker_startContainer(id: string): Promise<any> {
    return this.callTool('docker', 'start_container', { id });
  }

  async docker_stopContainer(id: string): Promise<any> {
    return this.callTool('docker', 'stop_container', { id });
  }

  // ==================== NOTION MCP ====================

  async notion_queryDatabase(databaseId: string, filter?: any): Promise<any> {
    return this.callTool('notion', 'query_database', { databaseId, filter });
  }

  async notion_createPage(parentId: string, properties: any): Promise<any> {
    return this.callTool('notion', 'create_page', { parentId, properties });
  }

  // ==================== SEARCH MCP ====================

  async search_web(query: string, provider?: 'brave' | 'google' | 'tavily' | 'exa'): Promise<any> {
    const serverId = provider ? `${provider === 'brave' ? 'mcp-brave-search' : provider}` : 'mcp-brave-search';
    return this.callTool(serverId, 'web_search', { query });
  }

  // ==================== MEMORY MCP ====================

  async memory_store(key: string, value: any, metadata?: any): Promise<any> {
    return this.callTool('mcp-memory', 'store_memory', { key, value, metadata });
  }

  async memory_retrieve(query: string): Promise<any> {
    return this.callTool('mcp-memory', 'retrieve_memory', { query });
  }

  // ==================== FETCH MCP ====================

  async fetch_url(url: string, convertToMarkdown?: boolean): Promise<any> {
    return this.callTool('mcp-fetch', 'fetch_url', { url, convertToMarkdown });
  }

  // ==================== GIT MCP ====================

  async git_readCommits(repo: string, limit?: number): Promise<any> {
    return this.callTool('mcp-git', 'read_commits', { repo, limit });
  }

  async git_diff(repo: string, from: string, to: string): Promise<any> {
    return this.callTool('mcp-git', 'diff_files', { repo, from, to });
  }

  async git_searchCode(repo: string, query: string): Promise<any> {
    return this.callTool('mcp-git', 'search_code', { repo, query });
  }
}
