import { DurableObject } from 'cloudflare:workers';
import { AgentConfig, Task } from '../types/env';

/**
 * AgentState Durable Object
 * Manages persistent state for individual agents including memory, context, and task history
 */
export class AgentState extends DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (request.method) {
        case 'GET':
          if (path === '/state') {
            return this.getState();
          } else if (path === '/memory') {
            return this.getMemory();
          } else if (path === '/tasks') {
            return this.getTasks();
          }
          break;

        case 'POST':
          if (path === '/initialize') {
            return this.initialize(await request.json());
          } else if (path === '/update') {
            return this.updateState(await request.json());
          } else if (path === '/add-memory') {
            return this.addMemory(await request.json());
          } else if (path === '/add-task') {
            return this.addTask(await request.json());
          } else if (path === '/heartbeat') {
            return this.heartbeat();
          }
          break;

        case 'DELETE':
          if (path === '/reset') {
            return this.reset();
          }
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getState(): Promise<Response> {
    const config = await this.state.storage.get<AgentConfig>('config');
    const status = await this.state.storage.get<string>('status');
    const lastHeartbeat = await this.state.storage.get<number>('lastHeartbeat');
    const metrics = await this.state.storage.get<any>('metrics');

    return new Response(JSON.stringify({
      config,
      status: status || 'idle',
      lastHeartbeat,
      metrics: metrics || {
        tasksCompleted: 0,
        tasksFailedtotal: 0,
        avgResponseTime: 0,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async initialize(data: { config: AgentConfig }): Promise<Response> {
    await this.state.storage.put('config', data.config);
    await this.state.storage.put('status', 'idle');
    await this.state.storage.put('createdAt', Date.now());
    await this.state.storage.put('lastHeartbeat', Date.now());
    await this.state.storage.put('memory', []);
    await this.state.storage.put('tasks', []);
    await this.state.storage.put('metrics', {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTasks: 0,
      avgResponseTime: 0,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateState(data: { status?: string; config?: Partial<AgentConfig> }): Promise<Response> {
    if (data.status) {
      await this.state.storage.put('status', data.status);
    }

    if (data.config) {
      const currentConfig = await this.state.storage.get<AgentConfig>('config');
      if (currentConfig) {
        await this.state.storage.put('config', { ...currentConfig, ...data.config });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getMemory(): Promise<Response> {
    const memory = await this.state.storage.get<any[]>('memory') || [];
    return new Response(JSON.stringify({ memory }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async addMemory(data: { type: string; content: any; metadata?: any }): Promise<Response> {
    const memory = await this.state.storage.get<any[]>('memory') || [];
    const entry = {
      ...data,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };

    memory.push(entry);

    // Keep last 1000 memory entries
    if (memory.length > 1000) {
      memory.shift();
    }

    await this.state.storage.put('memory', memory);

    return new Response(JSON.stringify({ success: true, id: entry.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getTasks(): Promise<Response> {
    const tasks = await this.state.storage.get<Task[]>('tasks') || [];
    return new Response(JSON.stringify({ tasks }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async addTask(task: Task): Promise<Response> {
    const tasks = await this.state.storage.get<Task[]>('tasks') || [];
    tasks.push(task);

    // Keep last 100 tasks
    if (tasks.length > 100) {
      tasks.shift();
    }

    await this.state.storage.put('tasks', tasks);

    // Update metrics
    const metrics = await this.state.storage.get<any>('metrics') || {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTasks: 0,
      avgResponseTime: 0,
    };

    metrics.totalTasks++;

    if (task.status === 'completed') {
      metrics.tasksCompleted++;
      if (task.completedAt && task.startedAt) {
        const responseTime = task.completedAt - task.startedAt;
        metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.tasksCompleted - 1) + responseTime) / metrics.tasksCompleted;
      }
    } else if (task.status === 'failed') {
      metrics.tasksFailed++;
    }

    await this.state.storage.put('metrics', metrics);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async heartbeat(): Promise<Response> {
    await this.state.storage.put('lastHeartbeat', Date.now());
    return new Response(JSON.stringify({ success: true, timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async reset(): Promise<Response> {
    await this.state.storage.deleteAll();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
