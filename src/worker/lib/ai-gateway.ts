import { Env, Message, DynamicRouteConfig, AIGatewayResponse } from '../types/env';

/**
 * Cloudflare AI Gateway Client with Dynamic Routing and Authenticated Headers
 * Fully implements CF AI Gateway features: dynamic routing, rate limiting, budget limiting, BYOK
 */
export class AIGatewayClient {
  private accountId: string;
  private gatewayId: string;
  private token: string;
  private ai: Ai;
  private baseUrl: string;

  constructor(env: Env) {
    this.accountId = env.AI_GATEWAY_ACCOUNT_ID;
    this.gatewayId = env.AI_GATEWAY_ID;
    this.token = env.AI_GATEWAY_TOKEN;
    this.ai = env.AI;
    this.baseUrl = env.AI_GATEWAY_ENDPOINT || 'https://gateway.ai.cloudflare.com';
  }

  /**
   * Run inference using Workers AI binding with AI Gateway integration
   * This uses the native binding which auto-authenticates
   */
  async runWithBinding(
    model: string,
    messages: Message[],
    options: {
      temperature?: number;
      maxTokens?: number;
      skipCache?: boolean;
      stream?: boolean;
    } = {}
  ): Promise<AIGatewayResponse> {
    try {
      const response = await this.ai.run(model, {
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: options.stream ?? false,
      }, {
        gateway: {
          id: this.gatewayId,
          skipCache: options.skipCache ?? false,
        },
      });

      return {
        success: true,
        result: response,
        model,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'AI inference failed',
      };
    }
  }

  /**
   * Run inference with Dynamic Routing
   * Uses authenticated headers and dynamic route selection
   */
  async runWithDynamicRoute(
    routeConfig: DynamicRouteConfig,
    messages: Message[],
    metadata?: Record<string, any>
  ): Promise<AIGatewayResponse> {
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/workers-ai/${routeConfig.model}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.token}`,
    };

    // Add dynamic route header
    if (routeConfig.name) {
      headers['cf-aig-dynamic-route'] = routeConfig.name;
    }

    // Add metadata for conditional routing
    const combinedMetadata = {
      ...routeConfig.metadata,
      ...metadata,
      timestamp: Date.now(),
    };
    headers['cf-aig-metadata'] = JSON.stringify(combinedMetadata);

    // Add rate limiting headers if configured
    if (routeConfig.rateLimit) {
      headers['cf-aig-rate-limit'] = JSON.stringify({
        requests_per_minute: routeConfig.rateLimit.requestsPerMinute,
        fallback_on_limit: routeConfig.rateLimit.fallbackOnLimit,
      });
    }

    // Add budget limiting headers if configured
    if (routeConfig.budgetLimit) {
      headers['cf-aig-budget-limit'] = JSON.stringify({
        max_cost_per_day: routeConfig.budgetLimit.maxCostPerDay,
        fallback_on_exceeded: routeConfig.budgetLimit.fallbackOnExceeded,
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limit or budget exceeded with fallback
        if (response.status === 429 && routeConfig.fallbackModel) {
          return this.runWithFallback(routeConfig.fallbackModel, messages, metadata);
        }

        return {
          success: false,
          error: `AI Gateway error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();

      // Extract log ID from headers for feedback
      const logId = response.headers.get('cf-aig-log-id');

