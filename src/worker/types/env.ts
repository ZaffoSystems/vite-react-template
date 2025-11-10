export interface Env {
  // Cloudflare Bindings
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  VECTORIZE: VectorizeIndex;
  TASK_QUEUE: Queue;
  AI: Ai;
  AGENT_STATE: DurableObjectNamespace;
  SSH_SESSION: DurableObjectNamespace;

  // Cloudflare Account & API
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  CF_ZONE_ID?: string;

  // AI Gateway Configuration
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  AI_GATEWAY_TOKEN: string;
  AI_GATEWAY_ENDPOINT?: string;

  // Docker Hub
  DOCKER_HUB_USERNAME?: string;
  DOCKER_HUB_TOKEN?: string;

  // MCP Configuration
  MCP_SERVER_URLS?: string; // comma-separated list

  // SSH Configuration
  SSH_PRIVATE_KEY?: string;
  SSH_KNOWN_HOSTS?: string;

  // Zero Trust
  ZERO_TRUST_CLIENT_ID?: string;
  ZERO_TRUST_CLIENT_SECRET?: string;
  ZERO_TRUST_TEAM_DOMAIN?: string;

  // RAG Configuration
  RAG_CHUNK_SIZE?: string;
  RAG_CHUNK_OVERLAP?: string;
  RAG_EMBEDDING_MODEL?: string;
}

export interface AgentCapabilities {
  canManageInfrastructure: boolean;
  canDeployWorkers: boolean;
  canAccessSSH: boolean;
  canQueryRAG: boolean;
  canLearn: boolean;
  canReact: boolean;
  canSyncDocker: boolean;
  canUseMCP: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'utility' | 'learning' | 'dynamic' | 'react' | 'infrastructure';
  capabilities: AgentCapabilities;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Task {
  id: string;
  type: string;
  payload: Record<string, any>;
  priority: number;
  agentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DynamicRouteConfig {
  name: string;
  condition?: string; // Expression for conditional routing
  model: string;
  fallbackModel?: string;
  rateLimit?: {
    requestsPerMinute: number;
    fallbackOnLimit: boolean;
  };
  budgetLimit?: {
    maxCostPerDay: number;
    fallbackOnExceeded: boolean;
  };
  metadata?: Record<string, any>;
}

export interface AIGatewayResponse {
  success: boolean;
  result?: any;
  logId?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}
