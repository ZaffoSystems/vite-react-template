import { Env, Message } from '../types/env';
import { AIGatewayClient } from '../lib/ai-gateway';
import { CloudflareAPI } from '../lib/cloudflare-api';
import { CodeGeneratorAgent } from './code-generator';
import { CloudflareMCPManager } from '../lib/mcp-cloudflare-servers';
import { AwesomeMCPManager } from '../lib/mcp-awesome-servers';

interface WorkerDeployment {
  name: string;
  code: string;
  bindings: any;
  routes?: string[];
  deployed: boolean;
  url?: string;
}

/**
 * Master Control Agent
 * Orchestrates sub-agents, generates and deploys workers, manages entire system
 */
export class MasterControlAgent {
  private env: Env;
  private ai: AIGatewayClient;
  private cfAPI: CloudflareAPI;
  private codeGen: CodeGeneratorAgent;
  private mcpManager: CloudflareMCPManager;
  private awesomeMCP: AwesomeMCPManager;

  constructor(env: Env) {
    this.env = env;
    this.ai = new AIGatewayClient(env);
    this.cfAPI = new CloudflareAPI(env);
    this.codeGen = new CodeGeneratorAgent(env);
    this.mcpManager = new CloudflareMCPManager(env);
    this.awesomeMCP = new AwesomeMCPManager(env);
  }

