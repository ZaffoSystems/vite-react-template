import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, Task } from './types/env';
import { AgentOrchestrator } from './agents/orchestrator';
import { CloudflareAPI } from './lib/cloudflare-api';
import { AIGatewayClient } from './lib/ai-gateway';
import { RAGSystem } from './lib/rag-system';
import { MCPClient } from './lib/mcp-client';
import { DockerHubClient } from './lib/docker-hub';
import { MasterControlAgent } from './agents/master-control';
import { AgentState } from './durable-objects/agent-state';
import { SSHSession } from './durable-objects/ssh-session';
import mcpCF from './routes/mcp-cf';
import mcpAwesome from './routes/mcp-awesome';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// Mount CF MCP routes
app.route('/api/mcp-cf', mcpCF);

// Mount Awesome MCP routes
app.route('/api/mcp-awesome', mcpAwesome);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: Date.now(),
    service: 'mas-control-agent',
  });
});

// ====================Master Control Agent ====================

app.post('/api/master/command', async (c) => {
  const { command } = await c.req.json();

  if (!command) {
    return c.json({ error: 'Command required' }, 400);
  }

  const master = new MasterControlAgent(c.env);

  try {
    const result = await master.processCommand(command);
    return c.json(result);
  } catch (error: any) {
    return c.json({
      error: error.message,
      command,
      success: false,
    }, 500);
  }
});

// ==================== Agent Management ====================

app.post('/api/agents', async (c) => {
  const body = await c.req.json();
  const orchestrator = new AgentOrchestrator(c.env);
  await orchestrator.initialize();

  const agentId = await orchestrator.createAgent({
    name: body.name,
    type: body.type,
    capabilities: body.capabilities,
    model: body.model,
    temperature: body.temperature,
    maxTokens: body.maxTokens,
    systemPrompt: body.systemPrompt,
  });

  return c.json({ success: true, agentId });
});

app.get('/api/agents', async (c) => {
  const orchestrator = new AgentOrchestrator(c.env);
  await orchestrator.initialize();

  const agents = orchestrator.listAgents();

  return c.json({ agents });
});

app.get('/api/agents/:id', async (c) => {
  const agentId = c.req.param('id');
  const orchestrator = new AgentOrchestrator(c.env);
  await orchestrator.initialize();

  const status = await orchestrator.getAgentStatus(agentId);

  return c.json(status);
});

app.get('/api/agents/:id/memory', async (c) => {
  const agentId = c.req.param('id');
  const doStub = c.env.AGENT_STATE.get(c.env.AGENT_STATE.idFromName(agentId));
  const response = await doStub.fetch(new Request('https://dummy/memory'));

  return response;
});

// ==================== Task Management ====================

app.post('/api/tasks', async (c) => {
  const body = await c.req.json();
  const orchestrator = new AgentOrchestrator(c.env);
  await orchestrator.initialize();

  const taskId = await orchestrator.dispatchTask({
    type: body.type,
    payload: body.payload,
    priority: body.priority || 0,
    agentId: body.agentId,
    status: 'pending',
    retryCount: 0,
    maxRetries: body.maxRetries || 3,
  });

  return c.json({ success: true, taskId });
});

app.get('/api/tasks/:id', async (c) => {
  const taskId = c.req.param('id');
  const task = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE id = ?'
  ).bind(taskId).first();

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({
    ...task,
    payload: JSON.parse(task.payload as string),
    result: task.result ? JSON.parse(task.result as string) : null,
  });
});

app.get('/api/tasks', async (c) => {
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM tasks';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    tasks: results.results.map(t => ({
      ...t,
      payload: JSON.parse(t.payload as string),
      result: t.result ? JSON.parse(t.result as string) : null,
    })),
  });
});

// ==================== Cloudflare Infrastructure ====================

app.get('/api/cf/workers', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const workers = await cfAPI.listWorkers();
  return c.json({ workers });
});

app.post('/api/cf/workers', async (c) => {
  const { name, script, bindings } = await c.req.json();
  const cfAPI = new CloudflareAPI(c.env);
  const result = await cfAPI.deployWorker(name, script, bindings);
  return c.json({ success: true, result });
});

app.get('/api/cf/workers/:name', async (c) => {
  const name = c.req.param('name');
  const cfAPI = new CloudflareAPI(c.env);
  const worker = await cfAPI.getWorker(name);
  return c.json(worker);
});

app.delete('/api/cf/workers/:name', async (c) => {
  const name = c.req.param('name');
  const cfAPI = new CloudflareAPI(c.env);
  await cfAPI.deleteWorker(name);
  return c.json({ success: true });
});

app.get('/api/cf/kv', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const namespaces = await cfAPI.listKVNamespaces();
  return c.json({ namespaces });
});

