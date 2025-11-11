// DockerAgent - Autonomous Docker container management
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface DockerState {
  monitoredContainers: Map<string, any>;
  autoScalingEnabled: boolean;
  targetContainerCount: number;
  healthCheckInterval: number;
}

export class DockerAgent extends DurableObject<Env> {
  private state: DockerState = {
    monitoredContainers: new Map(),
    autoScalingEnabled: true,
    targetContainerCount: 3,
    healthCheckInterval: 60000, // 1 minute
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<any>('state');
      if (stored) {
        this.state = {
          ...stored,
          monitoredContainers: new Map(stored.monitoredContainers || []),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/monitor':
        return this.monitorContainers();
      case '/auto-scale':
        return this.autoScale();
      case '/heal':
        return this.healContainers();
      case '/list':
        return this.listContainers();
      case '/deploy':
        return this.deployContainer(request);
      case '/config':
        return this.updateConfig(request);
      default:
        return new Response('Docker Agent Ready');
    }
  }

  // AUTONOMOUS: Monitor all containers
  private async monitorContainers(): Promise<Response> {
    console.log('🐳 [DOCKER] Monitoring containers...');

    try {
      // List all containers
      const containers = await this.env.MCP_DOCKER.call('list_containers', {
        all: true,
      });

      // Update monitored containers
      for (const container of containers) {
        this.state.monitoredContainers.set(container.id, {
          name: container.names?.[0] || container.id,
          status: container.state,
          image: container.image,
          created: container.created,
          lastChecked: new Date().toISOString(),
        });
      }

      await this.saveState();

      return new Response(JSON.stringify({
        total: containers.length,
        running: containers.filter((c: any) => c.state === 'running').length,
        stopped: containers.filter((c: any) => c.state === 'exited').length,
        containers: Array.from(this.state.monitoredContainers.values()),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: 'Docker MCP server not available',
        message: error.message 
      }), { status: 500 });
    }
  }

  // AUTONOMOUS: Auto-scale containers based on load
  private async autoScale(): Promise<Response> {
    if (!this.state.autoScalingEnabled) {
      return new Response(JSON.stringify({ message: 'Auto-scaling disabled' }));
    }

    console.log('⚖️ [DOCKER] Auto-scaling containers...');

    try {
      const containers = await this.env.MCP_DOCKER.call('list_containers', {});
      const runningCount = containers.filter((c: any) => c.state === 'running').length;

      let action = 'none';

      // AUTONOMOUS DECISION: Scale up if below target
      if (runningCount < this.state.targetContainerCount) {
        console.log(`📈 [DOCKER] Scaling up: ${runningCount} < ${this.state.targetContainerCount}`);
        await this.scaleUp();
        action = 'scaled_up';
      }
      // AUTONOMOUS DECISION: Scale down if above target
      else if (runningCount > this.state.targetContainerCount) {
        console.log(`📉 [DOCKER] Scaling down: ${runningCount} > ${this.state.targetContainerCount}`);
        await this.scaleDown(containers);
        action = 'scaled_down';
      }

      return new Response(JSON.stringify({
        action,
        currentCount: runningCount,
        targetCount: this.state.targetContainerCount,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  private async scaleUp(): Promise<void> {
    // Deploy a new container
    await this.env.MCP_DOCKER.call('create_container', {
      image: 'nginx:latest',  // Default - should be configurable
      name: `service-${Date.now()}`,
      hostConfig: {
        restartPolicy: { name: 'always' },
      },
    });

    console.log('✅ [DOCKER] New container created');
  }

  private async scaleDown(containers: any[]): Promise<void> {
    // Find oldest running container
    const running = containers
      .filter((c: any) => c.state === 'running')
      .sort((a: any, b: any) => a.created - b.created);

    if (running.length > 0) {
      const containerToStop = running[0];
      
      await this.env.MCP_DOCKER.call('stop_container', {
        id: containerToStop.id,
      });

      console.log(`⏸️ [DOCKER] Stopped container: ${containerToStop.id}`);
    }
  }

  // AUTONOMOUS: Heal failed containers
  private async healContainers(): Promise<Response> {
    console.log('🩹 [DOCKER] Healing failed containers...');

    try {
      const containers = await this.env.MCP_DOCKER.call('list_containers', { all: true });
      const failed = containers.filter((c: any) => 
        c.state === 'exited' || c.state === 'dead'
      );

      const healed = [];

      for (const container of failed) {
        try {
          // AUTONOMOUS DECISION: Restart failed container
          await this.env.MCP_DOCKER.call('restart_container', {
            id: container.id,
          });

          healed.push(container.id);
          console.log(`✅ [DOCKER] Restarted container: ${container.id}`);
        } catch (error) {
          console.error(`Failed to restart ${container.id}:`, error);
        }
      }

      return new Response(JSON.stringify({
        failedCount: failed.length,
        healedCount: healed.length,
        healed,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  private async listContainers(): Promise<Response> {
    try {
      const containers = await this.env.MCP_DOCKER.call('list_containers', { all: true });
      return new Response(JSON.stringify({ containers }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  private async deployContainer(request: Request): Promise<Response> {
    const { image, name, ports, env } = await request.json<any>();

    try {
      const container = await this.env.MCP_DOCKER.call('create_container', {
        image,
        name,
        hostConfig: {
          portBindings: ports,
          restartPolicy: { name: 'unless-stopped' },
        },
        env,
      });

      // Start the container
      await this.env.MCP_DOCKER.call('start_container', {
        id: container.id,
      });

      return new Response(JSON.stringify({
        success: true,
        containerId: container.id,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  private async updateConfig(request: Request): Promise<Response> {
    const config = await request.json<Partial<DockerState>>();
    
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
      monitoredContainers: Array.from(this.state.monitoredContainers.entries()),
    });
  }
}