  /**
   * Process natural language command and execute - FULLY EXTENSIBLE
   * Can handle ANY command by reasoning through the request
   */
  async processCommand(command: string): Promise<any> {
    // Use AI to plan execution steps
    const plan = await this.createExecutionPlan(command);

    // Execute plan steps
    const results = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeStep(step, results);
        results.push({ step: step.action, result, success: true });
      } catch (error: any) {
        results.push({ step: step.action, error: error.message, success: false });

        // If step fails, ask AI for recovery
        if (step.critical) {
          const recovery = await this.recoverFromFailure(step, error, command);
          if (recovery) {
            results.push({ step: 'recovery', result: recovery, success: true });
          }
        }
      }
    }

    return {
      command,
      plan,
      execution: results,
      success: results.every(r => r.success),
    };
  }

  /**
   * Create dynamic execution plan for any command
   */
  private async createExecutionPlan(command: string): Promise<any> {
    const systemPrompt = `You are a master control agent planning how to execute commands.

Analyze the command and create a step-by-step execution plan.

Available capabilities:
- generate_code: Generate any type of code (Workers, web interfaces, scripts)
- deploy_worker: Deploy code to Cloudflare Workers
- provision_resource: Create D1, KV, R2, Queue, Vectorize resources
- call_mcp: Call any MCP server from 60+ available servers
- call_cf_mcp: Call Cloudflare-specific MCP servers (AI Gateway, Radar, Browser, Container, etc.)
- call_awesome_mcp: Call awesome community MCP servers (GitHub, Slack, Postgres, Kubernetes, etc.)
- create_subagent: Spawn autonomous sub-agents
- query_data: Query databases or APIs
- analyze: Perform analysis tasks
- coordinate: Coordinate multiple sub-agents

Available MCP Servers:
CLOUDFLARE: AI Gateway, Radar, DNS, Documentation, Workers, Logs, Logpush, AutoRAG, Audit, Browser, Container, DEM, CASB
AWESOME: GitHub, Slack, Filesystem, Git, Memory, Postgres, MySQL, MongoDB, Redis, Puppeteer, Playwright, Kubernetes, Docker, AWS, Azure, GCP, Notion, Linear, Jira, Google Drive, Brave Search, Google Search, Stripe, Shopify, YouTube, Twitter, Discord, and 40+ more

Return JSON execution plan:
{
  "goal": "what to accomplish",
  "steps": [
    {
      "action": "capability name",
      "description": "what this step does",
      "parameters": {...},
      "critical": true/false,
      "dependencies": ["previous step indices"]
    }
  ]
}

Be creative and thorough. Generate detailed plans for complex requests.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Plan execution for: ${command}` },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      {
        model: 'dynamic/RE_Ant', // Your dynamic route
        temperature: 0.3,
        maxTokens: 2048
      }
    );

    if (!response.success) {
      // Fallback plan
      return {
        goal: command,
        steps: [
          {
            action: 'generate_code',
            description: 'Generate code for request',
            parameters: { description: command },
            critical: true,
            dependencies: [],
          },
          {
            action: 'deploy_worker',
            description: 'Deploy generated code',
            parameters: {},
            critical: true,
            dependencies: [0],
          },
        ],
      };
    }

    try {
      const jsonMatch = response.result?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse plan:', e);
    }

    // Fallback
    return {
      goal: command,
      steps: [
        { action: 'generate_code', description: command, parameters: { description: command }, critical: true, dependencies: [] },
        { action: 'deploy_worker', description: 'Deploy code', parameters: {}, critical: true, dependencies: [0] },
      ],
    };
  }

  /**
   * Execute a single step - dynamic routing to correct capability
   */
  private async executeStep(step: any, previousResults: any[]): Promise<any> {
    const params = step.parameters || {};

    // Get dependencies
    for (const depIndex of step.dependencies || []) {
      if (previousResults[depIndex]?.result) {
        Object.assign(params, { previous: previousResults[depIndex].result });
      }
    }

    switch (step.action) {
      case 'generate_code':
        return await this.codeGen.generateWorker({
          description: params.description || step.description,
          bindings: params.bindings,
          mcpServers: params.mcpServers,
          requirements: params.requirements,
        });

      case 'deploy_worker':
        const code = params.previous?.code || params.code;
        const bindings = params.previous?.bindings || params.bindings || {};
        const name = params.previous?.name || params.name || this.generateWorkerName('dynamic');

        await this.provisionResources(bindings);
        await this.cfAPI.deployWorker(name, code, bindings);

        return {
          deployed: true,
          name,
          url: `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`,
        };

      case 'provision_resource':
        await this.provisionResources(params);
        return { provisioned: true, resources: params };

      case 'call_mcp':
      case 'call_cf_mcp':
        await this.mcpManager.initialize();
        const server = params.server || 'E2B';
        const method = params.method;

        // Dynamically call MCP method
        if (server === 'E2B' && method === 'create_sandbox') {
          return await this.mcpManager.container_createSandbox(params.config || {});
        } else if (server === 'Browser' && method === 'fetch_page') {
          return await this.mcpManager.browserRendering_fetchPage(params.url, params.options);
        }

        return { called: server, method, params };

      case 'call_awesome_mcp':
        await this.awesomeMCP.initialize();
        const awesomeServer = params.server;
        const awesomeMethod = params.method;
        const awesomeParams = params.params || {};

        // Route to appropriate awesome MCP server
        if (awesomeServer === 'github' || awesomeServer === 'mcp-github') {
          if (awesomeMethod === 'list_repos') return await this.awesomeMCP.github_listRepos(awesomeParams.owner);
          if (awesomeMethod === 'read_file') return await this.awesomeMCP.github_readFile(awesomeParams.owner, awesomeParams.repo, awesomeParams.path);
          if (awesomeMethod === 'create_issue') return await this.awesomeMCP.github_createIssue(awesomeParams.owner, awesomeParams.repo, awesomeParams.title, awesomeParams.body);
          if (awesomeMethod === 'search_code') return await this.awesomeMCP.github_searchCode(awesomeParams.query);
        } else if (awesomeServer === 'slack' || awesomeServer === 'mcp-slack') {
          if (awesomeMethod === 'send_message') return await this.awesomeMCP.slack_sendMessage(awesomeParams.channel, awesomeParams.text);
          if (awesomeMethod === 'list_channels') return await this.awesomeMCP.slack_listChannels();
        } else if (awesomeServer === 'filesystem' || awesomeServer === 'mcp-filesystem') {
          if (awesomeMethod === 'read_file') return await this.awesomeMCP.filesystem_readFile(awesomeParams.path);
          if (awesomeMethod === 'write_file') return await this.awesomeMCP.filesystem_writeFile(awesomeParams.path, awesomeParams.content);
          if (awesomeMethod === 'list_directory') return await this.awesomeMCP.filesystem_listDirectory(awesomeParams.path);
        } else if (awesomeServer === 'postgres' || awesomeServer === 'mcp-postgres') {
          if (awesomeMethod === 'query') return await this.awesomeMCP.postgres_query(awesomeParams.sql, awesomeParams.params);
        } else if (awesomeServer === 'browser' || awesomeServer === 'puppeteer' || awesomeServer === 'playwright') {
          if (awesomeMethod === 'navigate') return await this.awesomeMCP.browser_navigate(awesomeParams.url);
          if (awesomeMethod === 'screenshot') return await this.awesomeMCP.browser_screenshot(awesomeParams.url, awesomeParams.fullPage);
        } else if (awesomeServer === 'kubernetes' || awesomeServer === 'k8s') {
          if (awesomeMethod === 'get_pods') return await this.awesomeMCP.k8s_getPods(awesomeParams.namespace);
          if (awesomeMethod === 'logs') return await this.awesomeMCP.k8s_getLogs(awesomeParams.pod, awesomeParams.namespace);
        } else if (awesomeServer === 'docker') {
          if (awesomeMethod === 'list_containers') return await this.awesomeMCP.docker_listContainers();
          if (awesomeMethod === 'start_container') return await this.awesomeMCP.docker_startContainer(awesomeParams.id);
        } else if (awesomeServer === 'memory' || awesomeServer === 'mcp-memory') {
          if (awesomeMethod === 'store') return await this.awesomeMCP.memory_store(awesomeParams.key, awesomeParams.value, awesomeParams.metadata);
          if (awesomeMethod === 'retrieve') return await this.awesomeMCP.memory_retrieve(awesomeParams.query);
        } else if (awesomeServer === 'search') {
          return await this.awesomeMCP.search_web(awesomeParams.query, awesomeParams.provider);
        } else if (awesomeServer === 'notion') {
          if (awesomeMethod === 'query_database') return await this.awesomeMCP.notion_queryDatabase(awesomeParams.databaseId, awesomeParams.filter);
        }

        // Generic call for any other server
        return await this.awesomeMCP.callTool(awesomeServer, awesomeMethod, awesomeParams);

      case 'create_subagent':
        const { code: agentCode, bindings: agentBindings, name: agentName } = await this.codeGen.generateSubAgent({
          purpose: params.purpose || step.description,
          capabilities: params.capabilities || [],
          mcpServers: params.mcpServers,
        });

        await this.provisionResources(agentBindings);
        await this.cfAPI.deployWorker(agentName, agentCode, agentBindings);

        return { agent: agentName, url: `https://${agentName}.${this.env.CF_ACCOUNT_ID}.workers.dev` };

      case 'query_data':
        if (params.database) {
          return await this.cfAPI.queryD1(params.database, params.sql, params.params);
        }
        return { queried: true };

      case 'analyze':
        // Run analysis using AI
        const analysisMessages: Message[] = [
          { role: 'system', content: 'Analyze the provided data and return insights.' },
          { role: 'user', content: JSON.stringify(params) },
        ];

        // Use CF AI Gateway with compat endpoint and dynamic routing
        const analysisResponse = await this.ai.compatChatCompletion(
          analysisMessages,
          { model: 'dynamic/RE_Ant' }
        );

        return { analysis: analysisResponse.result?.response };

      case 'coordinate':
        // Coordinate multiple sub-agents
        const agents = params.agents || [];
        const tasks = [];

        for (const agent of agents) {
          tasks.push(this.env.TASK_QUEUE.send({
            id: crypto.randomUUID(),
            type: 'subagent_task',
            payload: { agent, task: params.task },
            status: 'pending',
            priority: params.priority || 1,
            retryCount: 0,
            maxRetries: 3,
            createdAt: Date.now(),
          }));
        }

        await Promise.all(tasks);
        return { coordinated: agents.length, agents };

      default:
        // For unknown actions, use AI to figure it out
        return await this.handleUnknownAction(step);
    }
  }

  /**
   * Handle unknown actions dynamically
   */
  private async handleUnknownAction(step: any): Promise<any> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'Execute the requested action and return the result as JSON.',
      },
      {
        role: 'user',
        content: `Execute: ${step.action}\nDescription: ${step.description}\nParameters: ${JSON.stringify(step.parameters)}`,
      },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      { model: 'dynamic/RE_Ant' }
    );

    return {
      action: step.action,
      result: response.result?.response,
    };
  }

  /**
   * Recover from step failure
   */
  private async recoverFromFailure(step: any, error: Error, originalCommand: string): Promise<any> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'A step failed. Suggest recovery action or alternative approach.',
      },
      {
        role: 'user',
        content: `Failed step: ${step.action}\nError: ${error.message}\nOriginal command: ${originalCommand}\n\nSuggest recovery as JSON: {"action": "...", "params": {...}}`,
      },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      {
        model: 'dynamic/RE_Ant',
        temperature: 0.4
      }
    );

    try {
      const jsonMatch = response.result?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recovery = JSON.parse(jsonMatch[0]);
        return await this.executeStep(recovery, []);
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  /**
   * Analyze user intent from natural language
   */
  private async analyzeIntent(command: string): Promise<any> {
    const systemPrompt = `Analyze the user's command and extract intent.

Return JSON with:
{
  "action": "deploy_worker" | "create_subagent" | "analyze_data" | "create_web_interface" | "bind_mcp_server" | "create_sandbox" | "query_infrastructure",
  "entities": {
    "purpose": "what to build",
    "requirements": ["list", "of", "requirements"],
    "bindings": ["required", "bindings"],
    "mcpServers": ["mcp", "servers"],
    "target": "target system"
  }
}

Examples:
"build worker to analyze google ads" -> {"action": "deploy_worker", "entities": {"purpose": "analyze google ads"}}
"create sub-agent for ad analysis" -> {"action": "create_subagent", "entities": {"purpose": "ad analysis"}}
"build worker bound to E2B" -> {"action": "deploy_worker", "entities": {"mcpServers": ["E2B"]}}
"create sandbox and web interface" -> {"action": "create_sandbox", "entities": {"purpose": "web interface"}}`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: command },
    ];

    const response = await this.ai.runWithBinding(
      '@cf/meta/llama-3.1-8b-instruct-fast',
      messages,
      { temperature: 0.1, maxTokens: 500 }
    );

    if (!response.success) {
      return { action: 'unknown', entities: {} };
    }

    try {
      const jsonMatch = response.result?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse intent:', e);
    }

    return { action: 'unknown', entities: {} };
  }

  /**
   * Deploy worker from natural language description
   */
  private async deployWorkerFromDescription(command: string, intent: any): Promise<WorkerDeployment> {
    // Generate worker code
    const { code, bindings, name, routes } = await this.codeGen.generateWorker({
      description: intent.entities.purpose || command,
      bindings: intent.entities.bindings,
      mcpServers: intent.entities.mcpServers,
      requirements: intent.entities.requirements,
    });

    // Create necessary resources first
    await this.provisionResources(bindings);

    // Deploy worker
    await this.cfAPI.deployWorker(name, code, bindings);

    // Store deployment record
    await this.env.DB.prepare(
      `INSERT INTO worker_deployments (id, worker_name, script_content, bindings, routes, deployed_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      name,
      code,
      JSON.stringify(bindings),
      routes ? JSON.stringify(routes) : null,
      Date.now(),
      'deployed'
    ).run();

    const url = `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`;

    return {
      name,
      code,
      bindings,
      routes,
      deployed: true,
      url,
    };
  }

  /**
   * Create and deploy sub-agent
   */
  private async createSubAgent(command: string, intent: any): Promise<any> {
    const { code, bindings, name } = await this.codeGen.generateSubAgent({
      purpose: intent.entities.purpose || command,
      capabilities: intent.entities.requirements || [],
      mcpServers: intent.entities.mcpServers,
    });

    // Provision resources
    await this.provisionResources(bindings);

    // Deploy sub-agent
    await this.cfAPI.deployWorker(name, code, bindings);

    // Register as agent in DB
    await this.env.DB.prepare(
      `INSERT INTO agents (id, name, type, capabilities, config, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      name,
      'dynamic',
      JSON.stringify({ subagent: true, autonomous: true }),
      JSON.stringify({ workerName: name }),
      'active',
      Date.now()
    ).run();

    return {
      agentName: name,
      deployed: true,
      url: `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`,
    };
  }

  /**
   * Analyze data using sub-agent
   */
  private async analyzeWithSubAgent(command: string, intent: any): Promise<any> {
    // Create specialized analyzer sub-agent
    const { code, bindings, name } = await this.codeGen.generateSubAgent({
      purpose: `analyze ${intent.entities.target || 'data'}`,
      capabilities: ['data_analysis', 'reporting', 'visualization'],
      mcpServers: intent.entities.mcpServers,
    });

    await this.provisionResources(bindings);
    await this.cfAPI.deployWorker(name, code, bindings);

    // Trigger analysis by calling the deployed worker
    const workerUrl = `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev/analyze`;

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: intent.entities.purpose,
          parameters: intent.entities.requirements,
        }),
      });

      return await response.json();
    } catch (error: any) {
      return {
        status: 'deployed',
        message: 'Sub-agent created and deployed. Call it directly for analysis.',
        url: workerUrl,
      };
    }
  }

  /**
   * Create web interface
   */
  private async createWebInterface(command: string, intent: any): Promise<any> {
    // Generate HTML interface
    const html = await this.codeGen.generateWebInterface({
      description: intent.entities.purpose || command,
      features: intent.entities.requirements || ['responsive', 'dark-theme', 'api-integration'],
      apiEndpoints: intent.entities.apiEndpoints,
    });

    // Create worker to serve the interface
    const workerCode = `
export default {
  async fetch(request: Request): Promise<Response> {
    const html = \`${html.replace(/`/g, '\\`')}\`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};`;

    const name = this.generateWorkerName('web-interface');
    await this.cfAPI.deployWorker(name, workerCode, {});

    return {
      deployed: true,
      url: `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`,
      workerName: name,
    };
  }

  /**
   * Bind worker to MCP server
   */
  private async bindMCPServer(command: string, intent: any): Promise<any> {
    const serverName = intent.entities.mcpServers?.[0] || 'E2B';

    // Generate worker with MCP integration
    const { code, bindings, name } = await this.codeGen.generateWorker({
      description: `Worker integrated with ${serverName} MCP server`,
      mcpServers: [serverName],
      requirements: ['mcp_client', 'server_communication'],
    });

    await this.provisionResources(bindings);
    await this.cfAPI.deployWorker(name, code, bindings);

    // Initialize MCP connection
    await this.mcpManager.initialize();

    return {
      deployed: true,
      workerName: name,
      mcpServer: serverName,
      url: `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`,
    };
  }

  /**
   * Create sandbox environment
   */
  private async createSandbox(command: string, intent: any): Promise<any> {
    // Use Container MCP to create sandbox
    await this.mcpManager.initialize();

    const sandbox = await this.mcpManager.container_createSandbox({
      image: intent.entities.image || 'node:20-alpine',
      env: intent.entities.env || {},
      command: intent.entities.command,
    });

    // Create worker to interact with sandbox
    const { code, bindings, name } = await this.codeGen.generateWorker({
      description: 'Interact with sandbox environment',
      mcpServers: ['container'],
      requirements: ['sandbox_control', 'code_execution'],
    });

    await this.provisionResources(bindings);
    await this.cfAPI.deployWorker(name, code, bindings);

    return {
      sandbox,
      worker: {
        name,
        url: `https://${name}.${this.env.CF_ACCOUNT_ID}.workers.dev`,
      },
    };
  }

  /**
   * Query infrastructure
   */
  private async queryInfrastructure(command: string, intent: any): Promise<any> {
    const results: any = {};

    if (command.includes('worker')) {
      results.workers = await this.cfAPI.listWorkers();
    }

    if (command.includes('kv') || command.includes('storage')) {
      results.kv = await this.cfAPI.listKVNamespaces();
    }

    if (command.includes('d1') || command.includes('database')) {
      results.d1 = await this.cfAPI.listD1Databases();
    }

    if (command.includes('r2') || command.includes('bucket')) {
      results.r2 = await this.cfAPI.listR2Buckets();
    }

    return results;
  }

  /**
   * Handle generic commands
   */
  private async handleGenericCommand(command: string): Promise<any> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a master control agent. Provide helpful responses about system capabilities and guide users.',
      },
      { role: 'user', content: command },
    ];

    // Use CF AI Gateway with compat endpoint and dynamic routing
    const response = await this.ai.compatChatCompletion(
      messages,
      { model: 'dynamic/RE_Ant' }
    );

    return {
      response: response.result?.response || 'Unable to process command',
    };
  }

  /**
   * Provision resources for bindings
   */
  private async provisionResources(bindings: any): Promise<void> {
    if (bindings.d1_databases) {
      for (const db of bindings.d1_databases) {
        try {
          await this.cfAPI.createD1Database(db.database_name);
        } catch (e) {
          // Database might already exist
        }
      }
    }

    if (bindings.kv_namespaces) {
      for (const kv of bindings.kv_namespaces) {
        try {
          await this.cfAPI.createKVNamespace(kv.binding);
        } catch (e) {
          // Namespace might already exist
        }
      }
    }

    if (bindings.r2_buckets) {
      for (const r2 of bindings.r2_buckets) {
        try {
          await this.cfAPI.createR2Bucket(r2.bucket_name);
        } catch (e) {
          // Bucket might already exist
        }
      }
    }

    if (bindings.queues) {
      for (const queue of bindings.queues.producers || []) {
        try {
          await this.cfAPI.createQueue(queue.queue);
        } catch (e) {
          // Queue might already exist
        }
      }
    }
  }

  private generateWorkerName(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`;
  }
}
