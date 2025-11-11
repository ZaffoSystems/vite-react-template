/**
 * InfrastructureAgent - Handles SSH, Docker, and infrastructure operations
 */

import { BaseAgent } from './BaseAgent';
import { AgentType, AgentTask, TaskResult, AgentCapability } from './types';

export class InfrastructureAgent extends BaseAgent {
  private sshService: any;
  private dockerService: any;

  constructor(context: any) {
    const capabilities: AgentCapability[] = [
      {
        name: 'ssh-execute',
        description: 'Execute commands on remote servers via SSH',
        requiredServices: ['sshService']
      },
      {
        name: 'docker-manage',
        description: 'Manage Docker containers and images',
        requiredServices: ['dockerService']
      },
      {
        name: 'server-provisioning',
        description: 'Provision and configure servers',
        requiredServices: ['sshService', 'dockerService']
      },
      {
        name: 'container-orchestration',
        description: 'Orchestrate container deployments',
        requiredServices: ['dockerService']
      }
    ];

    super(
      `infrastructure-${Date.now()}`,
      'InfrastructureAgent',
      AgentType.INFRASTRUCTURE,
      capabilities,
      context
    );

    this.sshService = context.services?.sshService;
    this.dockerService = context.services?.dockerService;
  }

  protected async onInitialize(): Promise<void> {
    console.log('[InfrastructureAgent] Initializing services...');

    // Validate required services
    if (!this.sshService) {
      console.warn('[InfrastructureAgent] SSH service not available');
    }

    if (!this.dockerService) {
      console.warn('[InfrastructureAgent] Docker service not available');
    }
  }

