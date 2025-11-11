# Master Control Agent System 🚀

**Autonomous Cloudflare infrastructure management with natural language interface**

A complete Master Control Agent system built on Cloudflare Workers that understands natural language commands and autonomously provisions resources, generates code, deploys workers, and integrates with 71+ MCP servers.

![Master Control Agent](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fc7b4b62-442b-4769-641b-ad4422d74300/public)

---

## ✨ Key Features

### 🤖 Master Control Agent
- **Natural Language Processing** - Type commands like "build a worker to analyze google ads"
- **Autonomous Resource Provisioning** - Automatically creates KV, D1, R2, Vectorize, Hyperdrive, Queues
- **Code Generation** - Generates TypeScript worker code with proper bindings
- **Worker Deployment** - Deploys to Cloudflare with complete configuration
- **RAG Integration** - Semantic search over documentation and code examples
- **MCP Integration** - Access to 71+ MCP servers (GitHub, AWS, databases, etc.)

### 🏗️ Infrastructure Management
- **All 7 CF Resource Types**:
  - Workers (Serverless functions)
  - KV Namespaces (Key-value storage)
  - D1 Databases (SQLite at the edge)
  - R2 Buckets (Object storage)
  - Vectorize Indexes (Vector embeddings)
  - Hyperdrive (Database connection pooling)
  - Queues (Message queues)

### 🧠 RAG Document Management
- **Document Upload** - Chunk and embed documentation, code, API responses
- **Semantic Search** - Natural language search with relevance scores
- **4 Document Types** - Code, documentation, API responses, user notes
- **Vectorize Integration** - Stores embeddings for similarity search

### 📊 Real-Time Dashboard
- System metrics (resources, deployments, RAG documents, active tasks)
- Resource breakdown by type
- Deployment history with URLs and bindings
- Auto-refresh every 5 seconds

### 🔐 Secure Credential Management
- **86+ Environment Variables** across 24 service categories
- Web UI for credential input (no command line needed)
- Encrypted storage in KV namespace
- Support for: Cloudflare, GitHub, AWS, GCP, Azure, databases, monitoring, etc.

### 🔗 Dynamic Routing
- **Cloudflare AI Gateway** with `dynamic/RE_Ant` model
- Rate limiting and budget controls
- Conditional routing based on metadata
- Automatic fallback on errors
- A/B testing support

---

## 🚀 Quick Start

### Prerequisites