      return {
        success: true,
        result: data,
        logId: logId || undefined,
        model: routeConfig.model,
        usage: data.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Fallback handler for rate/budget limits
   */
  private async runWithFallback(
    fallbackModel: string,
    messages: Message[],
    metadata?: Record<string, any>
  ): Promise<AIGatewayResponse> {
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/workers-ai/${fallbackModel}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${this.token}`,
        'cf-aig-metadata': JSON.stringify({ ...metadata, fallback: true }),
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Fallback also failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      result: data,
      model: fallbackModel,
      usage: data.usage,
    };
  }

  /**
   * Run inference with external provider through AI Gateway (using BYOK)
   * Supports: OpenAI, Anthropic, Azure, etc.
   */
  async runWithExternalProvider(
    provider: string,
    endpoint: string,
    payload: any,
    options?: {
      providerKey?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AIGatewayResponse> {
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/${provider}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.token}`,
    };

    // Add provider-specific auth (BYOK stored in CF)
    if (options?.providerKey) {
      if (provider === 'openai') {
        headers['Authorization'] = `Bearer ${options.providerKey}`;
      } else if (provider === 'anthropic') {
        headers['x-api-key'] = options.providerKey;
        headers['anthropic-version'] = '2023-06-01';
      }
    }

    // Add metadata
    if (options?.metadata) {
      headers['cf-aig-metadata'] = JSON.stringify(options.metadata);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Provider error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      const logId = response.headers.get('cf-aig-log-id');

      return {
        success: true,
        result: data,
        logId: logId || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Use Compat endpoint with dynamic routing - MATCHES YOUR ACTUAL CF AI GATEWAY SETUP
   * Endpoint: /compat/chat/completions
   * Model format: dynamic/ROUTE_NAME
   *
   * This is the CORRECT method matching your curl command:
   * curl https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/compat/chat/completions \
   *   --header 'cf-aig-authorization: Bearer {token}' \
   *   --data '{"model": "dynamic/RE_Ant", "messages": [...]}'
   */
  async compatChatCompletion(
    messages: Message[],
    options?: {
      model?: string; // Use "dynamic/ROUTE_NAME" for dynamic routing, or specific model
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<AIGatewayResponse> {
    // Use /compat endpoint - this is OpenAI-compatible with CF AI Gateway features
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/compat/chat/completions`;

    const payload = {
      model: options?.model || 'dynamic/default', // Support dynamic routing
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: options?.stream ?? false,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.token}`, // Correct header name
    };

    if (options?.metadata) {
      headers['cf-aig-metadata'] = JSON.stringify(options.metadata);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Chat completion failed: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      const logId = response.headers.get('cf-aig-log-id');

      // Extract response based on OpenAI format
      const content = data.choices?.[0]?.message?.content || data.response || data;

      return {
        success: true,
        result: { response: content, raw: data },
        logId: logId || undefined,
        model: data.model || options?.model,
        usage: data.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Use OpenAI-compatible endpoint through AI Gateway (legacy method)
   * Note: For your setup, use compatChatCompletion() instead
   */
  async chatCompletion(
    messages: Message[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<AIGatewayResponse> {
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/openai/chat/completions`;

    const payload = {
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: options?.stream ?? false,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.token}`,
    };

    if (options?.metadata) {
      headers['cf-aig-metadata'] = JSON.stringify(options.metadata);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Chat completion failed: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        result: data,
        logId: response.headers.get('cf-aig-log-id') || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send feedback to AI Gateway for learning and optimization
   */
  async sendFeedback(
    logId: string,
    feedback: {
      score?: number;
      comment?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/logs/${logId}/feedback`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(feedback),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve logs for analysis and learning agent
   */
  async getLogs(options: {
    limit?: number;
    offset?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.status) params.set('status', options.status);
    if (options.startDate) params.set('start_date', options.startDate.toISOString());
    if (options.endDate) params.set('end_date', options.endDate.toISOString());

    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/logs?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'cf-aig-authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `Failed to retrieve logs: ${response.status}` };
      }

      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI Gateway analytics
   */
  async getAnalytics(options: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'hour' | 'day';
  }): Promise<any> {
    const params = new URLSearchParams({
      start_date: options.startDate.toISOString(),
      end_date: options.endDate.toISOString(),
      group_by: options.groupBy || 'day',
    });

    const url = `${this.baseUrl}/v1/${this.accountId}/${this.gatewayId}/analytics?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'cf-aig-authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `Analytics request failed: ${response.status}` };
      }

      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List available Workers AI models
   */
  getWorkersAIModels(): string[] {
    return [
      '@cf/meta/llama-3.1-8b-instruct-fast',
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3-8b-instruct',
      '@cf/meta/llama-2-7b-chat-int8',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/mistral/mistral-7b-instruct-v0.2-lora',
      '@cf/deepseek-ai/deepseek-math-7b-instruct',
      '@cf/deepseek-ai/deepseek-coder-6.7b-instruct-awq',
      '@cf/qwen/qwen1.5-14b-chat-awq',
      '@cf/qwen/qwen1.5-7b-chat-awq',
      '@cf/defog/sqlcoder-7b-2',
      '@cf/thebloke/discolm-german-7b-v1-awq',
    ];
  }

  /**
   * Get embedding from text using Workers AI
   */
  async getEmbedding(text: string, model: string = '@cf/baai/bge-base-en-v1.5'): Promise<number[] | null> {
    try {
      const response = await this.ai.run(model, { text }, {
        gateway: { id: this.gatewayId },
      }) as any;

      return response?.data?.[0] || null;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return null;
    }
  }
}