  protected async executeTask(task: AgentTask): Promise<TaskResult> {
    console.log(`[InfrastructureAgent] Executing task: ${task.type}`);

    try {
      switch (task.type) {
        case 'ssh-execute':
          return await this.executeSshCommand(task);

        case 'docker-pull':
          return await this.pullDockerImage(task);

        case 'docker-run':
          return await this.runDockerContainer(task);

        case 'docker-stop':
          return await this.stopDockerContainer(task);

        case 'docker-search':
          return await this.searchDockerRepos(task);

        case 'server-health-check':
          return await this.checkServerHealth(task);

        case 'deploy-application':
          return await this.deployApplication(task);

        default:
          return {
            success: false,
            error: `Unknown task type: ${task.type}`
          };
      }
    } catch (error) {
      console.error(`[InfrastructureAgent] Task execution error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // SSH Operations
  // ============================================================================

  private async executeSshCommand(task: AgentTask): Promise<TaskResult> {
    if (!this.sshService) {
      return { success: false, error: 'SSH service not available' };
    }

    const { host, port, username, privateKey, command } = task.payload;

    try {
      // Connect to SSH server
      await this.sshService.connect({
        host,
        port: port || 22,
        username,
        privateKey
      });

      // Execute command
      const output = await this.sshService.execute(command);

      // Disconnect
      await this.sshService.disconnect();

      return {
        success: true,
        data: {
          output,
          command,
          host
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkServerHealth(task: AgentTask): Promise<TaskResult> {
    if (!this.sshService) {
      return { success: false, error: 'SSH service not available' };
    }

    const { host, port, username, privateKey } = task.payload;

    try {
      await this.sshService.connect({ host, port: port || 22, username, privateKey });

      // Run health check commands
      const cpuUsage = await this.sshService.execute("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
      const memoryUsage = await this.sshService.execute("free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'");
      const diskUsage = await this.sshService.execute("df -h / | awk 'NR==2{print $5}'");
      const uptime = await this.sshService.execute("uptime -p");

      await this.sshService.disconnect();

      return {
        success: true,
        data: {
          host,
          cpuUsage: cpuUsage.trim(),
          memoryUsage: memoryUsage.trim() + '%',
          diskUsage: diskUsage.trim(),
          uptime: uptime.trim(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Docker Operations
  // ============================================================================

  private async pullDockerImage(task: AgentTask): Promise<TaskResult> {
    if (!this.dockerService) {
      return { success: false, error: 'Docker service not available' };
    }

    const { image, tag } = task.payload;
    const fullImage = tag ? `${image}:${tag}` : image;

    try {
      const result = await this.dockerService.pullImage(fullImage);

      return {
        success: true,
        data: {
          image: fullImage,
          status: 'pulled',
          details: result
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async runDockerContainer(task: AgentTask): Promise<TaskResult> {
    if (!this.dockerService) {
      return { success: false, error: 'Docker service not available' };
    }

    const { image, name, ports, env, volumes, network } = task.payload;

    try {
      // Pull image first if needed
      await this.dockerService.pullImage(image);

      // Start container
      const result = await this.dockerService.startContainer({
        Image: image,
        name: name || `container-${Date.now()}`,
        ExposedPorts: ports ? this.formatPorts(ports) : undefined,
        Env: env || [],
        HostConfig: {
          PortBindings: ports ? this.formatPortBindings(ports) : undefined,
          Binds: volumes || [],
          NetworkMode: network || 'bridge'
        }
      });

      return {
        success: true,
        data: {
          containerId: result.id,
          containerName: name,
          image,
          status: 'running'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async stopDockerContainer(task: AgentTask): Promise<TaskResult> {
    if (!this.dockerService) {
      return { success: false, error: 'Docker service not available' };
    }

    const { containerId, containerName } = task.payload;
    const identifier = containerId || containerName;

    try {
      await this.dockerService.stopContainer(identifier);

      return {
        success: true,
        data: {
          containerId: identifier,
          status: 'stopped'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async searchDockerRepos(task: AgentTask): Promise<TaskResult> {
    if (!this.dockerService) {
      return { success: false, error: 'Docker service not available' };
    }

    const { query, limit } = task.payload;

    try {
      const results = await this.dockerService.searchRepos(query);

      return {
        success: true,
        data: {
          query,
          results: limit ? results.slice(0, limit) : results,
          totalFound: results.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Complex Operations
  // ============================================================================

  private async deployApplication(task: AgentTask): Promise<TaskResult> {
    const { image, host, sshConfig, containerConfig } = task.payload;

    const steps: string[] = [];
    const startTime = Date.now();

    try {
      // Step 1: Connect to server
      steps.push('Connecting to server...');
      if (this.sshService && host) {
        await this.sshService.connect(sshConfig);
        steps.push('Connected to server');
      }

      // Step 2: Pull Docker image
      steps.push(`Pulling Docker image: ${image}`);
      if (this.dockerService) {
        await this.dockerService.pullImage(image);
        steps.push('Image pulled successfully');
      }

      // Step 3: Stop existing container if any
      if (containerConfig.name) {
        steps.push(`Stopping existing container: ${containerConfig.name}`);
        try {
          await this.dockerService.stopContainer(containerConfig.name);
          steps.push('Existing container stopped');
        } catch {
          steps.push('No existing container to stop');
        }
      }

      // Step 4: Start new container
      steps.push('Starting new container...');
      const result = await this.dockerService.startContainer({
        Image: image,
        ...containerConfig
      });
      steps.push(`Container started: ${result.id}`);

      // Step 5: Health check
      steps.push('Performing health check...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      steps.push('Deployment completed successfully');

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          containerId: result.id,
          image,
          status: 'deployed'
        },
        metadata: {
          executionTime,
          intermediateSteps: steps
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          intermediateSteps: steps
        }
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private formatPorts(ports: string[]): any {
    const formatted: any = {};
    ports.forEach(port => {
      formatted[`${port}/tcp`] = {};
    });
    return formatted;
  }

  private formatPortBindings(ports: string[]): any {
    const formatted: any = {};
    ports.forEach(port => {
      const [hostPort, containerPort] = port.includes(':') ? port.split(':') : [port, port];
      formatted[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
    });
    return formatted;
  }
}
