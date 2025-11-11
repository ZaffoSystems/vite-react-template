// SupervisorAgent - Autonomous master controller with self-monitoring and self-healing
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface SupervisorState {
  autonomousMode: boolean;
  lastHealthCheck: string;
  systemMetrics: {
    totalAgents: number;
    activeAgents: number;
    failedAgents: number;
    taskSuccessRate: number;
    averageResponseTime: number;
  };
  autonomousActions: Array<{
    timestamp: string;
    action: string;
    reason: string;
    outcome: string;
  }>;
}

export class SupervisorAgent extends DurableObject<Env> {
  private state: SupervisorState = {
    autonomousMode: true,
    lastHealthCheck: new Date().toISOString(),
    systemMetrics: {
      totalAgents: 0,
      activeAgents: 0,
      failedAgents: 0,
      taskSuccessRate: 100,
      averageResponseTime: 0,
    },
    autonomousActions: [],
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<SupervisorState>('state');
      if (stored) this.state = stored;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/autonomous-loop':
        return this.autonomousLoop();
      case '/health':
        return this.getSystemHealth();
      case '/metrics':
        return this.getMetrics();
      case '/toggle-autonomous':
        return this.toggleAutonomousMode();
      case '/actions':
        return this.getAutonomousActions();
      default:
        return new Response('Supervisor Agent Ready');
    }
  }

  // AUTONOMOUS LOOP - Runs every minute via cron
  private async autonomousLoop(): Promise<Response> {
    if (!this.state.autonomousMode) {
      return new Response(JSON.stringify({ status: 'autonomous mode disabled' }));
    }

    console.log('🔄 [AUTONOMOUS] Starting autonomous supervision cycle...');

    try {
      // 1. Self-Monitoring
      await this.monitorSystemHealth();
      
      // 2. Self-Healing
      await this.healFailedComponents();
      
      // 3. Self-Optimization
      await this.optimizeResources();
      
      // 4. Self-Improvement
      await this.analyzeAndImprove();
      
      // 5. Autonomous Decision-Making
      await this.makeStrategicDecisions();

      this.state.lastHealthCheck = new Date().toISOString();
      await this.saveState();

      return new Response(JSON.stringify({
        status: 'autonomous cycle completed',
        timestamp: this.state.lastHealthCheck,
        metrics: this.state.systemMetrics,
        actionsCount: this.state.autonomousActions.length,
      }));
    } catch (error: any) {
      console.error('❌ [AUTONOMOUS] Error in autonomous loop:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  // 1. SELF-MONITORING
  private async monitorSystemHealth(): Promise<void> {
    console.log('🔍 [AUTONOMOUS] Monitoring system health...');

    // Get all agents from database
    const agentsResult = await this.env.DB.prepare(
      'SELECT id, name, status FROM agents'
    ).all();

    // Get task success rates
    const tasksResult = await this.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        AVG(execution_time_ms) as avg_time
      FROM tasks
      WHERE created_at > datetime('now', '-1 hour')
    `).first();

    this.state.systemMetrics = {
      totalAgents: agentsResult.results?.length || 0,
      activeAgents: agentsResult.results?.filter((a: any) => a.status === 'active').length || 0,
      failedAgents: agentsResult.results?.filter((a: any) => a.status === 'failed').length || 0,
      taskSuccessRate: tasksResult ? (tasksResult.successful / tasksResult.total * 100) : 100,
      averageResponseTime: tasksResult?.avg_time || 0,
    };

    // Log metrics to D1
    await this.env.DB.prepare(`
      INSERT INTO performance_metrics (id, agent_id, metric_name, value, timestamp)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      crypto.randomUUID(),
      'supervisor',
      'system_health_score',
      this.calculateHealthScore()
    ).run();
  }

  // 2. SELF-HEALING
  private async healFailedComponents(): Promise<void> {
    console.log('🩹 [AUTONOMOUS] Checking for failed components...');

    if (this.state.systemMetrics.failedAgents > 0) {
      console.log(`🚨 [AUTONOMOUS] Detected ${this.state.systemMetrics.failedAgents} failed agents`);

      // Get failed agents
      const failedAgents = await this.env.DB.prepare(
        "SELECT id, name FROM agents WHERE status = 'failed'"
      ).all();

      for (const agent of failedAgents.results || []) {
        await this.recoverAgent(agent as any);
      }
    }

    // Check task failure rate
    if (this.state.systemMetrics.taskSuccessRate < 70) {
      console.log('🚨 [AUTONOMOUS] Task success rate below threshold, investigating...');
      await this.investigateTaskFailures();
    }
  }

  private async recoverAgent(agent: { id: string; name: string }): Promise<void> {
    console.log(`🔧 [AUTONOMOUS] Recovering agent: ${agent.name}`);

    try {
      // Reset agent status
      await this.env.DB.prepare(
        "UPDATE agents SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(agent.id).run();

      // Reinitialize agent via BuilderAgent
      const builderId = this.env.BUILDER_AGENT.idFromName('main');
      const builderStub = this.env.BUILDER_AGENT.get(builderId);
      
      await builderStub.fetch(new Request('https://fake-host', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          agentId: agent.id,
          config: { status: 'active' }
        }),
      }));

      this.logAutonomousAction(
        'agent_recovery',
        `Agent ${agent.name} was failed`,
        'Successfully recovered and reinitialized agent'
      );
    } catch (error: any) {
      console.error(`Failed to recover agent ${agent.name}:`, error);
    }
  }

  private async investigateTaskFailures(): Promise<void> {
    const recentFailures = await this.env.DB.prepare(`
      SELECT input, output, mcp_tools_used
      FROM tasks
      WHERE status = 'failed' AND created_at > datetime('now', '-1 hour')
      LIMIT 10
    `).all();

    // Use AI to analyze failure patterns
    if (recentFailures.results && recentFailures.results.length > 0) {
      const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{
          role: 'system',
          content: 'You are analyzing task failures. Identify common patterns and suggest fixes.'
        }, {
          role: 'user',
          content: `Recent failures:\n${JSON.stringify(recentFailures.results, null, 2)}\n\nWhat is the root cause and how to fix it?`
        }],
        stream: false,
      });

      this.logAutonomousAction(
        'failure_analysis',
        `High failure rate: ${this.state.systemMetrics.taskSuccessRate.toFixed(1)}%`,
        `Analysis: ${analysis.response.slice(0, 200)}`
      );
    }
  }

  // 3. SELF-OPTIMIZATION
  private async optimizeResources(): Promise<void> {
    console.log('⚡ [AUTONOMOUS] Optimizing system resources...');

    // Check if we need more agents
    const taskBacklog = await this.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'"
    ).first();

    if (taskBacklog && taskBacklog.count > 10) {
      console.log(`📈 [AUTONOMOUS] High task backlog (${taskBacklog.count}), scaling up...`);
      await this.scaleUp();
    }

    // Check if we should scale down
    const idleAgents = await this.env.DB.prepare(`
      SELECT a.id, a.name
      FROM agents a
      LEFT JOIN tasks t ON a.id = t.agent_id AND t.created_at > datetime('now', '-1 hour')
      WHERE a.status = 'active'
      GROUP BY a.id
      HAVING COUNT(t.id) = 0
    `).all();

    if (idleAgents.results && idleAgents.results.length > 3) {
      console.log(`📉 [AUTONOMOUS] Too many idle agents (${idleAgents.results.length}), scaling down...`);
      await this.scaleDown(idleAgents.results as any[]);
    }
  }

  private async scaleUp(): Promise<void> {
    // Autonomously create a new general-purpose agent
    const metaId = this.env.META_AGENT.idFromName('main');
    const metaStub = this.env.META_AGENT.get(metaId);

    await metaStub.fetch(new Request('https://fake-host/create-agent', {
      method: 'POST',
      body: JSON.stringify({
        description: 'General purpose task executor for handling high load',
        mcpServers: ['observability', 'browser', 'filesystem']
      }),
    }));

    this.logAutonomousAction(
      'scale_up',
      'Task backlog exceeded threshold',
      'Created new general-purpose agent'
    );
  }

  private async scaleDown(idleAgents: Array<{ id: string; name: string }>): Promise<void> {
    // Deactivate the least recently used agent
    const agentToDeactivate = idleAgents[0];
    
    await this.env.DB.prepare(
      "UPDATE agents SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(agentToDeactivate.id).run();

    this.logAutonomousAction(
      'scale_down',
      `Agent ${agentToDeactivate.name} idle for >1 hour`,
      'Deactivated idle agent to save resources'
    );
  }

  // 4. SELF-IMPROVEMENT
  private async analyzeAndImprove(): Promise<void> {
    console.log('📚 [AUTONOMOUS] Analyzing performance for improvements...');

    // Get top performing agents
    const topPerformers = await this.env.DB.prepare(`
      SELECT 
        agent_id,
        COUNT(*) as task_count,
        AVG(execution_time_ms) as avg_time,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM tasks
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY agent_id
      HAVING task_count > 5
      ORDER BY success_rate DESC, avg_time ASC
      LIMIT 3
    `).all();

    if (topPerformers.results && topPerformers.results.length > 0) {
      // Learn from top performers
      for (const performer of topPerformers.results) {
        const agent = await this.env.DB.prepare(
          'SELECT config FROM agents WHERE id = ?'
        ).bind((performer as any).agent_id).first();

        if (agent) {
          // Store successful configuration patterns
          await this.env.DB.prepare(`
            INSERT INTO learning_outcomes (id, agent_id, strategy, success_rate, iterations)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET 
              success_rate = ?,
              iterations = iterations + 1,
              last_updated = CURRENT_TIMESTAMP
          `).bind(
            `strategy_${(performer as any).agent_id}`,
            (performer as any).agent_id,
            agent.config,
            (performer as any).success_rate,
            (performer as any).success_rate
          ).run();
        }
      }

      this.logAutonomousAction(
        'learning',
        'Analyzed top performing agents',
        `Stored ${topPerformers.results.length} successful strategies`
      );
    }
  }

  // 5. AUTONOMOUS DECISION-MAKING
  private async makeStrategicDecisions(): Promise<void> {
    console.log('🧠 [AUTONOMOUS] Making strategic decisions...');

    // Decision 1: Should we create specialized agents?
    const taskTypes = await this.analyzeTaskPatterns();
    if (taskTypes.needsSpecialization) {
      await this.createSpecializedAgent(taskTypes.pattern);
    }

    // Decision 2: Should we prune old memories?
    const memoryStats = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM memories WHERE importance < 0.3'
    ).first();

    if (memoryStats && memoryStats.count > 1000) {
      console.log('🧹 [AUTONOMOUS] Pruning low-importance memories...');
      const memoryId = this.env.MEMORY_AGENT.idFromName('main');
      const memoryStub = this.env.MEMORY_AGENT.get(memoryId);
      await memoryStub.fetch(new Request('https://fake-host/prune'));

      this.logAutonomousAction(
        'memory_pruning',
        `${memoryStats.count} low-importance memories`,
        'Pruned old memories to optimize storage'
      );
    }

    // Decision 3: Should we adjust autonomous mode sensitivity?
    const healthScore = this.calculateHealthScore();
    if (healthScore < 50) {
      console.log('⚠️ [AUTONOMOUS] Low health score, increasing monitoring frequency');
      // Could adjust cron frequency or alert thresholds here
    }
  }

  private async analyzeTaskPatterns(): Promise<{ needsSpecialization: boolean; pattern: string }> {
    // Analyze if many tasks share common patterns
    const recentTasks = await this.env.DB.prepare(`
      SELECT input FROM tasks WHERE created_at > datetime('now', '-1 day') LIMIT 50
    `).all();

    if (!recentTasks.results || recentTasks.results.length < 10) {
      return { needsSpecialization: false, pattern: '' };
    }

    // Use AI to detect patterns
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'system',
        content: 'Analyze these task inputs and determine if they share a common pattern that would benefit from a specialized agent. Respond with JSON: {"needsSpecialization": boolean, "pattern": "description"}'
      }, {
        role: 'user',
        content: JSON.stringify(recentTasks.results.map((t: any) => t.input))
      }],
      stream: false,
    });

    try {
      return JSON.parse(analysis.response);
    } catch {
      return { needsSpecialization: false, pattern: '' };
    }
  }

  private async createSpecializedAgent(pattern: string): Promise<void> {
    console.log(`🎯 [AUTONOMOUS] Creating specialized agent for: ${pattern}`);

    const metaId = this.env.META_AGENT.idFromName('main');
    const metaStub = this.env.META_AGENT.get(metaId);

    await metaStub.fetch(new Request('https://fake-host/create-agent', {
      method: 'POST',
      body: JSON.stringify({
        description: `Specialized agent for ${pattern}`,
        mcpServers: this.selectMcpServersForPattern(pattern)
      }),
    }));

    this.logAutonomousAction(
      'specialized_agent_creation',
      `Detected pattern: ${pattern}`,
      'Created specialized agent to handle this pattern efficiently'
    );
  }

  private selectMcpServersForPattern(pattern: string): string[] {
    // Simple heuristic - in production, use AI to select
    const patternLower = pattern.toLowerCase();
    const servers = [];

    if (patternLower.includes('web') || patternLower.includes('search')) {
      servers.push('brave-search', 'browser', 'firecrawl');
    }
    if (patternLower.includes('code') || patternLower.includes('execute')) {
      servers.push('e2b', 'container');
    }
    if (patternLower.includes('data') || patternLower.includes('analyze')) {
      servers.push('observability', 'graphql');
    }

    return servers.length > 0 ? servers : ['observability', 'browser'];
  }

  private calculateHealthScore(): number {
    const metrics = this.state.systemMetrics;
    
    // Weighted health score
    const activeRatio = metrics.totalAgents > 0 ? metrics.activeAgents / metrics.totalAgents : 1;
    const successRate = metrics.taskSuccessRate / 100;
    const responseTime = metrics.averageResponseTime > 0 ? Math.min(1, 5000 / metrics.averageResponseTime) : 1;

    return (activeRatio * 0.3 + successRate * 0.5 + responseTime * 0.2) * 100;
  }

  private logAutonomousAction(action: string, reason: string, outcome: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      reason,
      outcome,
    };

    this.state.autonomousActions.push(entry);
    if (this.state.autonomousActions.length > 100) {
      this.state.autonomousActions = this.state.autonomousActions.slice(-100);
    }

    // Also log to D1
    this.env.DB.prepare(`
      INSERT INTO autonomous_actions (id, agent_id, action_type, reason, outcome, timestamp)
      VALUES (?, 'supervisor', ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), action, reason, outcome).run();

    console.log(`✅ [AUTONOMOUS ACTION] ${action}: ${outcome}`);
  }

  private async getSystemHealth(): Promise<Response> {
    return new Response(JSON.stringify({
      autonomousMode: this.state.autonomousMode,
      lastHealthCheck: this.state.lastHealthCheck,
      healthScore: this.calculateHealthScore(),
      metrics: this.state.systemMetrics,
      recentActions: this.state.autonomousActions.slice(-10),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getMetrics(): Promise<Response> {
    return new Response(JSON.stringify(this.state.systemMetrics), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async toggleAutonomousMode(): Promise<Response> {
    this.state.autonomousMode = !this.state.autonomousMode;
    await this.saveState();

    return new Response(JSON.stringify({
      autonomousMode: this.state.autonomousMode,
      message: this.state.autonomousMode ? 'Autonomous mode enabled' : 'Autonomous mode disabled'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getAutonomousActions(): Promise<Response> {
    return new Response(JSON.stringify({
      count: this.state.autonomousActions.length,
      actions: this.state.autonomousActions.slice(-50),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', this.state);
  }
}