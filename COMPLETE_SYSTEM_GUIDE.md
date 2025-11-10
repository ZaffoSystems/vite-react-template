# Master Control Agent - Complete System Guide

## 🎉 System Status: 100% FUNCTIONAL

This is a fully functional Master Control Agent system that can understand natural language commands and autonomously deploy Cloudflare Workers with automatic resource provisioning.

---

## 🚀 Quick Start

### 1. Initialize Database

First, run the database migration to create all tables:

```bash
curl -X POST https://your-worker.workers.dev/api/system/migrate
```

This creates:
- 10 database tables
- Default Master Control Agent
- System configuration

### 2. Test Natural Language Interface

Send a command to the Master Agent:

```bash
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "build a worker to analyze google ads"
  }'
```

The system will:
1. Create execution plan
2. Provision D1 database and KV namespace
3. Generate TypeScript worker code
4. Deploy to Cloudflare
5. Return deployment URL

### 3. Check System Status

```bash
curl https://your-worker.workers.dev/api/master/status
```

Returns:
- Resource counts by type
- RAG statistics
- Active deployments
- Task queue status

---

## 📖 Complete Feature Documentation

### Natural Language Commands

The Master Agent understands various command patterns:

#### **Worker Deployment**
```
"build a worker to analyze google ads"
"create a worker that monitors GitHub issues"
"deploy a REST API for user management"
```

Result: Autonomous deployment with code generation and resource provisioning

#### **RAG System Creation**
```
"create a RAG system for my documentation"
"build a semantic search for my codebase"
"set up document embeddings with vectorize"
```

Result: Vectorize index, D1 database, document chunking, embedding generation

#### **Multi-Service Integration**
```
"build a worker that monitors GitHub issues and posts to Slack"
"create a worker that syncs Postgres data to R2"
"deploy a worker that uses AWS Lambda and GCP Cloud Storage"
```

Result: MCP server integration with credential management

#### **Resource Provisioning**
```
"create a KV namespace called user-cache"
"provision a D1 database for analytics"
"set up a Hyperdrive connection to my Postgres database"
```

Result: Direct resource creation with tracking in D1

---

## 🏗️ Architecture Overview

### Service Layer

#### **MasterAgent** (`/src/worker/services/master-agent.ts`)

The brain of the system. Handles:
- Natural language understanding
- Execution plan creation
- Autonomous task execution
- Resource orchestration

**Usage:**
```typescript
import { MasterAgent } from './services/master-agent';

const master = new MasterAgent(env);
const result = await master.processCommand({
  userMessage: "build a worker to analyze google ads",
  context: {} // Optional context
});

console.log(result);
// {
//   success: true,
//   message: "Execution completed successfully",
//   deploymentUrl: "https://google-ads-analyzer-abc123.workers.dev",
//   resourceIds: {
//     "ads-db": "d1-database-id",
//     "ads-cache": "kv-namespace-id"
//   }
// }
```

#### **ResourceManager** (`/src/worker/services/resource-manager.ts`)

Manages Cloudflare resources via API. Handles:
- KV namespace creation
- D1 database creation
- R2 bucket creation
- Vectorize index creation
- Hyperdrive connection pool creation
- Queue creation
- Resource tracking in D1
- Binding configuration generation

**Usage:**
```typescript
import { ResourceManager } from './services/resource-manager';

const rm = new ResourceManager(env);

// Create KV namespace
const kv = await rm.createKVNamespace("user-cache");
console.log(kv); // { id: "...", name: "user-cache" }

// Create Vectorize index
const vectorize = await rm.createVectorizeIndex(
  "embeddings",
  1536, // dimensions
  "cosine" // metric
);

// List all resources
const resources = await rm.listResources();

// Generate bindings for deployment
const bindings = rm.generateBindingConfig([
  { type: 'kv', name: 'CACHE', id: kv.id },
  { type: 'vectorize', name: 'EMBEDDINGS', id: vectorize.id }
]);
```

#### **RAGService** (`/src/worker/services/rag-service.ts`)

Provides semantic search capabilities. Handles:
- Document chunking with configurable overlap
- Embedding generation via CF AI Gateway
- Vectorize storage
- Semantic search
- Context retrieval for LLM prompts

**Usage:**
```typescript
import { RAGService } from './services/rag-service';

const rag = new RAGService(env);

// Load a document
await rag.loadDocument(
  crypto.randomUUID(), // document ID
  'documentation', // type
  'This is my documentation content...',
  { title: 'API Reference', version: '1.0' }
);

// Search for relevant chunks
const results = await rag.searchRelevantChunks(
  "How do I authenticate?",
  5 // top K results
);

// Get context for LLM prompt
const context = await rag.getContext(
  "How do I authenticate?",
  2000 // max tokens
);

// Load code repository
await rag.loadCodeRepository([
  { path: 'src/index.ts', content: '...' },
  { path: 'src/auth.ts', content: '...' }
]);

// Get statistics
const stats = await rag.getStatistics();
console.log(stats);
// {
//   totalDocuments: 10,
//   totalChunks: 50,
//   chunksByType: { code: 30, documentation: 20 }
// }
```

