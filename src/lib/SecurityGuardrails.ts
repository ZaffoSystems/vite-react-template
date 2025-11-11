// SecurityGuardrails - Comprehensive security for agent system
import type { Env } from '../types';

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableOutputFiltering: boolean;
  enableAuditLogging: boolean;
  allowedModels: string[];
  allowedMcpServers: string[];
  dangerousCommandPatterns: RegExp[];
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
}

export class SecurityGuardrails {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableRateLimiting: true,
      enableInputValidation: true,
      enableOutputFiltering: true,
      enableAuditLogging: true,
      allowedModels: [
        'dynamic/RE_Ant',
        'dynamic/support',
        'dynamic/research',
        '@cf/meta/llama-3.1-8b-instruct',
        '@cf/meta/llama-3-8b-instruct',
      ],
      allowedMcpServers: [
        'docs', 'bindings', 'builds', 'observability', 'radar',
        'container', 'browser', 'logpush', 'ai-gateway', 'ai-search',
        'audit-logs', 'dns-analytics', 'dex', 'casb', 'graphql',
        'context7', 'e2b', 'firecrawl', 'brave-search',
        'sequential-thinking', 'filesystem', 'docker', 'ssh',
      ],
      dangerousCommandPatterns: [
        /rm\s+-rf\s+\/\s*$/,  // rm -rf /
        /dd\s+if=/,            // dd command
        /:\(\)\{\s*:\|:\&\s*\};:/, // fork bomb
        /curl.*\|.*sh/,        // curl pipe to shell
        /wget.*\|.*sh/,        // wget pipe to shell
        /mkfs\./,              // format filesystem
        /shutdown/,            // shutdown system
        /reboot/,              // reboot system
      ],
      maxTokensPerRequest: 4096,
      maxRequestsPerMinute: 60,
      ...config,
    };
  }

  // GUARDRAIL 1: Validate model/route selection
  validateModel(model: string): { valid: boolean; reason?: string } {
    if (!this.config.enableInputValidation) {
      return { valid: true };
    }

    if (!this.config.allowedModels.includes(model)) {
      return {
        valid: false,
        reason: `Model '${model}' is not in the allowed list. Use one of: ${this.config.allowedModels.join(', ')}`,
      };
    }

    return { valid: true };
  }

  // GUARDRAIL 2: Validate MCP server access
  validateMcpServer(serverName: string): { valid: boolean; reason?: string } {
    if (!this.config.allowedMcpServers.includes(serverName)) {
      return {
        valid: false,
        reason: `MCP server '${serverName}' is not authorized`,
      };
    }

    return { valid: true };
  }

  // GUARDRAIL 3: Validate SSH/Docker commands for dangerous patterns
  validateCommand(command: string): { valid: boolean; reason?: string } {
    for (const pattern of this.config.dangerousCommandPatterns) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Command contains dangerous pattern: ${pattern.source}`,
        };
      }
    }

    return { valid: true };
  }

  // GUARDRAIL 4: Rate limiting
  checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true };
    }

    const now = Date.now();
    const userLimit = this.requestCounts.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      // Reset or initialize
      this.requestCounts.set(userId, {
        count: 1,
        resetAt: now + 60000, // 1 minute
      });
      return { allowed: true };
    }

    if (userLimit.count >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.maxRequestsPerMinute} requests/minute`,
      };
    }

    userLimit.count++;
    return { allowed: true };
  }

  // GUARDRAIL 5: Input sanitization
  sanitizeInput(input: string): string {
    // Remove potential prompt injection patterns
    let sanitized = input;

    // Remove system prompt overrides
    sanitized = sanitized.replace(/\[SYSTEM\].*?\[\/SYSTEM\]/gs, '');
    sanitized = sanitized.replace(/\{\{system\}\}.*?\{\{\/system\}\}/gs, '');
    
    // Remove potential code execution
    sanitized = sanitized.replace(/`\s*exec\(/g, '');
    sanitized = sanitized.replace(/eval\(/g, '');

    // Truncate to reasonable length
    if (sanitized.length > 10000) {
      sanitized = sanitized.slice(0, 10000);
    }

    return sanitized;
  }

  // GUARDRAIL 6: Output filtering
  filterOutput(output: string): string {
    if (!this.config.enableOutputFiltering) {
      return output;
    }

    // Remove potential sensitive data patterns
    let filtered = output;

    // Redact API keys (basic pattern)
    filtered = filtered.replace(/['"]?[a-zA-Z0-9_-]{32,}['"]?/g, '[REDACTED]');
    
    // Redact emails
    filtered = filtered.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    return filtered;
  }

  // GUARDRAIL 7: Audit logging
  async auditLog(
    env: Env,
    event: {
      userId?: string;
      agentId?: string;
      action: string;
      resource: string;
      allowed: boolean;
      reason?: string;
    }
  ): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, user_id, agent_id, action, resource, allowed, reason, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        event.userId || null,
        event.agentId || null,
        event.action,
        event.resource,
        event.allowed ? 1 : 0,
        event.reason || null
      ).run();
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // GUARDRAIL 8: Token budget enforcement
  validateTokenBudget(requestedTokens: number): { valid: boolean; reason?: string } {
    if (requestedTokens > this.config.maxTokensPerRequest) {
      return {
        valid: false,
        reason: `Token request ${requestedTokens} exceeds maximum ${this.config.maxTokensPerRequest}`,
      };
    }

    return { valid: true };
  }
}

// Factory function
export function createSecurityGuardrails(env: Env): SecurityGuardrails {
  return new SecurityGuardrails({
    enableRateLimiting: env.ENABLE_RATE_LIMITING !== 'false',
    enableInputValidation: env.ENABLE_INPUT_VALIDATION !== 'false',
    enableOutputFiltering: env.ENABLE_OUTPUT_FILTERING !== 'false',
    enableAuditLogging: env.ENABLE_AUDIT_LOGGING !== 'false',
    maxRequestsPerMinute: parseInt(env.MAX_REQUESTS_PER_MINUTE || '60'),
    maxTokensPerRequest: parseInt(env.MAX_TOKENS_PER_REQUEST || '4096'),
  });
}
