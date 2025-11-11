# 🔒 Security Setup Guide

Comprehensive security configuration for your autonomous multi-agent system.

---

## 🔑 Critical: Set AI Gateway Token

**NEVER commit this token to code!** Always use Wrangler secrets.

### Production
```bash
# Set your AI Gateway authentication token
wrangler secret put AI_GATEWAY_TOKEN
# When prompted, enter: iM6C8e-53yfivb00u5vKRYIP_a7ev713ouUcfnLO
```

### Local Development
Create `.dev.vars` file:
```env
# .dev.vars (DO NOT COMMIT)
AI_GATEWAY_TOKEN=iM6C8e-53yfivb00u5vKRYIP_a7ev713ouUcfnLO
```

Add to `.gitignore`:
```
.dev.vars
*.env
*.key
```

---

## 🛡️ Security Guardrails

All guardrails are configurable via `wrangler.toml`:

### 1. Rate Limiting
```toml
[vars]
ENABLE_RATE_LIMITING = "true"
MAX_REQUESTS_PER_MINUTE = "60"  # Adjust as needed
```

**What it does:**
- Limits requests per user/session
- Prevents abuse and DoS
- Tracked in `rate_limits` table

### 2. Input Validation
```toml
ENABLE_INPUT_VALIDATION = "true"
```

**What it blocks:**
- Prompt injection attempts
- System prompt overrides
- Malicious code execution
- Excessively long inputs

### 3. Command Validation
```toml
ENABLE_COMMAND_VALIDATION = "true"
```

**Dangerous patterns blocked:**
- `rm -rf /`
- `dd if=`
- Fork bombs
- `curl | sh` and `wget | sh`
- `mkfs.*` (filesystem formatting)
- `shutdown` / `reboot`

### 4. Output Filtering
```toml
ENABLE_OUTPUT_FILTERING = "true"
```

**What it redacts:**
- API keys (32+ char strings)
- Email addresses
- Potential PII

### 5. Audit Logging
```toml
ENABLE_AUDIT_LOGGING = "true"
```

**What it logs:**
- All API requests
- Agent actions
- Security violations
- Autonomous decisions
- MCP tool usage

---

## 👥 User Access Control

### Option 1: Cloudflare Access (Recommended)

Integrate with Cloudflare Access for enterprise SSO:

1. Enable Cloudflare Access in dashboard
2. Create access policy for your worker
3. Update `src/index.ts`:

```typescript
import { verifyToken } from '@cloudflare/workers-access';

app.use('/*', async (c, next) => {
  const token = c.req.header('CF-Access-JWT-Assertion');
  
  if (!token || !await verifyToken(token, c.env)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  await next();
});
```

### Option 2: API Key Authentication

```typescript
app.use('/api/*', async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  
  // Validate against KV or D1
  const valid = await c.env.CACHE.get(`apikey:${apiKey}`);
  
  if (!valid) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  
  await next();
});
```

---

## 📊 Monitoring & Alerts

### View Audit Logs
```bash
# Get recent audit logs
curl http://localhost:8787/api/audit/logs?limit=100

# Get security violations
curl http://localhost:8787/api/audit/violations

# Get autonomous actions
curl http://localhost:8787/api/supervisor/actions
```

### Set Up Alerts

Create alerts in Cloudflare Dashboard:
- High rate of failed requests
- Security violations detected
- Autonomous actions taken
- High resource usage

---

## ⚙️ Configurable Security Settings

Edit `wrangler.toml` to adjust:

```toml
[vars]
# Rate Limiting
MAX_REQUESTS_PER_MINUTE = "60"         # Requests per user
MAX_TOKENS_PER_REQUEST = "4096"        # Max tokens per call

# Feature Toggles
ENABLE_RATE_LIMITING = "true"
ENABLE_INPUT_VALIDATION = "true"
ENABLE_OUTPUT_FILTERING = "true"
ENABLE_AUDIT_LOGGING = "true"

# Autonomous System
ENABLE_AUTONOMOUS_MODE = "true"        # Disable for human-only control
AUTO_REMEDIATION_ENABLED = "true"      # Auto-fix infrastructure issues
```

---

## 🚨 Emergency Procedures

### Disable Autonomous Mode
```bash
curl -X POST http://localhost:8787/api/supervisor/toggle-autonomous
```

### Stop All Agents
```bash
# Update all agents to inactive
curl -X POST http://localhost:8787/api/admin/shutdown-all
```

### Review Recent Actions
```bash
# Last 50 autonomous actions
curl http://localhost:8787/api/supervisor/actions
```

---

## 📝 Best Practices

### ✅ DO
- Use Wrangler secrets for all tokens
- Enable audit logging in production
- Review autonomous actions regularly
- Set appropriate rate limits
- Use Cloudflare Access for sensitive operations
- Rotate secrets periodically
- Monitor security violation logs

### ❌ DON'T
- Commit secrets to Git
- Expose AI Gateway tokens to frontend
- Allow unrestricted model selection
- Disable security guardrails in production
- Allow SSH commands without validation
- Trust user input without sanitization

---

## 📊 Security Metrics Dashboard

Create a monitoring dashboard with:

1. **Request Rate** - Requests per minute
2. **Success Rate** - % successful requests
3. **Security Violations** - Count and types
4. **Autonomous Actions** - Recent actions taken
5. **Resource Usage** - CPU, memory, disk
6. **Agent Health** - Status of all agents

Query these from D1:
```sql
-- Security violations in last hour
SELECT violation_type, COUNT(*) as count
FROM security_violations
WHERE timestamp > datetime('now', '-1 hour')
GROUP BY violation_type;

-- Most active agents
SELECT agent_id, COUNT(*) as task_count
FROM tasks
WHERE created_at > datetime('now', '-24 hours')
GROUP BY agent_id
ORDER BY task_count DESC;
```

---

## ✅ Security Checklist

- [x] AI Gateway token stored as secret
- [x] Model validation enabled
- [x] Rate limiting configured
- [x] Input sanitization active
- [x] Output filtering enabled
- [x] Audit logging to D1
- [x] Dangerous command blocking
- [ ] Cloudflare Access configured (optional)
- [ ] API key system implemented (optional)
- [ ] Alert webhooks configured (optional)

---

**Your system has enterprise-grade security built-in!** 🔒
