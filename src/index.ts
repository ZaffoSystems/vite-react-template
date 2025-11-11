// Main Worker Entry Point - Routes requests to agents
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Export all Durable Object classes
export { MetaAgent } from './agents/MetaAgent';
export { BuilderAgent } from './agents/BuilderAgent';
export { ExecutorAgent } from './agents/ExecutorAgent';
export { CoordinatorAgent } from './agents/CoordinatorAgent';
export { MemoryAgent } from './agents/MemoryAgent';
export { ResearchAgent } from './agents/ResearchAgent';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ===================================================================
// HEALTH CHECK
// ===================================================================

app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    system: 'ultra-multi-agent-system',
    version: '2.0.0',
  });
});

app.get('/system-info', (c) => {
  return c.json({
    agents: ['MetaAgent', 'BuilderAgent', 'ExecutorAgent', 'CoordinatorAgent', 'MemoryAgent', 'ResearchAgent'],
    mcpServers: {
      cloudflare: 15,
      external: 10,
      total: 25
    },
    capabilities: [
      'natural-language-interface',
      'dynamic-agent-creation',
      'multi-agent-orchestration',
      'semantic-memory',
      'code-execution',
      'web-research',
      'sequential-thinking'
    ]
  });
});

// ===================================================================
// META AGENT ROUTES - Natural Language Interface & Agent Creation
// ===================================================================

app.post('/api/meta/initialize', async (c) => {
  const id = c.env.META_AGENT.idFromName('main');
  const stub = c.env.META_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/initialize`));
});

app.post('/api/meta/create-agent', async (c) => {
  const body = await c.req.json();
  const id = c.env.META_AGENT.idFromName('main');
  const stub = c.env.META_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/create-agent`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

app.post('/api/meta/chat', async (c) => {
  const body = await c.req.json();
  const id = c.env.META_AGENT.idFromName('main');
  const stub = c.env.META_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/chat`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

app.get('/api/meta/mcp-tools', async (c) => {
  const id = c.env.META_AGENT.idFromName('main');
  const stub = c.env.META_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/list-mcp-tools`));
});

