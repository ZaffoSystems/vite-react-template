import { Env, Message } from '../types/env';
import { AIGatewayClient } from '../lib/ai-gateway';

/**
 * Code Generation Agent
 * Generates actual, deployable Cloudflare Worker code from natural language
 */
export class CodeGeneratorAgent {
  private ai: AIGatewayClient;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.ai = new AIGatewayClient(env);
  }

  /**
   * Generate worker code from natural language description
   */
  async generateWorker(request: {
    description: string;
    bindings?: string[];
    mcpServers?: string[];
    requirements?: string[];
  }): Promise<{
    code: string;
    bindings: any;
    name: string;
    routes?: string[];
  }> {
    const systemPrompt = `You are an expert Cloudflare Workers developer. Generate production-ready Worker code.

RULES:
- Generate ONLY valid TypeScript code for Cloudflare Workers
- Use Hono framework for routing
- Include proper types and error handling
- Code must be deployable as-is
- Return ONLY the code, no explanations
- Use export default for the worker
- Include all necessary imports

Available bindings: D1, KV, R2, Queues, AI, Vectorize
Available MCP servers: ${request.mcpServers?.join(', ') || 'none'}
Requested bindings: ${request.bindings?.join(', ') || 'none'}

Generate code that:
${request.description}

${request.requirements?.map(r => `- ${r}`).join('\n') || ''}`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the Cloudflare Worker code for: ${request.description}` },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      {
        model: 'dynamic/RE_Ant', // Your dynamic route
        temperature: 0.2,
        maxTokens: 4096
      }
    );

    if (!response.success) {
      throw new Error('Failed to generate code');
    }

    const generatedText = response.result?.response || '';

    // Extract code from response
    let code = this.extractCode(generatedText);

    // Generate worker name
    const name = this.generateWorkerName(request.description);

    // Analyze required bindings
    const bindings = this.analyzeBindings(code, request.bindings || []);

    // Extract routes if any
    const routes = this.extractRoutes(request.description);

    return {
      code,
      bindings,
      name,
      routes,
    };
  }

  /**
   * Generate sub-agent worker
   */
  async generateSubAgent(request: {
    purpose: string;
    capabilities: string[];
    mcpServers?: string[];
  }): Promise<{
    code: string;
    bindings: any;
    name: string;
  }> {
    const systemPrompt = `You are creating an autonomous sub-agent as a Cloudflare Worker.

Generate a Worker that:
- Acts as an intelligent agent for: ${request.purpose}
- Has capabilities: ${request.capabilities.join(', ')}
- Can make decisions and take actions
- Integrates with MCP servers: ${request.mcpServers?.join(', ') || 'none'}
- Reports back to master agent
- Uses Cloudflare AI for decision making

Include:
- Agent decision loop
- Task execution
- Error handling and retry logic
- Communication with master agent via Queue
- State management via Durable Object

Generate production-ready TypeScript code.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create sub-agent worker for: ${request.purpose}` },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      {
        model: 'dynamic/RE_Ant', // Your dynamic route
        temperature: 0.3,
        maxTokens: 4096
      }
    );

    if (!response.success) {
      throw new Error('Failed to generate sub-agent code');
    }

    const code = this.extractCode(response.result?.response || '');
    const name = this.generateWorkerName(`subagent-${request.purpose}`);
    const bindings = this.analyzeBindings(code, ['AI', 'QUEUE']);

    return { code, bindings, name };
  }

  /**
   * Extract code from AI response
   */
  private extractCode(text: string): string {
    // Try to extract code from markdown
    const codeBlockMatch = text.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, check if entire response is code
    if (text.includes('export default') || text.includes('addEventListener')) {
      return text.trim();
    }

    // Generate basic worker if extraction fails
    return this.generateFallbackWorker();
  }

  /**
   * Analyze required bindings from code
   */
  private analyzeBindings(code: string, requestedBindings: string[]): any {
    const bindings: any = {};

    // Check for each binding type in code
    if (code.includes('env.DB') || requestedBindings.includes('DB')) {
      bindings.d1_databases = [{ binding: 'DB', database_name: 'worker-db' }];
    }

    if (code.includes('env.KV') || requestedBindings.includes('KV')) {
      bindings.kv_namespaces = [{ binding: 'KV' }];
    }

    if (code.includes('env.R2') || requestedBindings.includes('R2')) {
      bindings.r2_buckets = [{ binding: 'R2', bucket_name: 'worker-storage' }];
    }

    if (code.includes('env.AI') || requestedBindings.includes('AI')) {
      bindings.ai = { binding: 'AI' };
    }

    if (code.includes('env.VECTORIZE') || requestedBindings.includes('VECTORIZE')) {
      bindings.vectorize = [{ binding: 'VECTORIZE', index_name: 'worker-index' }];
    }

    if (code.includes('env.QUEUE') || code.includes('env.TASK_QUEUE') || requestedBindings.includes('QUEUE')) {
      bindings.queues = {
        producers: [{ binding: 'QUEUE', queue: 'worker-queue' }],
      };
    }

    return bindings;
  }

  /**
   * Generate worker name from description
   */
  private generateWorkerName(description: string): string {
    const sanitized = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const timestamp = Date.now().toString(36);
    return `${sanitized}-${timestamp}`;
  }

  /**
   * Extract routes from description
   */
  private extractRoutes(description: string): string[] | undefined {
    const routePatterns = [
      /route[s]?\s+(?:at|on)\s+([^\s]+)/gi,
      /endpoint[s]?\s+(?:at|on)\s+([^\s]+)/gi,
      /path[s]?\s+([^\s]+)/gi,
    ];

    const routes: string[] = [];

    for (const pattern of routePatterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        routes.push(match[1]);
      }
    }

    return routes.length > 0 ? routes : undefined;
  }

  /**
   * Fallback worker generator
   */
  private generateFallbackWorker(): string {
    return `import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Worker deployed successfully',
    timestamp: Date.now(),
  });
});

export default app;`;
  }

  /**
   * Generate worker code with resource bindings
   */
  async generateWorkerCode(description: string, bindings: any[] = []): Promise<string> {
    const bindingNames = bindings.map(b => b.name);
    const bindingTypes = bindings.map(b => b.type);

    const result = await this.generateWorker({
      description,
      bindings: bindingNames,
      mcpServers: [],
      requirements: [`Use these bindings: ${bindingTypes.join(', ')}`],
    });

    return result.code;
  }

  /**
   * Generate web interface code
   */
  async generateWebInterface(request: {
    description: string;
    features: string[];
    apiEndpoints?: string[];
  }): Promise<string> {
    const systemPrompt = `Generate a complete HTML/CSS/JavaScript web interface.

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Modern, responsive design
- Dark theme
- No external dependencies
- Production-ready code

Features needed:
${request.features.map(f => `- ${f}`).join('\n')}

${request.apiEndpoints ? `
API Endpoints to integrate:
${request.apiEndpoints.map(e => `- ${e}`).join('\n')}
` : ''}

Generate ONLY the complete HTML code.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate web interface for: ${request.description}` },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      {
        model: 'dynamic/RE_Ant', // Your dynamic route
        temperature: 0.3,
        maxTokens: 4096
      }
    );

    if (!response.success) {
      throw new Error('Failed to generate web interface');
    }

    return this.extractCode(response.result?.response || '');
  }
}
