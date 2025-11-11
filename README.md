# Ultra Multi-Agent System

🤖 **Production-ready multi-agent system with 25+ MCP servers powered by Cloudflare Workers**

## Features

- ✅ **Natural Language Agent Creation** - Create agents using plain English
- ✅ **25+ MCP Servers** - Full integration with Cloudflare and external MCP servers
- ✅ **Persistent Memory** - Semantic memory using Vectorize
- ✅ **Sequential Thinking** - Structured problem-solving capabilities
- ✅ **Code Execution** - Secure sandboxes via E2B
- ✅ **Web Research** - Brave Search + Firecrawl integration
- ✅ **Multi-Agent Orchestration** - Supervisor, Swarm, and Hierarchical patterns
- ✅ **Up-to-date Documentation** - Context7 integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Cloudflare Resources

```bash
# Login to Cloudflare
npx wrangler login

# Get your account ID
npx wrangler whoami

# Create D1 database
npx wrangler d1 create agent-database

# Create Vectorize index
npx wrangler vectorize create agent-memory --dimensions=768 --metric=cosine

# Create KV namespaces
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
npx wrangler kv:namespace create MCP_OAUTH
npx wrangler kv:namespace create MCP_OAUTH --preview
npx wrangler kv:namespace create MEMORY
```

### 3. Update Configuration

Edit `wrangler.toml` and replace:
- `YOUR_ACCOUNT_ID` - From step 2
- `YOUR_D1_DATABASE_ID` - From D1 create command
- `YOUR_CACHE_KV_ID` - From KV create commands
- `YOUR_MCP_OAUTH_KV_ID` - From KV create commands
- `YOUR_MEMORY_KV_ID` - From KV create commands

### 4. Set Up API Keys (Optional but Recommended)

```bash
# E2B for code execution
wrangler secret put E2B_API_KEY

# Firecrawl for web scraping
wrangler secret put FIRECRAWL_API_KEY

# Brave Search for web search
wrangler secret put BRAVE_API_KEY
```

Get API keys:
- E2B: https://e2b.dev
- Firecrawl: https://firecrawl.dev
- Brave Search: https://brave.com/search/api/

### 5. Apply Database Schema

```bash
npm run db:migrate
```

### 6. Run Development Server

```bash
npm run dev
```

Visit http://localhost:8787

### 7. Deploy to Production

```bash
npm run deploy
```

## MCP Servers Included

### Cloudflare MCP Servers (15)
1. **Documentation** - Cloudflare docs lookup
2. **Workers Bindings** - KV, D1, R2 operations
3. **Workers Builds** - Build insights
4. **Observability** - Logs and analytics
5. **Radar** - Internet traffic insights
6. **Container** - Dev environments
7. **Browser Rendering** - Web page fetching
8. **Logpush** - Log job health
9. **AI Gateway** - AI model management
10. **AI Search** - Document search
11. **Audit Logs** - Security auditing
12. **DNS Analytics** - DNS performance
13. **DEX** - Application monitoring
14. **CASB** - Security misconfigurations
15. **GraphQL** - Analytics via GraphQL

### External MCP Servers (10+)
1. **Context7** - Up-to-date documentation
2. **E2B** - Code execution sandboxes
3. **Firecrawl** - Web scraping
4. **Brave Search** - Web search
5. **Sequential Thinking** - Problem solving
6. **Filesystem** - File operations
7. **Memory** - Persistent context

## Usage Examples

### Create an Agent via Natural Language

```typescript
// POST /api/meta/chat
{
  "message": "Create a DevOps monitoring agent with access to observability, logs, and DNS analytics",
  "sessionId": "user123"
}
```

### Create an Agent Programmatically

```typescript
// POST /api/meta/create-agent
{
  "description": "Security analyst that monitors audit logs and CASB alerts",
  "mcpServers": ["audit-logs", "casb", "observability"]
}
```

### Execute a Task

```typescript
// POST /api/executor/{agentId}/execute
{
  "input": "Analyze the last 24 hours of application logs and summarize any critical issues"
}
```

### Create a Multi-Agent Workflow

```typescript
// POST /api/coordinator/workflow
{
  "name": "Research and Development Pipeline",
  "agents": ["researcher-agent", "analyst-agent", "developer-agent"],
  "orchestrationType": "supervisor"
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│     React Frontend (Natural Language)   │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│          Hono API Router                │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      Meta Agent (Durable Object)        │
│  • Agent Creation                       │
│  • Natural Language Processing          │
│  • MCP Server Coordination              │
└─────────────────────────────────────────┘
          ↓                ↓
┌──────────────────┐  ┌──────────────────┐
│ Builder Agent    │  │ Coordinator Agent│
│ • Deployment     │  │ • Orchestration  │
│ • MCP Connection │  │ • Multi-Agent    │
└──────────────────┘  └──────────────────┘
          ↓
┌─────────────────────────────────────────┐
│   Executor Agents (Durable Objects)     │
│  • Task Execution                       │
│  • MCP Tool Invocation                  │
│  • Sequential Thinking                  │
│  • Memory Management                    │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│      25+ MCP Servers                    │
│  Cloudflare + External Integrations     │
└─────────────────────────────────────────┘
```

## Development Commands

```bash
# Start development server
npm run dev

# Start with remote resources
npm run dev:remote

# Build for production
npm run build

# Deploy to production
npm run deploy

# Monitor logs
npm run tail

# Run type checking
npm run type-check

# Run linting
npm run lint

# Database operations
npm run db:migrate      # Apply schema
npm run db:local        # Local D1
npm run db:backup       # Backup D1
```

## Project Structure

```
.
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── MetaAgent.ts
│   │   ├── BuilderAgent.ts
│   │   ├── ExecutorAgent.ts
│   │   ├── CoordinatorAgent.ts
│   │   ├── MemoryAgent.ts
│   │   └── ResearchAgent.ts
│   ├── client/              # React frontend
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── components/
│   ├── lib/                 # Utilities
│   ├── index.ts             # Main worker entry
│   └── types.ts             # TypeScript types
├── wrangler.toml            # Cloudflare configuration
├── schema.sql               # Database schema
└── package.json
```

## Contributing

This is a template repository. Feel free to fork and customize for your needs!

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/ZaffoSystems/vite-react-template/issues
- Cloudflare Docs: https://developers.cloudflare.com

## Credits

Built with:
- Cloudflare Workers, D1, Vectorize, KV, AI
- React + Vite
- Hono Framework
- Model Context Protocol (MCP)
