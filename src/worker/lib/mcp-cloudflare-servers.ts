import { Env } from '../types/env';
import { MCPClient } from './mcp-client';

/**
 * Cloudflare Official MCP Servers Configuration
 * All 13 officially supported MCP servers from Cloudflare
 */
export const CLOUDFLARE_MCP_SERVERS = {
  AI_GATEWAY: {
    id: 'cf-ai-gateway',
    name: 'Cloudflare AI Gateway',
    url: 'https://ai-gateway.mcp.cloudflare.com/mcp',
    description: 'Search logs and trace prompt-response cycles made through Cloudflare AI Gateway',
    capabilities: ['search_logs', 'trace_requests', 'analytics'],
  },
  RADAR: {
    id: 'cf-radar',
    name: 'Cloudflare Radar',
    url: 'https://radar.mcp.cloudflare.com/mcp',
    description: 'Global intelligence platform for internet traffic trends, regional outages, and web health',
    capabilities: ['traffic_insights', 'outage_detection', 'domain_scans', 'web_health'],
  },
  DNS_ANALYTICS: {
    id: 'cf-dns-analytics',
    name: 'Cloudflare DNS Analytics',
    url: 'https://dns-analytics.mcp.cloudflare.com/mcp',
    description: 'Review DNS configurations, access performance reports, and get optimization recommendations',
    capabilities: ['dns_config', 'performance_reports', 'recommendations'],
  },
  DOCUMENTATION: {
    id: 'cf-documentation',
    name: 'Cloudflare Documentation',
    url: 'https://documentation.mcp.cloudflare.com/mcp',
    description: 'Direct access to current Cloudflare Developer Documentation',
    capabilities: ['search_docs', 'get_docs', 'api_reference'],
  },
  WORKERS_BINDINGS: {
    id: 'cf-workers-bindings',
    name: 'Cloudflare Workers Bindings',
    url: 'https://workers-bindings.mcp.cloudflare.com/mcp',
    description: 'Leverage D1, R2, KV, and other Workers bindings on the fly',
    capabilities: ['d1_access', 'r2_access', 'kv_access', 'binding_management'],
  },
  WORKERS_LOGS: {
    id: 'cf-workers-logs',
    name: 'Cloudflare Workers Logs',
    url: 'https://workers-logs.mcp.cloudflare.com/mcp',
    description: 'Browse invocation logs, compute statistics, and find specific invocations',
    capabilities: ['log_search', 'statistics', 'error_tracking'],
  },
  LOGPUSH: {
    id: 'cf-logpush',
    name: 'Cloudflare Logpush',
    url: 'https://logpush.mcp.cloudflare.com/mcp',
    description: 'Status summaries and health checks for Logpush jobs',
    capabilities: ['job_status', 'health_checks', 'job_management'],
  },
  AUTORAG: {
    id: 'cf-autorag',
    name: 'Cloudflare AutoRAG',
    url: 'https://autorag.mcp.cloudflare.com/mcp',
    description: 'Search and retrieve information from documents for enhanced AI responses',
    capabilities: ['document_search', 'semantic_retrieval', 'rag_queries'],
  },
  AUDIT_LOGS: {
    id: 'cf-audit-logs',
    name: 'Cloudflare Audit Logs',
    url: 'https://audit-logs.mcp.cloudflare.com/mcp',
    description: 'Query audit logs and generate compliance reports',
    capabilities: ['log_query', 'report_generation', 'compliance_audit'],
  },
  BROWSER_RENDERING: {
    id: 'cf-browser-rendering',
    name: 'Cloudflare Browser Rendering',
    url: 'https://browser-rendering.mcp.cloudflare.com/mcp',
    description: 'Fetch web pages, convert to markdown, and capture screenshots',
    capabilities: ['web_fetch', 'markdown_conversion', 'screenshots', 'playwright'],
  },
  CONTAINER: {
    id: 'cf-container',
    name: 'Cloudflare Container',
    url: 'https://container.mcp.cloudflare.com/mcp',
    description: 'Quickly stand up sandbox development environments',
    capabilities: ['create_sandbox', 'manage_containers', 'environment_setup'],
  },
  DEM: {
    id: 'cf-dem',
    name: 'Cloudflare Digital Experience Monitoring',
    url: 'https://dem.mcp.cloudflare.com/mcp',
    description: 'Insights into end-user experience of web and SaaS applications',
    capabilities: ['performance_monitoring', 'user_analytics', 'experience_insights'],
  },
  CASB: {
    id: 'cf-casb',
    name: 'Cloudflare One CASB',
    url: 'https://casb.mcp.cloudflare.com/mcp',
    description: 'Cloud Access Security Broker for Zero Trust suite',
    capabilities: ['security_posture', 'access_control', 'threat_detection'],
  },
} as const;

/**
 * Cloudflare MCP Server Integration Manager
 * Manages connections to all 13 official Cloudflare MCP servers
 */
export class CloudflareMCPManager {
  private mcpClient: MCPClient;
  private env: Env;
  private connectedServers: Set<string>;

