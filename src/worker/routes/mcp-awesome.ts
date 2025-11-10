import { Hono } from 'hono';
import { Env } from '../types/env';
import { AwesomeMCPManager, AWESOME_MCP_SERVERS } from '../lib/mcp-awesome-servers';

const app = new Hono<{ Bindings: Env }>();

/**
 * List all available awesome MCP servers
 */
app.get('/servers', async (c) => {
  try {
    const awesomeMCP = new AwesomeMCPManager(c.env);
    const servers = awesomeMCP.getAvailableServers();

    return c.json({
      success: true,
      servers,
      total: servers.length,
      categories: [...new Set(servers.map(s => s.category))],
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Get servers by category
 */
app.get('/servers/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const awesomeMCP = new AwesomeMCPManager(c.env);
    const servers = awesomeMCP.getServersByCategory(category);

    return c.json({
      success: true,
      category,
      servers,
      count: servers.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Initialize awesome MCP servers
 */
app.post('/init', async (c) => {
  try {
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const connectedServers = awesomeMCP.getConnectedServers();

    return c.json({
      success: true,
      connected: connectedServers.length,
      servers: connectedServers.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        connected: true,
      })),
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Get connection status of all servers
 */
app.get('/status', async (c) => {
  try {
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const connectedServers = awesomeMCP.getConnectedServers();
    const connectedIds = new Set(connectedServers.map(s => s.id));

    const status = AWESOME_MCP_SERVERS.reduce((acc, server) => {
      acc[server.id] = connectedIds.has(server.id);
      return acc;
    }, {} as Record<string, boolean>);

    return c.json({
      success: true,
      status,
      connected: connectedServers.length,
      total: AWESOME_MCP_SERVERS.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Call a tool on an awesome MCP server
 */
app.post('/call', async (c) => {
  try {
    const { serverId, toolName, params } = await c.req.json();

    if (!serverId || !toolName) {
      return c.json({
        success: false,
        error: 'serverId and toolName are required',
      }, 400);
    }

    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.callTool(serverId, toolName, params || {});

    return c.json({
      success: true,
      serverId,
      toolName,
      result,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GitHub integration endpoints
 */
app.post('/github/repos', async (c) => {
  try {
    const { owner } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.github_listRepos(owner);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/github/search', async (c) => {
  try {
    const { query } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.github_searchCode(query);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Slack integration endpoints
 */
app.post('/slack/send', async (c) => {
  try {
    const { channel, text } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.slack_sendMessage(channel, text);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/slack/channels', async (c) => {
  try {
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.slack_listChannels();

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Database integration endpoints
 */
app.post('/postgres/query', async (c) => {
  try {
    const { sql, params } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.postgres_query(sql, params);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Filesystem integration endpoints
 */
app.post('/filesystem/read', async (c) => {
  try {
    const { path } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.filesystem_readFile(path);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/filesystem/write', async (c) => {
  try {
    const { path, content } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.filesystem_writeFile(path, content);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Browser automation endpoints
 */
app.post('/browser/navigate', async (c) => {
  try {
    const { url } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.browser_navigate(url);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/browser/screenshot', async (c) => {
  try {
    const { url, fullPage } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.browser_screenshot(url, fullPage);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Search endpoints
 */
app.post('/search/web', async (c) => {
  try {
    const { query, provider } = await c.req.json();
    const awesomeMCP = new AwesomeMCPManager(c.env);
    await awesomeMCP.initialize();

    const result = await awesomeMCP.search_web(query, provider);

    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