app.get('/api/meta/agents', async (c) => {
  const id = c.env.META_AGENT.idFromName('main');
  const stub = c.env.META_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/list-agents`));
});

// ===================================================================
// BUILDER AGENT ROUTES - Deployment
// ===================================================================

app.post('/api/builder/deploy', async (c) => {
  const body = await c.req.json();
  const id = c.env.BUILDER_AGENT.idFromName('main');
  const stub = c.env.BUILDER_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'deploy', ...body }),
  }));
});

app.get('/api/builder/status/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const id = c.env.BUILDER_AGENT.idFromName('main');
  const stub = c.env.BUILDER_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'status', agentId }),
  }));
});

// ===================================================================
// EXECUTOR AGENT ROUTES - Task Execution
// ===================================================================

app.post('/api/executor/:agentId/execute', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const id = c.env.EXECUTOR_AGENT.idFromName(agentId);
  const stub = c.env.EXECUTOR_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/execute`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

app.get('/api/executor/:agentId/history', async (c) => {
  const agentId = c.req.param('agentId');
  const id = c.env.EXECUTOR_AGENT.idFromName(agentId);
  const stub = c.env.EXECUTOR_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/history`));
});

app.post('/api/executor/:agentId/mcp-tool', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const id = c.env.EXECUTOR_AGENT.idFromName(agentId);
  const stub = c.env.EXECUTOR_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/call-mcp-tool`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

// ===================================================================
// COORDINATOR AGENT ROUTES - Multi-Agent Orchestration
// ===================================================================

app.post('/api/coordinator/workflow', async (c) => {
  const body = await c.req.json();
  const id = c.env.COORDINATOR_AGENT.idFromName('main');
  const stub = c.env.COORDINATOR_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/create-workflow`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

app.post('/api/coordinator/workflow/:workflowId/execute', async (c) => {
  const workflowId = c.req.param('workflowId');
  const body = await c.req.json();
  const id = c.env.COORDINATOR_AGENT.idFromName('main');
  const stub = c.env.COORDINATOR_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/execute-workflow`, {
    method: 'POST',
    body: JSON.stringify({ workflowId, ...body }),
  }));
});

app.get('/api/coordinator/workflow/:workflowId', async (c) => {
  const workflowId = c.req.param('workflowId');
  const id = c.env.COORDINATOR_AGENT.idFromName('main');
  const stub = c.env.COORDINATOR_AGENT.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('id', workflowId);
  return stub.fetch(new Request(`${url.origin}/get-workflow-status?id=${workflowId}`));
});

// ===================================================================
// MEMORY AGENT ROUTES - Persistent Memory
// ===================================================================

app.post('/api/memory/store', async (c) => {
  const body = await c.req.json();
  const id = c.env.MEMORY_AGENT.idFromName('main');
  const stub = c.env.MEMORY_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/store`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

app.post('/api/memory/retrieve', async (c) => {
  const body = await c.req.json();
  const id = c.env.MEMORY_AGENT.idFromName('main');
  const stub = c.env.MEMORY_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/retrieve`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

// ===================================================================
// RESEARCH AGENT ROUTES - Web Research
// ===================================================================

app.post('/api/research/query', async (c) => {
  const body = await c.req.json();
  const id = c.env.RESEARCH_AGENT.idFromName('main');
  const stub = c.env.RESEARCH_AGENT.get(id);
  return stub.fetch(new Request(`${new URL(c.req.url).origin}/research`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

// ===================================================================
// MCP TOOLS DIRECT ACCESS (Advanced Usage)
// ===================================================================

app.post('/api/mcp/:server/call', async (c) => {
  const server = c.req.param('server');
  const { tool, params } = await c.req.json();
  
  const mcpBindings: Record<string, any> = {
    'docs': c.env.MCP_DOCS,
    'bindings': c.env.MCP_BINDINGS,
    'builds': c.env.MCP_BUILDS,
    'observability': c.env.MCP_OBSERVABILITY,
    'radar': c.env.MCP_RADAR,
    'container': c.env.MCP_CONTAINER,
    'browser': c.env.MCP_BROWSER,
    'logpush': c.env.MCP_LOGPUSH,
    'ai-gateway': c.env.MCP_AI_GATEWAY,
    'ai-search': c.env.MCP_AI_SEARCH,
    'audit-logs': c.env.MCP_AUDIT_LOGS,
    'dns-analytics': c.env.MCP_DNS_ANALYTICS,
    'dex': c.env.MCP_DEX,
    'casb': c.env.MCP_CASB,
    'graphql': c.env.MCP_GRAPHQL,
    'context7': c.env.MCP_CONTEXT7,
    'e2b': c.env.MCP_E2B,
    'firecrawl': c.env.MCP_FIRECRAWL,
    'brave-search': c.env.MCP_BRAVE_SEARCH,
    'sequential-thinking': c.env.MCP_SEQUENTIAL_THINKING,
    'filesystem': c.env.MCP_FILESYSTEM,
  };
  
  const mcpServer = mcpBindings[server];
  
  if (!mcpServer) {
    return c.json({ error: 'MCP server not found' }, 404);
  }
  
  try {
    const result = await mcpServer.call(tool, params);
    return c.json({ result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/mcp/:server/tools', async (c) => {
  const server = c.req.param('server');
  
  const mcpBindings: Record<string, any> = {
    'docs': c.env.MCP_DOCS,
    'bindings': c.env.MCP_BINDINGS,
    'builds': c.env.MCP_BUILDS,
    'observability': c.env.MCP_OBSERVABILITY,
    'radar': c.env.MCP_RADAR,
    'container': c.env.MCP_CONTAINER,
    'browser': c.env.MCP_BROWSER,
    'logpush': c.env.MCP_LOGPUSH,
    'ai-gateway': c.env.MCP_AI_GATEWAY,
    'ai-search': c.env.MCP_AI_SEARCH,
    'audit-logs': c.env.MCP_AUDIT_LOGS,
    'dns-analytics': c.env.MCP_DNS_ANALYTICS,
    'dex': c.env.MCP_DEX,
    'casb': c.env.MCP_CASB,
    'graphql': c.env.MCP_GRAPHQL,
    'context7': c.env.MCP_CONTEXT7,
    'e2b': c.env.MCP_E2B,
    'firecrawl': c.env.MCP_FIRECRAWL,
    'brave-search': c.env.MCP_BRAVE_SEARCH,
    'sequential-thinking': c.env.MCP_SEQUENTIAL_THINKING,
    'filesystem': c.env.MCP_FILESYSTEM,
  };
  
  const mcpServer = mcpBindings[server];
  
  if (!mcpServer) {
    return c.json({ error: 'MCP server not found' }, 404);
  }
  
  try {
    const tools = await mcpServer.listTools();
    return c.json({ server, tools });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===================================================================
// DATABASE QUERY ROUTES
// ===================================================================

app.get('/api/db/agents', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, name, role, status, created_at FROM agents ORDER BY created_at DESC'
  ).all();
  return c.json(result);
});

app.get('/api/db/tasks', async (c) => {
  const limit = c.req.query('limit') || '100';
  const result = await c.env.DB.prepare(
    'SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?'
  ).bind(parseInt(limit)).all();
  return c.json(result);
});

app.get('/api/db/workflows', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM workflows ORDER BY created_at DESC'
  ).all();
  return c.json(result);
});

app.get('/api/db/mcp-connections', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM mcp_connections ORDER BY created_at DESC'
  ).all();
  return c.json(result);
});

// ===================================================================
// CATCH-ALL: Serve React Frontend
// ===================================================================

app.all('*', async (c) => {
  // Serve static assets
  return new Response('React App - To be built with Vite', {
    headers: { 'Content-Type': 'text/html' },
  });
});

export default app;