#### **MigrationRunner** (`/src/worker/services/migration-runner.ts`)

Manages database schema. Handles:
- Initial schema creation
- Migration versioning
- Database health checks

**Usage:**
```typescript
import { MigrationRunner } from './services/migration-runner';

const migration = new MigrationRunner(env);

// Run all pending migrations
await migration.runMigrations();

// Check database health
const health = await migration.checkHealth();
console.log(health);
// {
//   healthy: true,
//   tables: ['agents', 'tasks', 'credentials', ...],
//   agentCount: 1,
//   taskCount: 0
// }
```

---

## 🔌 API Reference

### Master Control Endpoints

#### POST `/api/master/command`
Process natural language command

**Request:**
```json
{
  "command": "build a worker to analyze google ads",
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Execution completed successfully",
  "deploymentUrl": "https://google-ads-analyzer-abc123.workers.dev",
  "resourceIds": {
    "ads-db": "d1-database-id",
    "ads-cache": "kv-namespace-id"
  }
}
```

#### GET `/api/master/status`
Get agent status and metrics

**Response:**
```json
{
  "resources": {
    "total": 5,
    "byType": {
      "kv": 2,
      "d1": 2,
      "vectorize": 1
    }
  },
  "rag": {
    "totalDocuments": 10,
    "totalChunks": 50,
    "chunksByType": { "code": 30, "documentation": 20 }
  },
  "deployments": 3,
  "tasks": [
    { "status": "completed", "count": 10 },
    { "status": "pending", "count": 2 }
  ]
}
```

### Resource Management Endpoints

#### POST `/api/resources/kv`
Create KV namespace

**Request:**
```json
{ "name": "user-cache" }
```

**Response:**
```json
{
  "success": true,
  "id": "kv-namespace-id",
  "name": "user-cache"
}
```

#### POST `/api/resources/d1`
Create D1 database

#### POST `/api/resources/r2`
Create R2 bucket

#### POST `/api/resources/vectorize`
Create Vectorize index

**Request:**
```json
{
  "name": "embeddings",
  "dimensions": 1536,
  "metric": "cosine"
}
```

#### POST `/api/resources/hyperdrive`
Create Hyperdrive connection pool

**Request:**
```json
{
  "name": "postgres-pool",
  "connectionString": "postgresql://user:pass@host:5432/db",
  "database": "mydb"
}
```

#### POST `/api/resources/queue`
Create Queue

#### GET `/api/resources`
List all resources

**Query Parameters:**
- `type` (optional): Filter by resource type (kv, d1, r2, vectorize, hyperdrive, queue)

#### DELETE `/api/resources/:type/:id`
Delete resource

### RAG Service Endpoints

#### POST `/api/rag-service/load`
Load document into RAG system

**Request:**
```json
{
  "documentId": "doc-uuid",
  "documentType": "documentation",
  "content": "Your document content...",
  "metadata": { "title": "API Guide" }
}
```

**Response:**
```json
{
  "success": true,
  "chunksCreated": 5,
  "embeddingsGenerated": 5
}
```

#### POST `/api/rag-service/search`
Semantic search

**Request:**
```json
{
  "query": "How do I authenticate?",
  "topK": 5,
  "documentType": "documentation"
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk": {
        "id": "chunk-uuid",
        "content": "Authentication is done via...",
        "metadata": {}
      },
      "score": 0.95
    }
  ]
}
```

#### GET `/api/rag-service/context`
Get context for query

**Query Parameters:**
- `query`: Search query
- `maxTokens`: Maximum tokens for context (default: 2000)

#### DELETE `/api/rag-service/documents/:id`
Delete document from RAG

#### GET `/api/rag-service/statistics`
Get RAG statistics

### System Endpoints

#### GET `/health`
Health check with database status

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1699564800000,
  "service": "master-control-agent",
  "database": {
    "healthy": true,
    "tables": ["agents", "tasks", "credentials", ...],
    "agentCount": 1,
    "taskCount": 0
  }
}
```

#### POST `/api/system/migrate`
Run database migrations

---

## 🎯 Example Workflows

### Workflow 1: Deploy Worker with D1 and KV

```bash
# 1. Send natural language command
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "build a REST API worker with D1 database and KV caching"
  }'

# Response:
# {
#   "success": true,
#   "deploymentUrl": "https://rest-api-worker-xyz.workers.dev",
#   "resourceIds": {
#     "api-db": "d1-id",
#     "api-cache": "kv-id"
#   }
# }

# 2. Worker is live and ready to use!
curl https://rest-api-worker-xyz.workers.dev
```

### Workflow 2: Create RAG System

```bash
# 1. Create Vectorize index
curl -X POST https://your-worker.workers.dev/api/resources/vectorize \
  -H "Content-Type: application/json" \
  -d '{
    "name": "docs-embeddings",
    "dimensions": 1536,
    "metric": "cosine"
  }'

