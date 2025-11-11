// InfrastructureAgent - Autonomous SSH host management and infrastructure monitoring
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface InfrastructureState {
  monitoredHosts: Map<string, {
    hostname: string;
    lastCheck: string;
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      diskUsage: number;
      memoryUsage: number;
      cpuLoad: number;
    };
  }>;
  autoRemediationEnabled: boolean;
  alertThresholds: {
    diskUsage: number;
    memoryUsage: number;
    cpuLoad: number;
  };
}

export class InfrastructureAgent extends DurableObject<Env> {
  private state: InfrastructureState = {
    monitoredHosts: new Map(),
    autoRemediationEnabled: true,
    alertThresholds: {
      diskUsage: 80,
      memoryUsage: 90,
      cpuLoad: 80,
    },
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<any>('state');
      if (stored) {
        this.state = {
          ...stored,
          monitoredHosts: new Map(stored.monitoredHosts || []),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/monitor':
        return this.monitorHosts();
      case '/remediate':
        return this.autoRemediate();
      case '/exec':
        return this.executeCommand(request);
      case '/health':
        return this.getHostHealth();
      case '/config':
        return this.updateConfig(request);
      default:
        return new Response('Infrastructure Agent Ready');
    }
  }

  // AUTONOMOUS: Monitor all hosts
  private async monitorHosts(): Promise<Response> {
    console.log('🖥️ [INFRA] Monitoring infrastructure...');

    try {
      // Check disk usage
      const diskResult = await this.env.MCP_SSH.call('exec', {
        command: "df -h | grep '^/' | awk '{print $5}' | sed 's/%//' | head -1",
      });

      // Check memory usage
      const memResult = await this.env.MCP_SSH.call('exec', {
        command: "free | grep Mem | awk '{print ($3/$2) * 100.0}'",
      });

      // Check CPU load
      const cpuResult = await this.env.MCP_SSH.call('exec', {
        command: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
      });

      const metrics = {
        diskUsage: parseFloat(diskResult.stdout || '0'),
        memoryUsage: parseFloat(memResult.stdout || '0'),
        cpuLoad: parseFloat(cpuResult.stdout || '0'),
      };

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (
        metrics.diskUsage > this.state.alertThresholds.diskUsage ||
        metrics.memoryUsage > this.state.alertThresholds.memoryUsage ||
        metrics.cpuLoad > this.state.alertThresholds.cpuLoad
      ) {
        status = metrics.diskUsage > 95 ? 'critical' : 'warning';
      }

      this.state.monitoredHosts.set('primary', {
        hostname: 'primary',
        lastCheck: new Date().toISOString(),
        status,
        metrics,
      });

      await this.saveState();

      return new Response(JSON.stringify({
        status,
        metrics,
        hosts: Array.from(this.state.monitoredHosts.values()),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: 'SSH MCP server not available',
        message: error.message 
      }), { status: 500 });
    }
  }

  // AUTONOMOUS: Auto-remediate infrastructure issues
  private async autoRemediate(): Promise<Response> {
    if (!this.state.autoRemediationEnabled) {
      return new Response(JSON.stringify({ message: 'Auto-remediation disabled' }));
    }

    console.log('🔧 [INFRA] Auto-remediating infrastructure issues...');

    const actions = [];

    for (const [hostId, host] of this.state.monitoredHosts.entries()) {
      // AUTONOMOUS DECISION: Clean disk if usage > threshold
      if (host.metrics.diskUsage > this.state.alertThresholds.diskUsage) {
        console.log(`🧹 [INFRA] Disk usage critical on ${hostId}: ${host.metrics.diskUsage}%`);
        
        try {
          // Clean Docker resources
          await this.env.MCP_SSH.call('exec', {
            command: 'docker system prune -af --volumes',
          });

          // Clean package manager cache
          await this.env.MCP_SSH.call('exec', {
            command: 'apt-get clean || yum clean all',
          });

          // Clean old logs
          await this.env.MCP_SSH.call('exec', {
            command: 'find /var/log -name "*.log" -mtime +30 -delete',
          });

          actions.push({
            host: hostId,
            action: 'disk_cleanup',
            reason: `Disk usage: ${host.metrics.diskUsage}%`,
            outcome: 'success',
          });

          console.log(`✅ [INFRA] Disk cleanup completed on ${hostId}`);
        } catch (error) {
          actions.push({
            host: hostId,
            action: 'disk_cleanup',
            reason: `Disk usage: ${host.metrics.diskUsage}%`,
            outcome: 'failed',
          });
        }
      }

      // AUTONOMOUS DECISION: Restart services if memory critical
      if (host.metrics.memoryUsage > 95) {
        console.log(`🔄 [INFRA] Memory critical on ${hostId}: ${host.metrics.memoryUsage}%`);
        
        try {
          // Restart heavy services
          await this.env.MCP_SSH.call('exec', {
            command: 'systemctl restart nginx',
          });

          actions.push({
            host: hostId,
            action: 'service_restart',
            reason: `Memory usage: ${host.metrics.memoryUsage}%`,
            outcome: 'success',
          });
        } catch (error) {
          actions.push({
            host: hostId,
            action: 'service_restart',
            reason: `Memory usage: ${host.metrics.memoryUsage}%`,
            outcome: 'failed',
          });
        }
      }
    }

    return new Response(JSON.stringify({
      remediated: actions.length,
      actions,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async executeCommand(request: Request): Promise<Response> {
    const { command, sudo } = await request.json<{ command: string; sudo?: boolean }>();

    try {
      const fullCommand = sudo ? `sudo ${command}` : command;
      
      const result = await this.env.MCP_SSH.call('exec', {
        command: fullCommand,
      });

      return new Response(JSON.stringify({
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        success: false,
        error: error.message 
      }), { status: 500 });
    }
  }

  private async getHostHealth(): Promise<Response> {
    return new Response(JSON.stringify({
      hosts: Array.from(this.state.monitoredHosts.values()),
      autoRemediationEnabled: this.state.autoRemediationEnabled,
      thresholds: this.state.alertThresholds,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateConfig(request: Request): Promise<Response> {
    const config = await request.json<Partial<InfrastructureState>>();
    
    this.state = { ...this.state, ...config };
    await this.saveState();

    return new Response(JSON.stringify({ 
      success: true,
      config: this.state 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('state', {
      ...this.state,
      monitoredHosts: Array.from(this.state.monitoredHosts.entries()),
    });
  }
}