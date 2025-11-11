# 🚀 Complete Setup Guide

Welcome to the Ultra Multi-Agent System! This guide will walk you through setting up your production-ready multi-agent system with 25+ MCP servers.

## 📚 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Node.js** 18+ installed
- **npm** or **yarn**
- **Git**
- **Cloudflare account** (free tier works!)
- **Terminal/Command line** access

### Recommended

- **VS Code** or similar IDE
- **Wrangler** CLI familiarity
- Basic understanding of TypeScript/React

---

## Quick Start

### For the Impatient 🚀

```bash
# 1. Clone and navigate
git checkout feature/multi-agent-mcp-system
npm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Run the setup wizard
npm run setup:wizard

# 4. Start developing
npm run dev
```

The setup wizard will:
- Create all Cloudflare resources
- Update configuration files
- Apply database schema
- Generate a configuration report

---

## Detailed Setup

### Step 1: Environment Preparation

#### 1.1 Check out the branch

```bash
git checkout feature/multi-agent-mcp-system
```

#### 1.2 Install dependencies

```bash
npm install
```

This installs:
- Cloudflare Workers runtime
- React and Vite
- Hono framework
- TypeScript and tooling

---

### Step 2: Cloudflare Authentication

```bash
# Login to Cloudflare (opens browser)
npx wrangler login

# Verify authentication
npx wrangler whoami
```

You should see:
```
├ Getting User settings...
├─ Your Account ID: abc123def456
└─ Your Email: you@example.com
```

**Copy your Account ID** - you'll need it next!

---

### Step 3: Create Cloudflare Resources

#### 3.1 Create D1 Database

```bash
npx wrangler d1 create agent-database
```

Output:
```
✅ Successfully created DB 'agent-database'

[[d1_databases]]
binding = "DB"
database_name = "agent-database"
database_id = "YOUR_D1_ID"  # <-- Copy this!
```

#### 3.2 Create Vectorize Index

```bash
npx wrangler vectorize create agent-memory --dimensions=768 --metric=cosine
```

#### 3.3 Create KV Namespaces

```bash
# CACHE namespace
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview

# MCP_OAUTH namespace
npx wrangler kv:namespace create MCP_OAUTH
npx wrangler kv:namespace create MCP_OAUTH --preview

# MEMORY namespace
npx wrangler kv:namespace create MEMORY
```

**Save all the IDs** that are output!

---

### Step 4: Update Configuration

#### 4.1 Edit `wrangler.toml`

Open `wrangler.toml` and replace:

```toml
account_id = "YOUR_ACCOUNT_ID"  # From Step 2

[[d1_databases]]
binding = "DB"
database_name = "agent-database"
database_id = "YOUR_D1_DATABASE_ID"  # From Step 3.1

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_CACHE_KV_ID"  # From Step 3.3
preview_id = "YOUR_CACHE_PREVIEW_KV_ID"

[[kv_namespaces]]
binding = "MCP_OAUTH"
id = "YOUR_MCP_OAUTH_KV_ID"  # From Step 3.3
preview_id = "YOUR_MCP_OAUTH_PREVIEW_KV_ID"

[[kv_namespaces]]
binding = "MEMORY"
id = "YOUR_MEMORY_KV_ID"  # From Step 3.3
```

---

### Step 5: Database Schema

#### 5.1 Apply the schema

```bash
npm run db:migrate
```

This creates all necessary tables in your D1 database.

#### 5.2 Verify schema

```bash
npx wrangler d1 execute agent-database --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see:
- agents
- tasks
- conversations
- mcp_connections
- workflows
- memories
- thinking_steps
- research_sessions
- code_executions

---

### Step 6: API Keys (Optional but Recommended)

See `API_KEYS_SETUP.md` for detailed instructions.

#### Quick setup:

```bash
# Get API keys from:
# - E2B: https://e2b.dev
# - Firecrawl: https://firecrawl.dev
# - Brave Search: https://brave.com/search/api/