  constructor(env: Env) {
    this.env = env;
    this.mcpClient = new MCPClient(env);
    this.connectedServers = new Set();
  }

  /**
   * Initialize and connect to all Cloudflare MCP servers
   */
  async initialize(): Promise<void> {
    await this.mcpClient.initialize();

    // Connect to all CF MCP servers in parallel
    const connectionPromises = Object.values(CLOUDFLARE_MCP_SERVERS).map(server =>
      this.connectServer(server)
    );

    const results = await Promise.allSettled(connectionPromises);

    results.forEach((result, index) => {
      const server = Object.values(CLOUDFLARE_MCP_SERVERS)[index];
      if (result.status === 'fulfilled' && result.value) {
        this.connectedServers.add(server.id);
        console.log(`✅ Connected to ${server.name}`);
      } else {
        console.error(`❌ Failed to connect to ${server.name}`);
      }
    });
  }

  /**
   * Connect to a specific CF MCP server
   */
  private async connectServer(server: typeof CLOUDFLARE_MCP_SERVERS[keyof typeof CLOUDFLARE_MCP_SERVERS]): Promise<boolean> {
    try {
      // Check if already registered in DB
      const existing = await this.env.DB.prepare(
        'SELECT id FROM mcp_servers WHERE id = ?'
      ).bind(server.id).first();

      if (!existing) {
        await this.mcpClient.registerServer({
          name: server.name,
          url: server.url,
          authConfig: {
            type: 'oauth',
            accountId: this.env.CF_ACCOUNT_ID,
          },
        });
      }

      return true;
    } catch (error) {
      console.error(`Failed to connect to ${server.name}:`, error);
      return false;
    }
  }

  // ==================== AI Gateway MCP ====================

