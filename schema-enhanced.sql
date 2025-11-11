-- ENHANCED DATABASE SCHEMA with Audit Logs and Knowledge Base
-- Run: wrangler d1 execute agent-database --file=schema-enhanced.sql --remote

-- ===================================================================
-- CORE AGENT TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  config TEXT NOT NULL,
  mcp_servers TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  memory_enabled BOOLEAN DEFAULT 1,
  sequential_thinking_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT DEFAULT 'pending',
  mcp_tools_used TEXT,
  thinking_steps TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL,
  agent_id TEXT,
  embedding_stored BOOLEAN DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS mcp_connections (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  mcp_server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  tools_available TEXT,
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agents TEXT NOT NULL,
  orchestration_type TEXT DEFAULT 'supervisor',
  status TEXT DEFAULT 'active',
  execution_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  content TEXT NOT NULL,
  tags TEXT,
  importance REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS thinking_steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  stage TEXT NOT NULL,
  thought TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS research_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  query TEXT NOT NULL,
  sources TEXT,
  findings TEXT,
  mcp_tools_used TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS code_executions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'python',
  output TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  sandbox_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- ===================================================================
-- AUTONOMOUS SYSTEM TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS autonomous_actions (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  outcome TEXT,
  confidence REAL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  cpu_usage REAL,
  memory_usage REAL,
  error_rate REAL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  strategy TEXT NOT NULL,
  success_rate REAL,
  iterations INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS docker_containers (
  id TEXT PRIMARY KEY,
  container_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  status TEXT NOT NULL,
  auto_managed BOOLEAN DEFAULT 1,
  last_health_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS infrastructure_hosts (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT,
  status TEXT DEFAULT 'unknown',
  cpu_usage REAL,
  memory_usage REAL,
  disk_usage REAL,
  last_check TIMESTAMP,
  auto_remediation_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- SECURITY & AUDIT TABLES
-- ===================================================================

-- Audit logs for all security events
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked BOOLEAN DEFAULT 0
);

-- Security violations
CREATE TABLE IF NOT EXISTS security_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  violation_type TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- KNOWLEDGE BASE TABLES (RAG)
-- ===================================================================

-- Knowledge bases from repositories
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  owner TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  chunks_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'building',
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code chunks for RAG (metadata only, vectors in Vectorize)
CREATE TABLE IF NOT EXISTS code_chunks (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  language TEXT,
  content_preview TEXT,
  vectorized BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id)
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_agent ON mcp_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_thinking_steps_task ON thinking_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_agent ON research_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_code_executions_agent ON code_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type ON autonomous_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_timestamp ON autonomous_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_agent ON performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_agent ON health_checks(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_agent ON learning_outcomes(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_security_violations_user ON security_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_repo ON knowledge_bases(repo, owner);
CREATE INDEX IF NOT EXISTS idx_code_chunks_kb ON code_chunks(knowledge_base_id);
