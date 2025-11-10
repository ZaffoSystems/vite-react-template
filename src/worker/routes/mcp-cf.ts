import { Hono } from 'hono';
import { Env } from '../types/env';
import { CloudflareMCPManager, CLOUDFLARE_MCP_SERVERS } from '../lib/mcp-cloudflare-servers';

const mcpCF = new Hono<{ Bindings: Env }>();

// Initialize CF MCP Manager
mcpCF.post('/init', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();
  const status = await manager.getServerStatus();
  return c.json({ success: true, servers: status });
});

// Get all available CF MCP servers
mcpCF.get('/servers', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  const servers = manager.getAvailableServers();
  return c.json({ servers });
});

// Get server status
mcpCF.get('/status', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();
  const status = await manager.getServerStatus();
  return c.json({ status });
});

// ==================== AI Gateway ====================

mcpCF.post('/ai-gateway/search-logs', async (c) => {
  const { query, startDate, endDate, limit } = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.aiGateway_searchLogs(query, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
  });

  return c.json(result);
});

mcpCF.post('/ai-gateway/trace', async (c) => {
  const { requestId } = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.aiGateway_traceRequest(requestId);
  return c.json(result);
});

mcpCF.get('/ai-gateway/:gatewayId/analytics', async (c) => {
  const gatewayId = c.req.param('gatewayId');
  const timeRange = c.req.query('timeRange') || '24h';

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.aiGateway_getAnalytics(gatewayId, timeRange);
  return c.json(result);
});

// ==================== Radar ====================

mcpCF.post('/radar/traffic', async (c) => {
  const options = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.radar_getTrafficInsights(options);
  return c.json(result);
});

mcpCF.get('/radar/outages', async (c) => {
  const region = c.req.query('region');
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.radar_detectOutages(region);
  return c.json(result);
});

mcpCF.post('/radar/scan-domain', async (c) => {
  const { domain } = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.radar_scanDomain(domain);
  return c.json(result);
});

mcpCF.get('/radar/web-health', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.radar_getWebHealth();
  return c.json(result);
});

// ==================== DNS Analytics ====================

mcpCF.get('/dns/:zoneId/config', async (c) => {
  const zoneId = c.req.param('zoneId');
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dnsAnalytics_getConfig(zoneId);
  return c.json(result);
});

mcpCF.get('/dns/:zoneId/performance', async (c) => {
  const zoneId = c.req.param('zoneId');
  const timeRange = c.req.query('timeRange') || '24h';

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dnsAnalytics_getPerformanceReport(zoneId, timeRange);
  return c.json(result);
});

mcpCF.get('/dns/:zoneId/recommendations', async (c) => {
  const zoneId = c.req.param('zoneId');
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dnsAnalytics_getRecommendations(zoneId);
  return c.json(result);
});

// ==================== Documentation ====================

mcpCF.post('/docs/search', async (c) => {
  const { query } = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.docs_search(query);
  return c.json(result);
});

mcpCF.get('/docs/page', async (c) => {
  const path = c.req.query('path');
  if (!path) {
    return c.json({ error: 'Path required' }, 400);
  }

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.docs_get(path);
  return c.json(result);
});

mcpCF.get('/docs/api/:api', async (c) => {
  const api = c.req.param('api');
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.docs_getAPIReference(api);
  return c.json(result);
});

// ==================== Workers Bindings ====================

mcpCF.post('/workers-bindings/d1/query', async (c) => {
  const { databaseId, sql, params } = await c.req.json();
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersBindings_queryD1(databaseId, sql, params);
  return c.json(result);
});

mcpCF.get('/workers-bindings/r2/:bucket/:key', async (c) => {
  const bucket = c.req.param('bucket');
  const key = c.req.param('key');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersBindings_getR2Object(bucket, key);
  return c.json(result);
});

mcpCF.put('/workers-bindings/r2/:bucket/:key', async (c) => {
  const bucket = c.req.param('bucket');
  const key = c.req.param('key');
  const { value } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersBindings_putR2Object(bucket, key, value);
  return c.json(result);
});

mcpCF.get('/workers-bindings/kv/:namespace/:key', async (c) => {
  const namespace = c.req.param('namespace');
  const key = c.req.param('key');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersBindings_getKV(namespace, key);
  return c.json(result);
});