app.post('/api/cf/kv', async (c) => {
  const { title } = await c.req.json();
  const cfAPI = new CloudflareAPI(c.env);
  const namespace = await cfAPI.createKVNamespace(title);
  return c.json({ success: true, namespace });
});

app.get('/api/cf/d1', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const databases = await cfAPI.listD1Databases();
  return c.json({ databases });
});

app.post('/api/cf/d1', async (c) => {
  const { name } = await c.req.json();
  const cfAPI = new CloudflareAPI(c.env);
  const database = await cfAPI.createD1Database(name);
  return c.json({ success: true, database });
});

app.post('/api/cf/d1/:id/query', async (c) => {
  const databaseId = c.req.param('id');
  const { sql, params } = await c.req.json();
  const cfAPI = new CloudflareAPI(c.env);
  const result = await cfAPI.queryD1(databaseId, sql, params);
  return c.json({ result });
});

app.get('/api/cf/r2', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const buckets = await cfAPI.listR2Buckets();
  return c.json({ buckets });
});

app.post('/api/cf/r2', async (c) => {
  const { name } = await c.req.json();
  const cfAPI = new CloudflareAPI(c.env);
  const bucket = await cfAPI.createR2Bucket(name);
  return c.json({ success: true, bucket });
});

app.get('/api/cf/queues', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const queues = await cfAPI.listQueues();
  return c.json({ queues });
});

app.get('/api/cf/analytics', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const analytics = await cfAPI.getAccountAnalytics();
  return c.json({ analytics });
});

app.get('/api/cf/vectorize', async (c) => {
  const cfAPI = new CloudflareAPI(c.env);
  const indexes = await cfAPI.listVectorizeIndexes();
  return c.json({ indexes });
});

// ==================== Docker Hub ====================

app.get('/api/docker/repositories', async (c) => {
  const username = c.req.query('username');
  const docker = new DockerHubClient(c.env);
  const repos = await docker.listRepositories(username);
  return c.json({ repositories: repos });
});

app.get('/api/docker/:repo/tags', async (c) => {
  const repo = c.req.param('repo');
  const docker = new DockerHubClient(c.env);
  const tags = await docker.listTags(repo);
  return c.json({ tags });
});

app.post('/api/docker/sync', async (c) => {
  const { repository } = await c.req.json();
  const docker = new DockerHubClient(c.env);

  await docker.watchRepository(repository, c.env.DB, async (image) => {
    console.log(`Image updated: ${image.repository}:${image.tag}`);
  });

  return c.json({ success: true });
});

// ==================== MCP ====================

app.get('/api/mcp/servers', async (c) => {
  const mcp = new MCPClient(c.env);
  await mcp.initialize();
  const servers = mcp.getConnectedServers();
  return c.json({ servers });
});

app.post('/api/mcp/servers', async (c) => {
  const { name, url, authConfig } = await c.req.json();
  const mcp = new MCPClient(c.env);
  await mcp.initialize();

  const serverId = await mcp.registerServer({ name, url, authConfig });
  return c.json({ success: true, serverId });
});

app.get('/api/mcp/tools', async (c) => {
  const serverId = c.req.query('serverId');
  const mcp = new MCPClient(c.env);
  await mcp.initialize();

  const tools = await mcp.listTools(serverId);
  return c.json({ tools });
});

app.post('/api/mcp/tools/:serverId/:toolName', async (c) => {
  const serverId = c.req.param('serverId');
  const toolName = c.req.param('toolName');
  const args = await c.req.json();

  const mcp = new MCPClient(c.env);
  await mcp.initialize();

  const result = await mcp.callTool(serverId, toolName, args);
  return c.json({ result });
});

app.get('/api/mcp/resources', async (c) => {
  const serverId = c.req.query('serverId');
  const mcp = new MCPClient(c.env);
  await mcp.initialize();

  const resources = await mcp.listResources(serverId);
  return c.json({ resources });
});

// ==================== RAG System ====================

app.post('/api/rag/ingest', async (c) => {
  const { sourcePath, content, metadata } = await c.req.json();
  const rag = new RAGSystem(c.env);

  const documentId = await rag.ingestDocument(sourcePath, content, metadata);
  return c.json({ success: true, documentId });
});

app.post('/api/rag/ingest/r2', async (c) => {
  const { prefix } = await c.req.json();
  const rag = new RAGSystem(c.env);

  const count = await rag.ingestFromR2(prefix);
  return c.json({ success: true, ingested: count });
});

app.post('/api/rag/search', async (c) => {
  const { query, topK, filter, minScore } = await c.req.json();
  const rag = new RAGSystem(c.env);

  const results = await rag.search(query, { topK, filter, minScore });
  return c.json({ results });
});

app.post('/api/rag/query', async (c) => {
  const { query, model, maxContextChunks } = await c.req.json();
  const rag = new RAGSystem(c.env);

  const answer = await rag.generateAnswer(query, { model, maxContextChunks });
  return c.json(answer);
});

