import { DurableObject } from 'cloudflare:workers';

interface SSHSessionConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  credential: string;
}

interface SSHCommand {
  id: string;
  command: string;
  timestamp: number;
  output?: string;
  exitCode?: number;
  error?: string;
}

/**
 * SSHSession Durable Object
 * Manages WebSocket-based SSH sessions with persistent state
 * Handles command execution, output streaming, and session management
 */
export class SSHSession extends DurableObject {
  private state: DurableObjectState;
  private sessions: Map<string, WebSocket>;
  private commands: SSHCommand[];

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.state = state;
    this.sessions = new Map();
    this.commands = [];

    // Restore commands from storage
    this.state.storage.get<SSHCommand[]>('commands').then(cmds => {
      if (cmds) this.commands = cmds;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Handle WebSocket upgrade for SSH terminal
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocket(request);
      }

      switch (request.method) {
        case 'POST':
          if (path === '/connect') {
            return this.connect(await request.json());
          } else if (path === '/execute') {
            return this.executeCommand(await request.json());
          } else if (path === '/disconnect') {
            return this.disconnect();
          }
          break;

        case 'GET':
          if (path === '/status') {
            return this.getStatus();
          } else if (path === '/history') {
            return this.getHistory();
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

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection
    server.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, server);

    // Handle incoming messages
    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);

        switch (data.type) {
          case 'connect':
            await this.handleConnect(server, data.config);
            break;

          case 'command':
            await this.handleCommand(server, sessionId, data.command);
            break;

          case 'resize':
            // Handle terminal resize
            break;

          case 'ping':
            server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
        }
      } catch (error: any) {
        server.send(JSON.stringify({
          type: 'error',
          error: error.message,
        }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleConnect(ws: WebSocket, config: SSHSessionConfig): Promise<void> {
    // Store session config
    await this.state.storage.put('config', config);
    await this.state.storage.put('status', 'connected');
    await this.state.storage.put('connectedAt', Date.now());

    ws.send(JSON.stringify({
      type: 'connected',
      message: `Connected to ${config.host}:${config.port}`,
      timestamp: Date.now(),
    }));
  }

  private async handleCommand(ws: WebSocket, sessionId: string, command: string): Promise<void> {
    const cmdId = crypto.randomUUID();
    const cmd: SSHCommand = {
      id: cmdId,
      command,
      timestamp: Date.now(),
    };

    // In a real implementation, this would execute via SSH
    // For now, simulate command execution
    ws.send(JSON.stringify({
      type: 'output',
      commandId: cmdId,
      data: `Executing: ${command}\n`,
    }));

    // Simulate command execution
    setTimeout(() => {
      cmd.output = `Command "${command}" executed successfully\n`;
      cmd.exitCode = 0;

      this.commands.push(cmd);
      if (this.commands.length > 100) {
        this.commands.shift();
      }
      this.state.storage.put('commands', this.commands);

      ws.send(JSON.stringify({
        type: 'output',
        commandId: cmdId,
        data: cmd.output,
        exitCode: 0,
      }));
    }, 100);
  }

  private async connect(config: SSHSessionConfig): Promise<Response> {
    await this.state.storage.put('config', config);
    await this.state.storage.put('status', 'connecting');

    // In real implementation, establish SSH connection here
    // For now, mark as connected
    await this.state.storage.put('status', 'connected');
    await this.state.storage.put('connectedAt', Date.now());

    return new Response(JSON.stringify({
      success: true,
      message: 'SSH session established',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async executeCommand(data: { command: string }): Promise<Response> {
    const cmdId = crypto.randomUUID();
    const cmd: SSHCommand = {
      id: cmdId,
      command: data.command,
      timestamp: Date.now(),
    };

    // Simulate command execution
    cmd.output = `Executed: ${data.command}\n`;
    cmd.exitCode = 0;

    this.commands.push(cmd);
    if (this.commands.length > 100) {
      this.commands.shift();
    }
    await this.state.storage.put('commands', this.commands);

    return new Response(JSON.stringify({
      success: true,
      commandId: cmdId,
      output: cmd.output,
      exitCode: cmd.exitCode,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async disconnect(): Promise<Response> {
    // Close all WebSocket sessions
    for (const ws of this.sessions.values()) {
      ws.close();
    }
    this.sessions.clear();

    await this.state.storage.put('status', 'disconnected');
    await this.state.storage.put('disconnectedAt', Date.now());

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getStatus(): Promise<Response> {
    const config = await this.state.storage.get<SSHSessionConfig>('config');
    const status = await this.state.storage.get<string>('status');
    const connectedAt = await this.state.storage.get<number>('connectedAt');

    return new Response(JSON.stringify({
      config: config ? {
        host: config.host,
        port: config.port,
        username: config.username,
      } : null,
      status: status || 'idle',
      connectedAt,
      activeSessions: this.sessions.size,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getHistory(): Promise<Response> {
    return new Response(JSON.stringify({
      commands: this.commands.slice(-50), // Last 50 commands
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