mcpCF.put('/workers-bindings/kv/:namespace/:key', async (c) => {
  const namespace = c.req.param('namespace');
  const key = c.req.param('key');
  const { value } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersBindings_putKV(namespace, key, value);
  return c.json(result);
});

// ==================== Workers Logs ====================

mcpCF.post('/workers-logs/search', async (c) => {
  const { scriptName, query, startTime, endTime, limit } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersLogs_search(scriptName, query, {
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
    limit,
  });

  return c.json(result);
});

mcpCF.get('/workers-logs/:scriptName/statistics', async (c) => {
  const scriptName = c.req.param('scriptName');
  const timeRange = c.req.query('timeRange') || '24h';

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersLogs_getStatistics(scriptName, timeRange);
  return c.json(result);
});

mcpCF.get('/workers-logs/:scriptName/errors', async (c) => {
  const scriptName = c.req.param('scriptName');
  const limit = parseInt(c.req.query('limit') || '50');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.workersLogs_getErrors(scriptName, limit);
  return c.json(result);
});

// ==================== Logpush ====================

mcpCF.get('/logpush/jobs', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.logpush_listJobs();
  return c.json(result);
});

mcpCF.get('/logpush/jobs/:jobId', async (c) => {
  const jobId = c.req.param('jobId');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.logpush_getJobStatus(jobId);
  return c.json(result);
});

mcpCF.get('/logpush/health', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.logpush_healthCheck();
  return c.json(result);
});

// ==================== AutoRAG ====================

mcpCF.post('/autorag/search', async (c) => {
  const { query, topK } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.autoRAG_search(query, topK);
  return c.json(result);
});

mcpCF.get('/autorag/documents/:documentId', async (c) => {
  const documentId = c.req.param('documentId');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.autoRAG_retrieve(documentId);
  return c.json(result);
});

mcpCF.post('/autorag/query', async (c) => {
  const { question, context } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.autoRAG_query(question, context);
  return c.json(result);
});

// ==================== Audit Logs ====================

mcpCF.post('/audit-logs/query', async (c) => {
  const options = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.auditLogs_query({
    ...options,
    startDate: options.startDate ? new Date(options.startDate) : undefined,
    endDate: options.endDate ? new Date(options.endDate) : undefined,
  });

  return c.json(result);
});

mcpCF.post('/audit-logs/report', async (c) => {
  const { startDate, endDate, format } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.auditLogs_generateReport({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    format,
  });

  return c.json(result);
});

// ==================== Browser Rendering ====================

mcpCF.post('/browser/fetch', async (c) => {
  const { url, convertToMarkdown, screenshot } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.browserRendering_fetchPage(url, {
    convertToMarkdown,
    screenshot,
  });

  return c.json(result);
});

mcpCF.post('/browser/screenshot', async (c) => {
  const { url, fullPage, width, height } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.browserRendering_screenshot(url, {
    fullPage,
    width,
    height,
  });

  return c.json(result);
});

mcpCF.post('/browser/playwright', async (c) => {
  const { script } = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.browserRendering_runPlaywright(script);
  return c.json(result);
});

// ==================== Container ====================

mcpCF.post('/container/create', async (c) => {
  const config = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.container_createSandbox(config);
  return c.json(result);
});

mcpCF.get('/container/list', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.container_listContainers();
  return c.json(result);
});

mcpCF.delete('/container/:containerId', async (c) => {
  const containerId = c.req.param('containerId');

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.container_stopContainer(containerId);
  return c.json(result);
});

// ==================== DEM (Digital Experience Monitoring) ====================

mcpCF.post('/dem/performance', async (c) => {
  const options = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dem_getPerformanceMetrics(options);
  return c.json(result);
});

mcpCF.get('/dem/user-analytics', async (c) => {
  const timeRange = c.req.query('timeRange') || '24h';

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dem_getUserAnalytics(timeRange);
  return c.json(result);
});

mcpCF.get('/dem/insights', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.dem_getExperienceInsights();
  return c.json(result);
});

// ==================== CASB ====================

mcpCF.get('/casb/security-posture', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.casb_getSecurityPosture();
  return c.json(result);
});

mcpCF.get('/casb/policies', async (c) => {
  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.casb_getAccessPolicies();
  return c.json(result);
});

mcpCF.post('/casb/threats', async (c) => {
  const options = await c.req.json();

  const manager = new CloudflareMCPManager(c.env);
  await manager.initialize();

  const result = await manager.casb_detectThreats(options);
  return c.json(result);
});

export default mcpCF;