app.get('/api/rag/documents', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const rag = new RAGSystem(c.env);
  const documents = await rag.listDocuments({ limit, offset });

  return c.json({ documents });
});

app.delete('/api/rag/documents/:id', async (c) => {
  const documentId = c.req.param('id');
  const rag = new RAGSystem(c.env);

  await rag.deleteDocument(documentId);
  return c.json({ success: true });
});

// ==================== SSH Sessions ====================

app.post('/api/ssh/connect', async (c) => {
  const config = await c.req.json();
  const sessionId = crypto.randomUUID();

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  await doStub.fetch(new Request('https://dummy/connect', {
    method: 'POST',
    body: JSON.stringify(config),
  }));

  return c.json({ success: true, sessionId });
});

app.post('/api/ssh/:sessionId/execute', async (c) => {
  const sessionId = c.req.param('sessionId');
  const { command } = await c.req.json();

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  const response = await doStub.fetch(new Request('https://dummy/execute', {
    method: 'POST',
    body: JSON.stringify({ command }),
  }));

  return response;
});

app.get('/api/ssh/:sessionId/status', async (c) => {
  const sessionId = c.req.param('sessionId');

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  const response = await doStub.fetch(new Request('https://dummy/status'));

  return response;
});

app.get('/api/ssh/:sessionId/history', async (c) => {
  const sessionId = c.req.param('sessionId');

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  const response = await doStub.fetch(new Request('https://dummy/history'));

  return response;
});

app.delete('/api/ssh/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  await doStub.fetch(new Request('https://dummy/disconnect', {
    method: 'POST',
  }));

  return c.json({ success: true });
});

// WebSocket endpoint for SSH terminal
app.get('/api/ssh/:sessionId/ws', async (c) => {
  const sessionId = c.req.param('sessionId');
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const doStub = c.env.SSH_SESSION.get(c.env.SSH_SESSION.idFromName(sessionId));
  return doStub.fetch(c.req.raw);
});

// ==================== AI Gateway ====================

app.post('/api/ai/chat', async (c) => {
  const { messages, model, temperature, maxTokens } = await c.req.json();
  const ai = new AIGatewayClient(c.env);

  const response = await ai.runWithBinding(
    model || '@cf/meta/llama-3.1-8b-instruct-fast',
    messages,
    { temperature, maxTokens }
  );

  return c.json(response);
});

app.post('/api/ai/dynamic', async (c) => {
  const { routeConfig, messages, metadata } = await c.req.json();
  const ai = new AIGatewayClient(c.env);

  const response = await ai.runWithDynamicRoute(routeConfig, messages, metadata);
  return c.json(response);
});

app.get('/api/ai/models', async (c) => {
  const ai = new AIGatewayClient(c.env);
  const models = ai.getWorkersAIModels();
  return c.json({ models });
});

app.post('/api/ai/embedding', async (c) => {
  const { text, model } = await c.req.json();
  const ai = new AIGatewayClient(c.env);

  const embedding = await ai.getEmbedding(text, model);
  return c.json({ embedding });
});

app.get('/api/ai/logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const ai = new AIGatewayClient(c.env);
  const logs = await ai.getLogs({ limit, offset });

  return c.json(logs);
});

app.post('/api/ai/feedback/:logId', async (c) => {
  const logId = c.req.param('logId');
  const feedback = await c.req.json();

  const ai = new AIGatewayClient(c.env);
  const success = await ai.sendFeedback(logId, feedback);

  return c.json({ success });
});

// ==================== Queue Consumer ====================

export default {
  fetch: app.fetch,

  // Queue consumer for task processing
  async queue(batch: MessageBatch<Task>, env: Env): Promise<void> {
    const orchestrator = new AgentOrchestrator(env);
    await orchestrator.initialize();

    for (const message of batch.messages) {
      try {
        await orchestrator.executeTask(message.body);
        message.ack();
      } catch (error) {
        console.error('Task execution failed:', error);
        message.retry();
      }
    }
  },

  // Scheduled handler for periodic tasks
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Running scheduled tasks...');

    // Auto-ingest from R2
    const rag = new RAGSystem(env);
    await rag.watchR2Bucket();

    // Sync Docker Hub
    const docker = new DockerHubClient(env);
    const repos = await env.DB.prepare(
      'SELECT DISTINCT repository FROM docker_images WHERE auto_deploy = 1'
    ).all();

    for (const repo of repos.results) {
      await docker.watchRepository(repo.repository as string, env.DB, async (image) => {
        console.log(`Docker image updated: ${image.repository}:${image.tag}`);
      });
    }

    // Health check MCP servers
    const mcp = new MCPClient(env);
    await mcp.initialize();
    await mcp.healthCheck();
  },
};

// Export Durable Objects
export { AgentState, SSHSession };
