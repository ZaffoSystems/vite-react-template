-- Agents Registry
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  capabilities TEXT, -- JSON
  config TEXT, -- JSON
  last_heartbeat INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);

-- Tasks Queue
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  type TEXT NOT NULL,
  payload TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  result TEXT, -- JSON
  error TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority DESC);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);

-- Cloudflare Resources
CREATE TABLE IF NOT EXISTS cf_resources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- worker, kv, d1, r2, queue, durable_object
  name TEXT NOT NULL,
  account_id TEXT,
  resource_id TEXT,
  config TEXT, -- JSON
  status TEXT DEFAULT 'active',
  last_synced INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_cf_resources_type ON cf_resources(type);
CREATE INDEX idx_cf_resources_status ON cf_resources(status);
CREATE UNIQUE INDEX idx_cf_resources_resource_id ON cf_resources(resource_id);

-- Workers Deployment
CREATE TABLE IF NOT EXISTS worker_deployments (
  id TEXT PRIMARY KEY,
  worker_name TEXT NOT NULL,
  script_content TEXT,
  bindings TEXT, -- JSON
  env_vars TEXT, -- JSON
  routes TEXT, -- JSON
  version TEXT,
  deployed_at INTEGER,
  status TEXT DEFAULT 'pending',
  deployment_log TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_worker_deployments_worker_name ON worker_deployments(worker_name);
CREATE INDEX idx_worker_deployments_status ON worker_deployments(status);

-- Docker Images
CREATE TABLE IF NOT EXISTS docker_images (
  id TEXT PRIMARY KEY,
  repository TEXT NOT NULL,
  tag TEXT NOT NULL,
  digest TEXT,
  manifest TEXT, -- JSON
  last_synced INTEGER,
  auto_deploy INTEGER DEFAULT 0,
  worker_mapping TEXT, -- JSON - maps to worker deployments
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX idx_docker_images_repo_tag ON docker_images(repository, tag);
CREATE INDEX idx_docker_images_auto_deploy ON docker_images(auto_deploy);

-- RAG Documents
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_type TEXT, -- file, url, r2
  content_hash TEXT,
  title TEXT,
  content TEXT,
  metadata TEXT, -- JSON
  vector_id TEXT, -- Reference to Vectorize
  chunk_count INTEGER DEFAULT 0,
  indexed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_rag_documents_source_path ON rag_documents(source_path);
CREATE INDEX idx_rag_documents_content_hash ON rag_documents(content_hash);
CREATE INDEX idx_rag_documents_indexed_at ON rag_documents(indexed_at);

-- MCP Servers
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  protocol_version TEXT,
  capabilities TEXT, -- JSON
  auth_config TEXT, -- JSON
  status TEXT DEFAULT 'inactive',
  last_connected INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_mcp_servers_status ON mcp_servers(status);
CREATE UNIQUE INDEX idx_mcp_servers_url ON mcp_servers(url);

-- SSH Sessions
CREATE TABLE IF NOT EXISTS ssh_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 22,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'connecting',
  durable_object_id TEXT,
  connected_at INTEGER,
  disconnected_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_ssh_sessions_status ON ssh_sessions(status);
CREATE INDEX idx_ssh_sessions_user_id ON ssh_sessions(user_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Agent Communication
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT,
  to_agent_id TEXT,
  message_type TEXT NOT NULL,
  payload TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  processed_at INTEGER,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_agent_messages_to_agent ON agent_messages(to_agent_id, status);
CREATE INDEX idx_agent_messages_created_at ON agent_messages(created_at);
