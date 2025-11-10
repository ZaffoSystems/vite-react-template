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

  // ==================== AWESOME MCP SERVER CREDENTIALS ====================
  // All credentials can be managed through the UI - Settings page

  // GitHub MCP
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;

  // Slack MCP
  SLACK_BOT_TOKEN?: string;
  SLACK_TEAM_ID?: string;

  // Database MCP Servers
  POSTGRES_CONNECTION_STRING?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string;
  POSTGRES_DATABASE?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  MYSQL_CONNECTION_STRING?: string;
  MONGODB_URI?: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;

  // Browser Automation MCP
  BROWSERBASE_API_KEY?: string;
  BROWSERBASE_PROJECT_ID?: string;

  // Cloud Platform MCP
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_KB_ID?: string;
  AZURE_CLIENT_ID?: string;
  AZURE_CLIENT_SECRET?: string;
  AZURE_TENANT_ID?: string;
  AZURE_SUBSCRIPTION_ID?: string;
  GCP_PROJECT_ID?: string;
  GCP_CREDENTIALS?: string;
  GCP_SERVICE_ACCOUNT_KEY?: string;

  // Container/Orchestration MCP
  KUBECONFIG?: string;
  KUBERNETES_CLUSTER_URL?: string;
  KUBERNETES_TOKEN?: string;
  DOCKER_HOST?: string;
  DOCKER_CERT_PATH?: string;

  // VCS & DevOps MCP
  GITLAB_TOKEN?: string;
  GITLAB_URL?: string;
  LINEAR_API_KEY?: string;
  JIRA_URL?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;

  // Communication MCP
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;

  // Monitoring & Analytics MCP
  SENTRY_AUTH_TOKEN?: string;
  SENTRY_ORG?: string;
  SENTRY_PROJECT?: string;
  DATADOG_API_KEY?: string;
  DATADOG_APP_KEY?: string;
  DATADOG_SITE?: string;

  // Productivity MCP
  NOTION_TOKEN?: string;
  NOTION_DATABASE_ID?: string;
  GOOGLE_DRIVE_CREDENTIALS?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;

  // Search MCP
  BRAVE_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_CX?: string;
  GOOGLE_SEARCH_ENGINE_ID?: string;
  TAVILY_API_KEY?: string;
  EXA_API_KEY?: string;

  // E-commerce & Payments MCP
  SHOPIFY_SHOP_URL?: string;
  SHOPIFY_ACCESS_TOKEN?: string;
  SHOPIFY_API_KEY?: string;
  STRIPE_API_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;

  // Media & Social MCP
  YOUTUBE_API_KEY?: string;
  YOUTUBE_CLIENT_ID?: string;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
  TWITTER_BEARER_TOKEN?: string;

  // Maps MCP
  GOOGLE_MAPS_API_KEY?: string;

  // Email Services (SendGrid, Mailgun, Resend)
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  MAILGUN_API_KEY?: string;
  MAILGUN_DOMAIN?: string;
  MAILGUN_FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;

  // Database Services via HTTP
  NEON_DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  PLANETSCALE_HOST?: string;
  PLANETSCALE_USERNAME?: string;
  PLANETSCALE_PASSWORD?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;

  // Vector Databases
  PINECONE_API_KEY?: string;
  PINECONE_ENVIRONMENT?: string;
  PINECONE_INDEX?: string;
  QDRANT_URL?: string;
  QDRANT_API_KEY?: string;
  WEAVIATE_URL?: string;
  WEAVIATE_API_KEY?: string;

  // Code Execution & Browser
  E2B_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;

  // Additional Services
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  FIGMA_ACCESS_TOKEN?: string;
  VERCEL_TOKEN?: string;
  AZURE_STORAGE_ACCOUNT_KEY?: string;
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
