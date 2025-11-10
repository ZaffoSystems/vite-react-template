import { Env } from '../types/env';

/**
 * REAL Awesome Integrations - NO FAKE MCP CLIENT
 * Direct HTTP/REST API calls to actual services
 * 100% FUNCTIONAL in Cloudflare Workers
 */

export class RealAwesomeIntegrations {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  // ==================== GITHUB - REAL REST API ====================

  async github_listRepos(owner?: string): Promise<any> {
    if (!this.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const user = owner || this.env.GITHUB_OWNER || 'user';
    const response = await fetch(`https://api.github.com/users/${user}/repos`, {
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  }

  async github_searchCode(query: string): Promise<any> {
    if (!this.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const response = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  }

  async github_createIssue(owner: string, repo: string, title: string, body: string): Promise<any> {
    if (!this.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  }

  async github_readFile(owner: string, repo: string, path: string): Promise<any> {
    if (!this.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    // Decode base64 content
    const content = atob(data.content);
    return { ...data, decoded_content: content };
  }

  // ==================== SLACK - REAL WEB API ====================

  async slack_sendMessage(channel: string, text: string): Promise<any> {
    if (!this.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, text })
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  async slack_listChannels(): Promise<any> {
    if (!this.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${this.env.SLACK_BOT_TOKEN}`
      }
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data.channels;
  }

  async slack_readHistory(channel: string, limit: number = 100): Promise<any> {
    if (!this.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    const response = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.env.SLACK_BOT_TOKEN}`
      }
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data.messages;
  }

  // ==================== BROWSER - CLOUDFLARE BROWSER RENDERING ====================

  async browser_screenshot(url: string, fullPage: boolean = false): Promise<any> {
    // Use Cloudflare Browser Rendering API
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser/screenshot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        full_page: fullPage,
        format: 'png'
      })
    });

    if (!response.ok) {
      throw new Error(`Browser API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  }

  async browser_navigate(url: string): Promise<any> {
    // Use Cloudflare Browser Rendering to fetch page
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser/fetch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Browser API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== SEARCH - REAL APIS ====================

  async search_brave(query: string): Promise<any> {
    if (!this.env.BRAVE_API_KEY) {
      throw new Error('BRAVE_API_KEY not configured');
    }

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': this.env.BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    return await response.json();
  }

  async search_google(query: string): Promise<any> {
    if (!this.env.GOOGLE_API_KEY || !this.env.GOOGLE_CX) {
      throw new Error('GOOGLE_API_KEY and GOOGLE_CX not configured');
    }

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${this.env.GOOGLE_API_KEY}&cx=${this.env.GOOGLE_CX}&q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    return await response.json();
  }

  async search_tavily(query: string): Promise<any> {
    if (!this.env.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: this.env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced'
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== NOTION - REAL API ====================

  async notion_queryDatabase(databaseId: string, filter?: any): Promise<any> {
    if (!this.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN not configured');
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter: filter || {} })
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    return await response.json();
  }

  async notion_createPage(parentId: string, properties: any): Promise<any> {
    if (!this.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN not configured');
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: parentId },
        properties
      })
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== LINEAR - REAL API ====================

  async linear_createIssue(title: string, description: string, teamId: string): Promise<any> {
    if (!this.env.LINEAR_API_KEY) {
      throw new Error('LINEAR_API_KEY not configured');
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': this.env.LINEAR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue {
                id
                title
                url
              }
            }
          }
        `,
        variables: {
          input: {
            title,
            description,
            teamId
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== STRIPE - REAL API ====================

  async stripe_createPaymentIntent(amount: number, currency: string = 'usd'): Promise<any> {
    if (!this.env.STRIPE_API_KEY) {
      throw new Error('STRIPE_API_KEY not configured');
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.STRIPE_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `amount=${amount}&currency=${currency}`
    });

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status}`);
    }

    return await response.json();
  }

  async stripe_listCustomers(limit: number = 10): Promise<any> {
    if (!this.env.STRIPE_API_KEY) {
      throw new Error('STRIPE_API_KEY not configured');
    }

    const response = await fetch(`https://api.stripe.com/v1/customers?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.env.STRIPE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== YOUTUBE - REAL API ====================

  async youtube_search(query: string, maxResults: number = 10): Promise<any> {
    if (!this.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${this.env.YOUTUBE_API_KEY}&q=${encodeURIComponent(query)}&part=snippet&maxResults=${maxResults}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== AIRTABLE - REAL API ====================

  async airtable_listRecords(tableName: string): Promise<any> {
    if (!this.env.AIRTABLE_API_KEY || !this.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID not configured');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${this.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.env.AIRTABLE_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    return await response.json();
  }

  async airtable_createRecord(tableName: string, fields: Record<string, any>): Promise<any> {
    if (!this.env.AIRTABLE_API_KEY || !this.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID not configured');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${this.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    return await response.json();
  }

  // ==================== SERVICES THAT CANNOT WORK IN WORKERS ====================

  async postgres_query(sql: string, params?: any[]): Promise<any> {
    throw new Error('Direct Postgres not supported in Workers. Use Cloudflare Hyperdrive or D1 instead.');
  }

  async mysql_query(sql: string): Promise<any> {
    throw new Error('Direct MySQL not supported in Workers. Use Cloudflare D1 instead.');
  }

  async mongodb_find(collection: string, query: any): Promise<any> {
    throw new Error('Direct MongoDB not supported in Workers. Use HTTP API or Atlas Data API.');
  }

  async ssh_connect(host: string): Promise<any> {
    throw new Error('SSH not supported in Workers. No TCP sockets available.');
  }

  async docker_listContainers(): Promise<any> {
    throw new Error('Docker not supported in Workers. Use Cloudflare Container Registry API or external Docker API.');
  }

  async kubernetes_getPods(namespace: string): Promise<any> {
    throw new Error('Direct K8s not supported. Use Kubernetes REST API with fetch() instead.');
  }
}
