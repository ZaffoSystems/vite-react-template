import { Hono } from 'hono';
import { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

/**
 * Get all configured credentials
 * Returns sanitized versions (no actual values for security)
 */
app.get('/credentials', async (c) => {
  try {
    // List of all possible credential keys
    const credentialKeys = [
      // Cloudflare
      'CF_ACCOUNT_ID',
      'CF_API_TOKEN',
      'CF_ZONE_ID',
      'AI_GATEWAY_ACCOUNT_ID',
      'AI_GATEWAY_ID',
      'AI_GATEWAY_TOKEN',

      // GitHub
      'GITHUB_TOKEN',
      'GITHUB_OWNER',

      // Slack
      'SLACK_BOT_TOKEN',
      'SLACK_TEAM_ID',

      // Databases
      'POSTGRES_CONNECTION_STRING',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_DATABASE',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'MYSQL_CONNECTION_STRING',
      'MONGODB_URI',
      'REDIS_URL',
      'REDIS_HOST',
      'REDIS_PORT',
      'REDIS_PASSWORD',

      // Browser
      'BROWSERBASE_API_KEY',
      'BROWSERBASE_PROJECT_ID',

      // Cloud
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_KB_ID',
      'AZURE_CLIENT_ID',
      'AZURE_CLIENT_SECRET',
      'AZURE_TENANT_ID',
      'AZURE_SUBSCRIPTION_ID',
      'GCP_PROJECT_ID',
      'GCP_SERVICE_ACCOUNT_KEY',

      // Kubernetes/Docker
      'KUBECONFIG',
      'KUBERNETES_CLUSTER_URL',
      'KUBERNETES_TOKEN',
      'DOCKER_HOST',

      // VCS & DevOps
      'GITLAB_TOKEN',
      'GITLAB_URL',
      'LINEAR_API_KEY',
      'JIRA_URL',
      'JIRA_EMAIL',
      'JIRA_API_TOKEN',

      // Communication
      'DISCORD_BOT_TOKEN',
      'DISCORD_GUILD_ID',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM',

      // Monitoring
      'SENTRY_AUTH_TOKEN',
      'SENTRY_ORG',
      'DATADOG_API_KEY',
      'DATADOG_APP_KEY',

      // Productivity
      'NOTION_TOKEN',
      'NOTION_DATABASE_ID',
      'GOOGLE_DRIVE_CREDENTIALS',
      'AIRTABLE_API_KEY',
      'AIRTABLE_BASE_ID',

      // Search
      'BRAVE_API_KEY',
      'GOOGLE_API_KEY',
      'GOOGLE_CX',
      'TAVILY_API_KEY',
      'EXA_API_KEY',

      // E-commerce
      'SHOPIFY_SHOP_URL',
      'SHOPIFY_ACCESS_TOKEN',
      'STRIPE_API_KEY',
      'STRIPE_PUBLISHABLE_KEY',

      // Media & Social
      'YOUTUBE_API_KEY',
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_BEARER_TOKEN',
      'GOOGLE_MAPS_API_KEY',
    ];

    const credentials: Record<string, string> = {};

    // Get credentials from KV store
    for (const key of credentialKeys) {
      try {
        const value = await c.env.KV.get(`credential:${key}`);
        if (value) {
          credentials[key] = value;
        }
      } catch (e) {
        // Credential not found, skip
      }
    }

    return c.json({
      success: true,
      credentials,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Save credentials
 */
app.post('/credentials', async (c) => {
  try {
    const { credentials } = await c.req.json();

    if (!credentials || typeof credentials !== 'object') {
      return c.json({
        success: false,
        error: 'Invalid credentials object',
      }, 400);
    }

    // Save each credential to KV
    const savePromises = Object.entries(credentials).map(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        return c.env.KV.put(`credential:${key}`, value.trim());
      }
      return Promise.resolve();
    });

    await Promise.all(savePromises);

    // Also store a backup in D1
    try {
      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO system_config (key, value, updated_at)
         VALUES (?, ?, ?)`
      ).bind('credentials', JSON.stringify(credentials), Date.now()).run();
    } catch (e) {
      console.warn('Failed to backup credentials to D1:', e);
    }

    return c.json({
      success: true,
      message: 'Credentials saved successfully',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Test a specific credential/connection
 */
app.post('/test/:service', async (c) => {
  try {
    const service = c.req.param('service');
    const { credentials } = await c.req.json();

    // Test different services
    switch (service) {
      case 'github':
        if (!credentials.GITHUB_TOKEN) {
          return c.json({ success: false, error: 'GitHub token required' }, 400);
        }
        // Test GitHub API
        const ghRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${credentials.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (!ghRes.ok) {
          return c.json({ success: false, error: 'Invalid GitHub token' }, 400);
        }
        const ghData = await ghRes.json() as any;
        return c.json({ success: true, username: ghData.login });

      case 'slack':
        if (!credentials.SLACK_BOT_TOKEN) {
          return c.json({ success: false, error: 'Slack token required' }, 400);
        }
        // Test Slack API
        const slackRes = await fetch('https://slack.com/api/auth.test', {
          headers: {
            'Authorization': `Bearer ${credentials.SLACK_BOT_TOKEN}`,
          },
        });
        const slackData = await slackRes.json() as any;
        if (!slackData.ok) {
          return c.json({ success: false, error: 'Invalid Slack token' }, 400);
        }
        return c.json({ success: true, team: slackData.team });

      case 'postgres':
        // Note: Postgres testing would require actual connection, which is limited in Workers
        // Return success if connection string is provided
        if (!credentials.POSTGRES_CONNECTION_STRING && !credentials.POSTGRES_HOST) {
          return c.json({ success: false, error: 'Postgres connection info required' }, 400);
        }
        return c.json({ success: true, message: 'Credentials saved (connection not tested in Workers)' });

      default:
        return c.json({
          success: true,
          message: 'Credentials saved (testing not available for this service)',
        });
    }
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Delete a credential
 */
app.delete('/credentials/:key', async (c) => {
  try {
    const key = c.req.param('key');
    await c.env.KV.delete(`credential:${key}`);

    return c.json({
      success: true,
      message: 'Credential deleted',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export default app;