1. **Cloudflare Account** - [Sign up free](https://dash.cloudflare.com/sign-up)
2. **Node.js 18+** - [Download](https://nodejs.org/)
3. **Wrangler CLI** - Installed automatically with dependencies

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd vite-react-template

# Install dependencies
npm install

# Create Cloudflare resources
npm run setup:resources
```

### Environment Variables

**Method 1: Environment Tab (Recommended for local dev)**
Add to your `.dev.vars` file:
```env
CF_ACCOUNT_ID=your-cloudflare-account-id
CF_API_TOKEN=your-cloudflare-api-token
AI_GATEWAY_ACCOUNT_ID=your-ai-gateway-account-id
AI_GATEWAY_ID=your-ai-gateway-id
AI_GATEWAY_TOKEN=your-ai-gateway-token
```

**Method 2: Settings UI (After deployment)**
1. Deploy the application
2. Navigate to `/settings`
3. Enter all required variables
4. Click "Save All"

**Required Variables:**
- `CF_ACCOUNT_ID` - Your Cloudflare account ID
- `CF_API_TOKEN` - Cloudflare API token with Workers, D1, R2, KV permissions
- `AI_GATEWAY_ACCOUNT_ID` - AI Gateway account ID
- `AI_GATEWAY_ID` - AI Gateway gateway ID (e.g., "z-gateway")
- `AI_GATEWAY_TOKEN` - AI Gateway authentication token

**Optional Variables (for MCP servers):**
- AWS, GCP, Azure credentials
- Database connections (PostgreSQL, MySQL, MongoDB, Redis)
- API keys (GitHub, Slack, Linear, Jira, etc.)
- See Settings UI for all 86 available variables

### Database Setup

```bash
# Create D1 database
wrangler d1 create mas-control-db

# Update wrangler.json with database_id from above command
# Then run migrations
wrangler d1 migrations apply mas-control-db --local
```

### Vectorize Setup

```bash
# Create Vectorize index
wrangler vectorize create mas-rag-index --dimensions=768 --metric=cosine

# Update wrangler.json with index name
```

### Development

```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Production Deployment

```bash
# Build and deploy
npm run build
npm run deploy

# Or combined
npm run build && npm run deploy
```

---

## 📖 Usage Guide

### 1. Natural Language Commands

Navigate to **Chat** (`/chat`) and type commands:

```
"build a worker to analyze google ads"
"create a KV namespace called user-cache"
"deploy a worker with D1 database and Vectorize index"
"query my postgres database for active users"
"generate code for a rate limiter using R2"
```

The MasterAgent will:
1. Analyze your intent
2. Create an execution plan
3. Provision required resources
4. Generate worker code
5. Deploy to Cloudflare
6. Return deployment URL and resource IDs

### 2. Manual Resource Management

Navigate to **Infrastructure** (`/infrastructure`) to:

- **View** all workers, KV namespaces, D1 databases, R2 buckets, Vectorize indexes, Hyperdrive configs, and queues
- **Create** resources with configuration:
  - Vectorize: Set dimensions and distance metric
  - Hyperdrive: Configure connection string and database
  - Queues, KV, D1, R2: Simple name-based creation

### 3. RAG Document Management

Navigate to **RAG Manager** (`/rag`) to:

**Upload Tab:**
- Paste document content
- Select type (code, documentation, api_response, user_note)
- Add metadata (JSON format)
- System automatically chunks, embeds, and stores in Vectorize

**Search Tab:**
- Enter natural language query
- Get ranked results with relevance scores
- View matched chunks with context

**Statistics Tab:**
- View total documents and chunks
- See breakdown by document type

### 4. Deployment History

Navigate to **Agents** (`/agents`) or **Tasks** (`/tasks`) to:

- View all deployments with status
- Click deployment name for detailed view
- See resource bindings for each deployment
- Access live worker URLs
- Monitor deployment status (active/deploying/failed)

### 5. System Monitoring

Navigate to **Dashboard** (`/`) to view:

- Total CF resources across all types
- Worker deployments count
- RAG documents and chunks
- Active tasks
- Resources by type breakdown
- System health status

### 6. Credential Management

Navigate to **Settings** (`/settings`) to:

- Configure 86+ environment variables
- Organized by 24 categories
- Filter by category (cloudflare, database, cloud, etc.)
- Show/hide passwords
- Bulk save all credentials

---

## 🏗️ Architecture

### Backend Services

#### **MasterAgent** (`/src/worker/services/master-agent.ts`)
- Orchestrates all operations via natural language
- Creates execution plans
- Provisions resources
- Generates code
- Deploys workers

#### **ResourceManager** (`/src/worker/services/resource-manager.ts`)
- Creates and manages all CF resource types
- Tracks resources in D1 database
- Provides unified API for resource operations

#### **RAGService** (`/src/worker/services/rag-service.ts`)
- Document chunking (512 tokens, 64 token overlap)
- Embedding generation via CF AI Gateway
- Semantic search via Vectorize
- Statistics and analytics

#### **AIGatewayClient** (`/src/worker/lib/ai-gateway.ts`)
- Cloudflare AI Gateway integration
- Dynamic routing with `dynamic/RE_Ant` model
- Rate limiting and budget controls
- OpenAI-compatible API

### Frontend Components

#### **ChatInterface** (`/chat`)
- Natural language input
- Execution result display
- Deployment URLs and resource IDs

#### **InfrastructureControl** (`/infrastructure`)
- 7 tabs for each resource type
- Create resources with configuration
- View all existing resources

#### **Dashboard** (`/`)
- System overview and metrics
- Real-time statistics
- Resource breakdown

#### **RAGManager** (`/rag`)
- Upload, search, statistics tabs
- Document management UI

#### **AgentManagement** (`/agents`)
- MasterAgent capabilities display
- Deployment history
- Resource bindings view

#### **TaskMonitor** (`/tasks`)
- Deployment and resource activity log
- Filterable by type
- Real-time updates

#### **Settings** (`/settings`)
- 86 environment variables
- 24 service categories
- Encrypted storage

### Database Schema

**D1 Tables:**
- `deployments` - Worker deployment tracking
- `cf_resources` - Resource inventory
- `document_chunks` - RAG document storage
- `agents` - Agent configurations
- `tasks` - Task queue
- `credentials` - Encrypted credentials
- `conversations` - Chat history
- `learning_examples` - Agent learning data
- `system_config` - System settings

### API Endpoints

#### MasterAgent
- `POST /api/master/command` - Process natural language command
- `GET /api/master/status` - System status and metrics

#### Resources
- `POST /api/resources/kv` - Create KV namespace
- `POST /api/resources/d1` - Create D1 database
- `POST /api/resources/r2` - Create R2 bucket
- `POST /api/resources/vectorize` - Create Vectorize index
- `POST /api/resources/hyperdrive` - Create Hyperdrive config
- `POST /api/resources/queue` - Create queue
- `GET /api/resources?type={type}` - List resources

#### RAG Service
- `POST /api/rag-service/load` - Upload document
- `POST /api/rag-service/search` - Semantic search
- `GET /api/rag-service/statistics` - Get stats
- `DELETE /api/rag-service/documents/:id` - Delete document

#### Deployments
- `GET /api/deployments` - List deployments
- `GET /api/deployments/:id` - Get deployment details

#### Settings
- `GET /api/settings/credentials` - Load credentials
- `POST /api/settings/credentials` - Save credentials

---

## 🛠️ Configuration Files

### `wrangler.json`

```json
{
  "name": "mas-control-agent",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2025-10-08",
  "d1_databases": [
    { "binding": "DB", "database_name": "mas-control-db" }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "your-kv-id" }
  ],
  "vectorize": [
    { "binding": "VECTORIZE", "index_name": "mas-rag-index" }
  ],
  "ai": { "binding": "AI" }
}
```

### `.dev.vars` (local development)

```env
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token
AI_GATEWAY_ACCOUNT_ID=your-gateway-account
AI_GATEWAY_ID=z-gateway
AI_GATEWAY_TOKEN=your-gateway-token
```

---

## 📦 Scripts

```bash
# Development
npm run dev              # Start dev server with HMR

# Building
npm run build            # Build for production
npm run check            # Type check and dry-run deploy

# Deployment
npm run deploy           # Deploy to Cloudflare Workers

# Database
npm run db:create        # Create D1 database
npm run db:migrate       # Run migrations (local)
npm run db:migrate:prod  # Run migrations (production)

# Setup
npm run setup:resources  # Create all CF resources
npm run cf-typegen       # Generate TypeScript types
```

---

## 🔐 Security

- All credentials encrypted in KV storage
- API tokens never exposed to frontend
- Cloudflare AI Gateway handles authentication
- Rate limiting on all endpoints
- CORS protection enabled
- Input validation on all requests

---

## 📊 Performance

- **Edge Deployment** - Runs on Cloudflare's global network
- **Cold Start** - <50ms with Durable Objects warmup
- **Response Time** - <100ms for most operations
- **Scalability** - Auto-scales with Cloudflare Workers
- **Caching** - AI Gateway caching for repeated queries
- **Database** - D1 SQLite at the edge for low latency

---

## 🧪 Testing

```bash
# Local development test
npm run dev
# Open http://localhost:5173
# Navigate to /chat and type "test"

# Production test
npm run deploy
# Get worker URL from output
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "test the system"}'
```

---

## 🐛 Troubleshooting

### Issue: "AI Gateway authentication failed"
**Solution:** Verify environment variables:
```bash
echo $AI_GATEWAY_ACCOUNT_ID
echo $AI_GATEWAY_ID
echo $AI_GATEWAY_TOKEN
```

### Issue: "Resource creation failed"
**Solution:** Check CF API token permissions:
- Workers Scripts: Edit
- D1: Edit
- KV: Edit
- R2: Edit
- Vectorize: Edit

### Issue: "Database not found"
**Solution:** Run migrations:
```bash
wrangler d1 migrations apply mas-control-db --local
```

### Issue: "Vectorize index not found"
**Solution:** Create Vectorize index:
```bash
wrangler vectorize create mas-rag-index --dimensions=768 --metric=cosine
```

---

## 📚 Documentation

- [Complete System Documentation](./SYSTEM_COMPLETE.md)
- [UI Integration Status](./UI_INTEGRATION_STATUS.md)
- [CF AI Gateway Verification](./CF_AI_GATEWAY_VERIFICATION.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)

---

## 🎯 Roadmap

- [ ] Multi-user support with authentication
- [ ] Advanced RAG with reranking
- [ ] Custom MCP server creation
- [ ] Worker analytics and monitoring
- [ ] Cost tracking per resource
- [ ] Resource usage quotas
- [ ] Automated testing for generated workers
- [ ] CI/CD pipeline integration
- [ ] VS Code extension

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Hono](https://hono.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)

---

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [Wiki](https://github.com/your-repo/wiki)
- Cloudflare Community: [Discord](https://discord.gg/cloudflaredev)

---

**Built with ❤️ for the Cloudflare ecosystem**
