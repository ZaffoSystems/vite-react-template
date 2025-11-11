// AIGatewayClient - Authenticated AI Gateway integration with dynamic routing and fallbacks
import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  authToken: string;
  defaultRoute: string;
  fallbackRoutes?: string[];
}

export interface AIRequest {
  model: string;  // dynamic/RE_Ant, dynamic/support, etc.
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIGatewayClient {
  private config: AIGatewayConfig;
  private baseUrl: string;

  constructor(config: AIGatewayConfig) {
    this.config = config;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}`;
  }

  // Make authenticated request with dynamic routing
  async chat(request: AIRequest, options?: { timeout?: number }): Promise<AIResponse> {
    const url = `${this.baseUrl}/compat/chat/completions`;
    
    console.log(`🌐 [AI Gateway] Calling: ${request.model}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'cf-aig-authorization': `Bearer ${this.config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json<AIResponse>();
      console.log(`✅ [AI Gateway] Response from: ${result.model}`);
      return result;
    } catch (error: any) {
      console.error(`❌ [AI Gateway] Error:`, error);
      
      // Try fallback routes if configured
      if (this.config.fallbackRoutes && this.config.fallbackRoutes.length > 0) {
        return this.tryFallback(request, options);
      }
      
      throw error;
    }
  }

  // Fallback logic - try alternative routes
  private async tryFallback(request: AIRequest, options?: { timeout?: number }): Promise<AIResponse> {
    for (const fallbackRoute of this.config.fallbackRoutes || []) {
      console.log(`🔄 [AI Gateway] Trying fallback: ${fallbackRoute}`);
      
      try {
        const fallbackRequest = { ...request, model: fallbackRoute };
        const response = await this.chat(fallbackRequest, options);
        
        console.log(`✅ [AI Gateway] Fallback succeeded: ${fallbackRoute}`);
        return response;
      } catch (error) {
        console.error(`❌ [AI Gateway] Fallback ${fallbackRoute} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All AI Gateway routes failed');
  }

  // Validate that a model/route is allowed (security guardrail)
  static validateRoute(route: string, allowedRoutes: string[]): boolean {
    // Only allow pre-approved routes
    return allowedRoutes.includes(route);
  }

  // Get available routes (for UI dropdown)
  static getAvailableRoutes(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: 'dynamic/RE_Ant', name: 'Anthropic (Primary)', description: 'Claude with fallback' },
      { id: 'dynamic/support', name: 'Support Model', description: 'Fast responses' },
      { id: 'dynamic/research', name: 'Research Model', description: 'Deep analysis' },
      { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Workers AI', description: 'Cloudflare hosted' },
    ];
  }
}

// Factory function to create client from environment
export function createAIGatewayClient(env: Env): AIGatewayClient {
  // Get config from environment variables or secrets
  const config: AIGatewayConfig = {
    accountId: env.AI_GATEWAY_ACCOUNT_ID || '6f97fb315b8434a5344db8ad9723f70c',
    gatewayId: env.AI_GATEWAY_ID || 'z-gateway',
    authToken: env.AI_GATEWAY_TOKEN || '',  // Set via: wrangler secret put AI_GATEWAY_TOKEN
    defaultRoute: env.AI_GATEWAY_DEFAULT_ROUTE || 'dynamic/RE_Ant',
    fallbackRoutes: [
      '@cf/meta/llama-3.1-8b-instruct',  // Workers AI as fallback
      '@cf/meta/llama-3-8b-instruct',     // Secondary fallback
    ],
  };

  return new AIGatewayClient(config);
}
