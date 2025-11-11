// CoordinatorAgent - Orchestrates multi-agent workflows
import { DurableObject } from 'cloudflare:workers';
import type { Env, AgentConfig, WorkflowExecution } from '../types';

interface CoordinatorState {
  workflows: Map<string, WorkflowExecution>;
  agentRegistry: Map<string, AgentConfig>;
}

export class CoordinatorAgent extends DurableObject<Env> {
  private state: CoordinatorState = {
    workflows: new Map(),
    agentRegistry: new Map(),
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<any>('state');
      if (stored) {
        this.state = {
          workflows: new Map(stored.workflows || []),
          agentRegistry: new Map(stored.agentRegistry || []),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/create-workflow':
        return this.createWorkflow(request);
      case '/execute-workflow':
        return this.executeWorkflow(request);
      case '/get-workflow-status':
        return this.getWorkflowStatus(request);
      default:
        return new Response('Coordinator Agent Ready');
    }
  }

  private async createWorkflow(request: Request): Promise<Response> {
    const { name, agents, orchestrationType } = await request.json<{
      name: string;
      agents: string[];
      orchestrationType?: 'supervisor' | 'swarm' | 'hierarchical';
    }>();
    
    const workflowId = crypto.randomUUID();
    
    const workflow: WorkflowExecution = {
      id: workflowId,
      name,
      agents,
      status: 'pending',
      results: new Map(),
      orchestrationType: orchestrationType || 'supervisor',
    };
    
    this.state.workflows.set(workflowId, workflow);
    await this.saveState();
    
    // Store in D1
    await this.env.DB.prepare(`
      INSERT INTO workflows (id, name, agents, orchestration_type)
      VALUES (?, ?, ?, ?)
    `).bind(workflowId, name, JSON.stringify(agents), workflow.orchestrationType).run();
    
    console.log(`🔀 Created workflow: ${name} (${workflowId})`);
    
    return new Response(JSON.stringify({ workflowId, workflow }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async executeWorkflow(request: Request): Promise<Response> {
    const { workflowId, task } = await request.json<{ workflowId: string; task: string }>();
    
    const workflow = this.state.workflows.get(workflowId);
    
    if (!workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), { status: 404 });
    }
    
    workflow.status = 'running';
    console.log(`▶️ Executing workflow: ${workflow.name} (${workflow.orchestrationType})`);
    
    try {
      let results: Map<string, any>;
      
      switch (workflow.orchestrationType) {
        case 'supervisor':
          results = await this.executeSupervisorPattern(workflow, task);
          break;
        case 'swarm':
          results = await this.executeSwarmPattern(workflow, task);
          break;
        case 'hierarchical':
          results = await this.executeHierarchicalPattern(workflow, task);
          break;
        default:
          throw new Error(`Unknown orchestration type: ${workflow.orchestrationType}`);
      }
      
      workflow.status = 'completed';
      workflow.results = results;
      await this.saveState();
      
      console.log(`✅ Workflow completed: ${workflow.name}`);
      
      return new Response(JSON.stringify({ 
        workflowId, 
        results: Object.fromEntries(results),
        status: 'completed'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      workflow.status = 'failed';
      console.error(`❌ Workflow failed:`, error);
      
      return new Response(JSON.stringify({ 
        workflowId, 
        error: error.message,
        status: 'failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Supervisor Pattern: Sequential delegation with central control
  private async executeSupervisorPattern(workflow: WorkflowExecution, task: string): Promise<Map<string, any>> {
    const results = new Map();
    
    console.log(`👑 Supervisor pattern: Processing ${workflow.agents.length} agents sequentially`);
    
    for (const agentId of workflow.agents) {
      const executorId = this.env.EXECUTOR_AGENT.idFromName(agentId);
      const stub = this.env.EXECUTOR_AGENT.get(executorId);
      
      const response = await stub.fetch(new Request('https://fake-host/execute', {
        method: 'POST',
        body: JSON.stringify({ 
          input: task,
          context: Array.from(results.values()),
        }),
      }));
      
      const result = await response.json();
      results.set(agentId, result);
    }
    
    return results;
  }

  // Swarm Pattern: All agents work in parallel
  private async executeSwarmPattern(workflow: WorkflowExecution, task: string): Promise<Map<string, any>> {
    console.log(`🐝 Swarm pattern: ${workflow.agents.length} agents working in parallel`);
    
    const promises = workflow.agents.map(async (agentId) => {
      const executorId = this.env.EXECUTOR_AGENT.idFromName(agentId);
      const stub = this.env.EXECUTOR_AGENT.get(executorId);
      
      const response = await stub.fetch(new Request('https://fake-host/execute', {
        method: 'POST',
        body: JSON.stringify({ input: task }),
      }));
      
      return { agentId, result: await response.json() };
    });
    
    const results = await Promise.all(promises);
    return new Map(results.map(r => [r.agentId, r.result]));
  }

  // Hierarchical Pattern: Meta-agent delegates to specialized agents
  private async executeHierarchicalPattern(workflow: WorkflowExecution, task: string): Promise<Map<string, any>> {
    console.log(`🏛️ Hierarchical pattern: Meta-agent → specialized agents`);
    
    const results = new Map();
    
    // First agent is the meta-level coordinator
    const metaAgentId = workflow.agents[0];
    const metaExecutorId = this.env.EXECUTOR_AGENT.idFromName(metaAgentId);
    const metaStub = this.env.EXECUTOR_AGENT.get(metaExecutorId);
    
    const metaResponse = await metaStub.fetch(new Request('https://fake-host/execute', {
      method: 'POST',
      body: JSON.stringify({ input: task }),
    }));
    
    const metaResult = await metaResponse.json<any>();
    results.set(metaAgentId, metaResult);
    
    // Delegate to sub-agents based on meta-agent output
    for (let i = 1; i < workflow.agents.length; i++) {
      const agentId = workflow.agents[i];
      const executorId = this.env.EXECUTOR_AGENT.idFromName(agentId);
      const stub = this.env.EXECUTOR_AGENT.get(executorId);
      
      const response = await stub.fetch(new Request('https://fake-host/execute', {
        method: 'POST',
        body: JSON.stringify({ 
          input: metaResult.output,
          context: [metaResult],
        }),
      }));
      
      const result = await response.json();
      results.set(agentId, result);
    }
    
    return results;
  }

  private async getWorkflowStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('id');
    
    if (!workflowId) {
      return new Response(JSON.stringify({ error: 'Workflow ID required' }), { status: 400 });
    }
    
    const workflow = this.state.workflows.get(workflowId);
    
    if (!workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), { status: 404 });
    }
    
    return new Response(JSON.stringify({
      workflow: {
        ...workflow,
        results: Object.fromEntries(workflow.results),
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', {
      workflows: Array.from(this.state.workflows.entries()),
      agentRegistry: Array.from(this.state.agentRegistry.entries()),
    });
  }
}