  async aiGateway_searchLogs(query: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-ai-gateway', 'search_logs', {
      query,
      ...options,
    });
  }

  async aiGateway_traceRequest(requestId: string): Promise<any> {
    return this.mcpClient.callTool('cf-ai-gateway', 'trace_request', { requestId });
  }

  async aiGateway_getAnalytics(gatewayId: string, timeRange: string): Promise<any> {
    return this.mcpClient.callTool('cf-ai-gateway', 'get_analytics', {
      gatewayId,
      timeRange,
    });
  }

  // ==================== Radar MCP ====================

  async radar_getTrafficInsights(options: {
    region?: string;
    asn?: number;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-radar', 'get_traffic_insights', options);
  }

  async radar_detectOutages(region?: string): Promise<any> {
    return this.mcpClient.callTool('cf-radar', 'detect_outages', { region });
  }

  async radar_scanDomain(domain: string): Promise<any> {
    return this.mcpClient.callTool('cf-radar', 'scan_domain', { domain });
  }

  async radar_getWebHealth(): Promise<any> {
    return this.mcpClient.callTool('cf-radar', 'get_web_health', {});
  }

  // ==================== DNS Analytics MCP ====================

  async dnsAnalytics_getConfig(zoneId: string): Promise<any> {
    return this.mcpClient.callTool('cf-dns-analytics', 'get_config', { zoneId });
  }

  async dnsAnalytics_getPerformanceReport(zoneId: string, timeRange: string): Promise<any> {
    return this.mcpClient.callTool('cf-dns-analytics', 'get_performance_report', {
      zoneId,
      timeRange,
    });
  }

  async dnsAnalytics_getRecommendations(zoneId: string): Promise<any> {
    return this.mcpClient.callTool('cf-dns-analytics', 'get_recommendations', { zoneId });
  }

  // ==================== Documentation MCP ====================

  async docs_search(query: string): Promise<any> {
    return this.mcpClient.callTool('cf-documentation', 'search', { query });
  }

  async docs_get(path: string): Promise<any> {
    return this.mcpClient.callTool('cf-documentation', 'get_page', { path });
  }

  async docs_getAPIReference(api: string): Promise<any> {
    return this.mcpClient.callTool('cf-documentation', 'get_api_reference', { api });
  }

  // ==================== Workers Bindings MCP ====================

  async workersBindings_queryD1(databaseId: string, sql: string, params?: any[]): Promise<any> {
    return this.mcpClient.callTool('cf-workers-bindings', 'd1_query', {
      databaseId,
      sql,
      params,
    });
  }

  async workersBindings_getR2Object(bucket: string, key: string): Promise<any> {
    return this.mcpClient.callTool('cf-workers-bindings', 'r2_get', {
      bucket,
      key,
    });
  }

  async workersBindings_putR2Object(bucket: string, key: string, value: string): Promise<any> {
    return this.mcpClient.callTool('cf-workers-bindings', 'r2_put', {
      bucket,
      key,
      value,
    });
  }

  async workersBindings_getKV(namespace: string, key: string): Promise<any> {
    return this.mcpClient.callTool('cf-workers-bindings', 'kv_get', {
      namespace,
      key,
    });
  }

  async workersBindings_putKV(namespace: string, key: string, value: string): Promise<any> {
    return this.mcpClient.callTool('cf-workers-bindings', 'kv_put', {
      namespace,
      key,
      value,
    });
  }

  // ==================== Workers Logs MCP ====================

  async workersLogs_search(scriptName: string, query: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-workers-logs', 'search_logs', {
      scriptName,
      query,
      ...options,
    });
  }

  async workersLogs_getStatistics(scriptName: string, timeRange: string): Promise<any> {
    return this.mcpClient.callTool('cf-workers-logs', 'get_statistics', {
      scriptName,
      timeRange,
    });
  }

  async workersLogs_getErrors(scriptName: string, limit?: number): Promise<any> {
    return this.mcpClient.callTool('cf-workers-logs', 'get_errors', {
      scriptName,
      limit,
    });
  }

  // ==================== Logpush MCP ====================

  async logpush_getJobStatus(jobId: string): Promise<any> {
    return this.mcpClient.callTool('cf-logpush', 'get_job_status', { jobId });
  }

  async logpush_healthCheck(): Promise<any> {
    return this.mcpClient.callTool('cf-logpush', 'health_check', {});
  }

  async logpush_listJobs(): Promise<any> {
    return this.mcpClient.callTool('cf-logpush', 'list_jobs', {});
  }

  // ==================== AutoRAG MCP ====================

  async autoRAG_search(query: string, topK?: number): Promise<any> {
    return this.mcpClient.callTool('cf-autorag', 'search', { query, topK });
  }

  async autoRAG_retrieve(documentId: string): Promise<any> {
    return this.mcpClient.callTool('cf-autorag', 'retrieve', { documentId });
  }

  async autoRAG_query(question: string, context?: string): Promise<any> {
    return this.mcpClient.callTool('cf-autorag', 'query', { question, context });
  }

  // ==================== Audit Logs MCP ====================

  async auditLogs_query(options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    userId?: string;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-audit-logs', 'query', options);
  }

  async auditLogs_generateReport(options: {
    startDate: Date;
    endDate: Date;
    format: 'pdf' | 'csv' | 'json';
  }): Promise<any> {
    return this.mcpClient.callTool('cf-audit-logs', 'generate_report', options);
  }

  // ==================== Browser Rendering MCP ====================

  async browserRendering_fetchPage(url: string, options?: {
    convertToMarkdown?: boolean;
    screenshot?: boolean;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-browser-rendering', 'fetch_page', {
      url,
      ...options,
    });
  }

  async browserRendering_screenshot(url: string, options?: {
    fullPage?: boolean;
    width?: number;
    height?: number;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-browser-rendering', 'screenshot', {
      url,
      ...options,
    });
  }

  async browserRendering_runPlaywright(script: string): Promise<any> {
    return this.mcpClient.callTool('cf-browser-rendering', 'run_playwright', { script });
  }

  // ==================== Container MCP ====================

  async container_createSandbox(config: {
    image?: string;
    env?: Record<string, string>;
    command?: string[];
  }): Promise<any> {
    return this.mcpClient.callTool('cf-container', 'create_sandbox', config);
  }

  async container_listContainers(): Promise<any> {
    return this.mcpClient.callTool('cf-container', 'list_containers', {});
  }

  async container_stopContainer(containerId: string): Promise<any> {
    return this.mcpClient.callTool('cf-container', 'stop_container', { containerId });
  }

  // ==================== DEM (Digital Experience Monitoring) MCP ====================

  async dem_getPerformanceMetrics(options: {
    applicationId?: string;
    timeRange?: string;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-dem', 'get_performance_metrics', options);
  }

  async dem_getUserAnalytics(timeRange: string): Promise<any> {
    return this.mcpClient.callTool('cf-dem', 'get_user_analytics', { timeRange });
  }

  async dem_getExperienceInsights(): Promise<any> {
    return this.mcpClient.callTool('cf-dem', 'get_experience_insights', {});
  }

  // ==================== CASB (Cloud Access Security Broker) MCP ====================

  async casb_getSecurityPosture(): Promise<any> {
    return this.mcpClient.callTool('cf-casb', 'get_security_posture', {});
  }

  async casb_getAccessPolicies(): Promise<any> {
    return this.mcpClient.callTool('cf-casb', 'get_access_policies', {});
  }

  async casb_detectThreats(options?: {
    severity?: 'low' | 'medium' | 'high';
    timeRange?: string;
  }): Promise<any> {
    return this.mcpClient.callTool('cf-casb', 'detect_threats', options);
  }

  /**
   * Get status of all connected CF MCP servers
   */
  async getServerStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const [key, server] of Object.entries(CLOUDFLARE_MCP_SERVERS)) {
      status[server.id] = this.connectedServers.has(server.id);
    }

    return status;
  }

  /**
   * Get list of all available CF MCP servers
   */
  getAvailableServers() {
    return Object.values(CLOUDFLARE_MCP_SERVERS);
  }
}