# 2. Load documentation
curl -X POST https://your-worker.workers.dev/api/rag-service/load \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc-1",
    "documentType": "documentation",
    "content": "Your documentation content here...",
    "metadata": { "title": "Getting Started" }
  }'

# 3. Search semantically
curl -X POST https://your-worker.workers.dev/api/rag-service/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I deploy a worker?",
    "topK": 5
  }'
```

### Workflow 3: Multi-Service Integration

```bash
# Deploy worker with GitHub and Slack integration
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "build a worker that monitors GitHub issues and posts updates to Slack"
  }'

# The Master Agent will:
# 1. Create D1 database for tracking
# 2. Generate code with GitHub MCP integration
# 3. Generate code with Slack MCP integration
# 4. Deploy with cron trigger
# 5. Return deployment URL
```

---

## 🔐 Configuration

### Environment Variables

Required bindings in `wrangler.toml`:

```toml
# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "master-control-db"
database_id = "your-d1-id"

# KV Store
[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# R2 Bucket
[[r2_buckets]]
binding = "R2"
bucket_name = "master-control-storage"

# Vectorize
[[vectorize]]
binding = "VECTORIZE"
index_name = "master-control-embeddings"

# Queue
[[queues.producers]]
binding = "TASK_QUEUE"
queue = "master-control-tasks"

# Workers AI
[ai]
binding = "AI"

# Durable Objects
[[durable_objects.bindings]]
name = "AGENT_STATE"
class_name = "AgentState"
script_name = "master-control-agent"

[[durable_objects.bindings]]
name = "SSH_SESSION"
class_name = "SSHSession"
script_name = "master-control-agent"
```

Required environment variables:

```toml
[vars]
AI_GATEWAY_ACCOUNT_ID = "your-account-id"
AI_GATEWAY_ID = "your-gateway-id"
AI_GATEWAY_TOKEN = "your-gateway-token"
CF_ACCOUNT_ID = "your-account-id"
CF_API_TOKEN = "your-api-token"

# Optional MCP credentials (configure via Settings UI)
GITHUB_TOKEN = "..."
SLACK_BOT_TOKEN = "..."
AWS_ACCESS_KEY_ID = "..."
AWS_SECRET_ACCESS_KEY = "..."
# ... and 150+ more optional credentials
```

---

## 📊 Monitoring

### Check System Health

```bash
curl https://your-worker.workers.dev/health
```

### View RAG Statistics

```bash
curl https://your-worker.workers.dev/api/rag-service/statistics
```

### View Agent Status

```bash
curl https://your-worker.workers.dev/api/master/status
```

### List Resources

```bash
# All resources
curl https://your-worker.workers.dev/api/resources

# Filter by type
curl https://your-worker.workers.dev/api/resources?type=kv
```

---

## 🎓 Advanced Usage

### Custom Code Generation

The Master Agent can generate code for specific patterns:

```bash
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "build a worker with REST endpoints for user CRUD, D1 database, KV caching, and JWT authentication"
  }'
```

### RAG-Enhanced Deployments

Load your codebase into RAG, then use it for context:

```bash
# Load codebase
curl -X POST https://your-worker.workers.dev/api/rag-service/load \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "codebase-1",
    "documentType": "code",
    "content": "... your source code ...",
    "metadata": { "file_path": "src/index.ts" }
  }'

# Deploy with context
curl -X POST https://your-worker.workers.dev/api/master/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "build a worker similar to the one in src/index.ts but with authentication"
  }'
```

---

## 🔍 Troubleshooting

### Database Not Initialized

```bash
# Run migrations
curl -X POST https://your-worker.workers.dev/api/system/migrate
```

### Resources Not Created

Check CF API token permissions:
- Workers R/W
- D1 R/W
- KV R/W
- R2 R/W
- Vectorize R/W

### AI Gateway Errors

Verify:
- `AI_GATEWAY_ACCOUNT_ID` is correct
- `AI_GATEWAY_ID` is correct
- `AI_GATEWAY_TOKEN` is valid
- Gateway has dynamic routing enabled

---

## 📝 Notes

- All resources are tracked in D1 for auditing
- Embeddings use CF AI Gateway (no external API calls)
- Worker deployments include proper error handling
- System is fully autonomous - no manual intervention needed
- MCP credentials are managed via Settings UI
- RAG system supports multiple document types
- All operations are idempotent

---

## 🎉 Summary

This is a **complete, production-ready system** that:

✅ Understands natural language commands
✅ Autonomously provisions Cloudflare resources
✅ Generates TypeScript worker code with proper bindings
✅ Deploys workers to Cloudflare
✅ Integrates with 71+ external services via MCP
✅ Provides semantic search with RAG
✅ Tracks all resources and deployments
✅ Manages credentials securely
✅ Monitors system health

**Get started now:** Send your first command to `/api/master/command` and watch the magic happen! 🚀
