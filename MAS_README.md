# MAS Master Control Agent System

A fully-functional Multi-Agent System (MAS) built on Cloudflare Workers with complete infrastructure management capabilities.

## 🎯 Features

### Multi-Agent Types
- **Utility Agent**: General-purpose task execution
- **Learning Agent**: Learns from feedback and improves over time
- **Dynamic Agent**: Adapts model selection based on task complexity
- **React Agent**: Reasons and acts in iterative loops
- **Infrastructure Agent**: Manages all Cloudflare resources

### Core Capabilities
- ✅ **CF AI Gateway Integration** - Full dynamic routing with authenticated headers
- ✅ **13 Cloudflare MCP Servers** - Complete integration with all official CF MCP servers
- ✅ **Infrastructure Management** - Deploy Workers, manage KV/D1/R2, control all CF resources
- ✅ **Docker Hub Sync** - Auto-sync images and trigger deployments
- ✅ **RAG System** - Auto-ingest documents from R2 with Vectorize
- ✅ **SSH Gateway** - WebSocket-based SSH sessions with Durable Objects
- ✅ **Agent Orchestration** - Task queuing, priority scheduling, retry logic
- ✅ **Zero Trust Ready** - Built-in authentication support

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         React Dashboard (Frontend)       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│      Master Control Agent (Worker)       │
│  ┌──────────────────────────────────┐  │
│  │    Agent Orchestrator            │  │
│  │ • Task Queue  • Agent Registry   │  │
│  └──────────────────────────────────┘  │
│                                          │
│  ┌──── CF MCP Servers (13) ────┐       │
│  │ AI Gateway │ Radar │ DNS ... │       │
│  └───────────────────────────────┘       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│     Cloudflare Infrastructure            │
│  D1 │ R2 │ KV │ Vectorize │ Queues      │
│  Durable Objects │ AI │ Workers          │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Cloudflare account with Workers Paid plan (for Durable Objects, D1, Vectorize)
- Node.js 18+
- Wrangler CLI

### Installation

```bash
# Clone and install dependencies
npm install

# Set up Cloudflare resources
npm run setup:resources

# Create .dev.vars file
cat > .dev.vars << EOF
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
AI_GATEWAY_ACCOUNT_ID=your_account_id
AI_GATEWAY_ID=your_gateway_id
AI_GATEWAY_TOKEN=your_gateway_token
DOCKER_HUB_USERNAME=optional
DOCKER_HUB_TOKEN=optional
EOF

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## 📡 API Endpoints

### Agent Management
- `POST /api/agents` - Create new agent
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent status
- `GET /api/agents/:id/memory` - Get agent memory

### Task Management
- `POST /api/tasks` - Dispatch new task
- `GET /api/tasks` - List tasks
- `GET /api/tasks/:id` - Get task status

### Cloudflare Infrastructure
- `GET /api/cf/workers` - List Workers
- `POST /api/cf/workers` - Deploy Worker
- `GET /api/cf/kv` - List KV namespaces
- `GET /api/cf/d1` - List D1 databases
- `GET /api/cf/r2` - List R2 buckets
- `POST /api/cf/d1/:id/query` - Query D1 database

### MCP Integration (13 Servers)
- `POST /api/mcp-cf/init` - Initialize all CF MCP servers
- `GET /api/mcp-cf/servers` - List available servers
- `POST /api/mcp-cf/ai-gateway/search-logs` - Search AI Gateway logs
- `POST /api/mcp-cf/radar/traffic` - Get Radar traffic insights
- `GET /api/mcp-cf/dns/:zoneId/config` - Get DNS config
- `POST /api/mcp-cf/docs/search` - Search CF documentation
- `POST /api/mcp-cf/workers-bindings/d1/query` - Query via MCP
- `POST /api/mcp-cf/browser/fetch` - Fetch webpage via Browser Rendering
- `POST /api/mcp-cf/browser/playwright` - Run Playwright scripts
- `POST /api/mcp-cf/container/create` - Create sandbox container
- `GET /api/mcp-cf/casb/security-posture` - Get CASB security posture

### RAG System
- `POST /api/rag/ingest` - Ingest document
- `POST /api/rag/ingest/r2` - Auto-ingest from R2
- `POST /api/rag/search` - Semantic search
- `POST /api/rag/query` - RAG-enhanced query
- `GET /api/rag/documents` - List documents

### SSH Sessions
- `POST /api/ssh/connect` - Create SSH session
- `POST /api/ssh/:sessionId/execute` - Execute command
- `GET /api/ssh/:sessionId/ws` - WebSocket connection

### Docker Hub
- `GET /api/docker/repositories` - List repositories
- `GET /api/docker/:repo/tags` - List tags
- `POST /api/docker/sync` - Sync repository

### AI Gateway
- `POST /api/ai/chat` - Chat completion
- `POST /api/ai/dynamic` - Dynamic routing
- `GET /api/ai/models` - List models
- `POST /api/ai/embedding` - Generate embedding
- `GET /api/ai/logs` - Get AI Gateway logs
- `POST /api/ai/feedback/:logId` - Send feedback

## 🤖 Agent Usage Examples

### Create a Utility Agent
```bash
curl -X POST http://localhost:8787/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Assistant",
    "type": "utility",
    "capabilities": {
      "canManageInfrastructure": false,
      "canQueryRAG": true,
      "canLearn": false
    },
    "model": "@cf/meta/llama-3.1-8b-instruct-fast"
  }'