# Set secrets
wrangler secret put E2B_API_KEY
wrangler secret put FIRECRAWL_API_KEY
wrangler secret put BRAVE_API_KEY
```

**Note**: The system works without these, but with limited functionality.

---

## Configuration

### Environment Variables

Edit `wrangler.toml` to customize:

```toml
[vars]
ENVIRONMENT = "development"
ENABLE_MEMORY = "true"              # Enable persistent memory
ENABLE_SEQUENTIAL_THINKING = "true"  # Enable structured thinking
MAX_CONCURRENT_AGENTS = "10"         # Max simultaneous agents
```

### Local Development

Create `.dev.vars` for local API keys:

```env
E2B_API_KEY=your-key
FIRECRAWL_API_KEY=your-key
BRAVE_API_KEY=your-key
```

**Important**: Add `.dev.vars` to `.gitignore`!

---

## Verification

### Test Local Development

```bash
# Start dev server
npm run dev
```

Visit http://localhost:8787

You should see:
- ✅ React frontend loads
- ✅ "Ultra Multi-Agent System" header
- ✅ Chat interface
- ✅ Agent builder form

### Test API Endpoints

```bash
# Health check
curl http://localhost:8787/health

# Should return:
# {"status":"healthy","timestamp":"..."}

# Initialize MCP servers
curl -X POST http://localhost:8787/api/meta/initialize

# Should return:
# {"connected":25,"totalTools":150+,...}
```

### Verify MCP Servers

```bash
# List all MCP tools
curl http://localhost:8787/api/meta/mcp-tools | jq
```

You should see tools from all 25+ MCP servers!

---

## Deployment

### Deploy to Production

```bash
# Build and deploy
npm run deploy
```

Output:
```
✅ Uploaded ultra-multi-agent-system
✅ Deployed ultra-multi-agent-system
🔗 https://ultra-multi-agent-system.your-subdomain.workers.dev
```

### Deploy to Custom Domain

1. Add custom domain in Cloudflare dashboard
2. Update `wrangler.toml`:
   ```toml
   routes = [
     { pattern = "agents.yourdomain.com", custom_domain = true }
   ]
   ```
3. Deploy: `npm run deploy`

### Production Environment

```bash
# Deploy to production environment
npm run deploy:prod

# Monitor production logs
npm run tail:prod
```

---

## Troubleshooting

### Common Issues

#### 1. "Account ID not set"

**Problem**: `wrangler.toml` not configured

**Solution**:
```bash
npx wrangler whoami  # Get Account ID
# Update wrangler.toml with the ID
```

#### 2. "Database not found"

**Problem**: D1 database not created or ID mismatch

**Solution**:
```bash
npx wrangler d1 list  # List existing databases
# Update database_id in wrangler.toml
```

#### 3. "MCP server connection failed"

**Problem**: API keys not set or invalid

**Solution**:
```bash
# Check which secrets are set
wrangler secret list

# Re-set the secret
wrangler secret put E2B_API_KEY
```

#### 4. "Build fails"

**Problem**: Missing dependencies or type errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npm run type-check
```

#### 5. "Dev server won't start"

**Problem**: Port already in use

**Solution**:
```bash
# Kill process on port 8787
lsof -ti:8787 | xargs kill -9  # macOS/Linux

# Or use different port
npx wrangler dev --port 8788
```

### Getting Help

1. **Check logs**: `npm run tail`
2. **GitHub Issues**: Report bugs on the repository
3. **Cloudflare Docs**: https://developers.cloudflare.com
4. **MCP Documentation**: https://modelcontextprotocol.io

---

## Next Steps

Once setup is complete:

1. 📚 Read `README.md` for usage examples
2. 🔑 Set up API keys (see `API_KEYS_SETUP.md`)
3. 🛠️ Review implementation files in `src/agents/`
4. 🎨 Customize React frontend in `src/client/`
5. 🚀 Deploy to production!

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:remote       # Dev with remote resources

# Building
npm run build            # Build for production
npm run type-check       # Check TypeScript

# Deployment
npm run deploy           # Deploy to Cloudflare
npm run deploy:prod      # Deploy production

# Database
npm run db:migrate       # Apply schema
npm run db:backup        # Backup database

# Monitoring
npm run tail             # Watch logs
npm run tail:prod        # Watch production logs
```

### Important Files

- `wrangler.toml` - Cloudflare configuration
- `schema.sql` - Database schema
- `src/types.ts` - TypeScript definitions
- `src/index.ts` - Main worker entry
- `src/agents/` - Agent implementations
- `src/client/` - React frontend

---

## Success Checklist

- [ ] Node.js and npm installed
- [ ] Cloudflare account created
- [ ] Wrangler authentication completed
- [ ] D1 database created
- [ ] Vectorize index created
- [ ] KV namespaces created
- [ ] `wrangler.toml` updated with IDs
- [ ] Database schema applied
- [ ] API keys set (optional)
- [ ] Dev server runs successfully
- [ ] MCP servers initialized
- [ ] Deployed to Cloudflare

---

🎉 **Congratulations!** Your ultra multi-agent system is ready!

Now go build something amazing! 🚀