```

### Create an Infrastructure Agent
```bash
curl -X POST http://localhost:8787/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Infrastructure Manager",
    "type": "infrastructure",
    "capabilities": {
      "canManageInfrastructure": true,
      "canDeployWorkers": true,
      "canAccessSSH": true
    }
  }'
```

### Dispatch a Task
```bash
curl -X POST http://localhost:8787/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "infrastructure",
    "priority": 1,
    "payload": {
      "action": "list_workers"
    }
  }'
```

## 🔌 Cloudflare MCP Servers

This system integrates all 13 official Cloudflare MCP servers:

1. **AI Gateway** - Search logs, trace requests
2. **Radar** - Traffic insights, outage detection
3. **DNS Analytics** - Performance reports, recommendations
4. **Documentation** - Search CF docs
5. **Workers Bindings** - D1, R2, KV access
6. **Workers Logs** - Log search, statistics
7. **Logpush** - Job management
8. **AutoRAG** - Document search and retrieval
9. **Audit Logs** - Compliance reports
10. **Browser Rendering** - Web fetching, screenshots, Playwright
11. **Container** - Sandbox environments
12. **DEM** - Digital experience monitoring
13. **CASB** - Cloud access security

## 📊 Database Schema

The system uses D1 for persistent storage:

- `agents` - Agent registry
- `tasks` - Task queue and history
- `cf_resources` - CF resource inventory
- `worker_deployments` - Deployment history
- `docker_images` - Docker Hub sync state
- `rag_documents` - RAG document index
- `mcp_servers` - MCP server registry
- `ssh_sessions` - SSH session state
- `audit_logs` - System audit trail
- `agent_messages` - Inter-agent communication

## 🔐 Security

- Zero Trust authentication ready
- Cloudflare Access integration
- Secure key storage (BYOK)
- Audit logging for all operations
- SSH sessions isolated in Durable Objects
- API token authentication for CF API

## 🚢 Deployment

```bash
# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## 📝 Environment Variables

Required in `.dev.vars` (local) or Wrangler secrets (production):

```
CF_ACCOUNT_ID              # Cloudflare account ID
CF_API_TOKEN               # CF API token with appropriate permissions
AI_GATEWAY_ACCOUNT_ID      # Account ID for AI Gateway
AI_GATEWAY_ID              # AI Gateway ID
AI_GATEWAY_TOKEN           # AI Gateway authentication token
DOCKER_HUB_USERNAME        # Optional: Docker Hub username
DOCKER_HUB_TOKEN           # Optional: Docker Hub token
MCP_SERVER_URLS            # Optional: Additional MCP server URLs
RAG_CHUNK_SIZE             # Optional: RAG chunk size (default: 1000)
RAG_CHUNK_OVERLAP          # Optional: RAG overlap (default: 200)
```

## 🧪 Testing

The system includes comprehensive functionality:

- All agents are fully functional (no mocks/stubs)
- Real CF API integration
- Actual AI Gateway with dynamic routing
- Working Docker Hub sync
- Functional RAG with Vectorize
- Real SSH sessions via Durable Objects
- Complete MCP client implementation

## 📚 Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Language**: TypeScript
- **Database**: D1 (SQLite)
- **Storage**: R2
- **Cache**: KV
- **Vector DB**: Vectorize
- **Queue**: Cloudflare Queues
- **State**: Durable Objects
- **AI**: Cloudflare AI + AI Gateway
- **Protocol**: MCP (Model Context Protocol)

## 🤝 Contributing

This is a complete, production-ready MAS system. All components are fully implemented with no stub or mock code.

## 📄 License

See LICENSE file for details.

## 🔗 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare MCP Servers](https://developers.cloudflare.com/agents/model-context-protocol/)
