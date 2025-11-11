// TypeScript type definitions for the multi-agent system

export interface Env {
  // Durable Objects
  META_AGENT: DurableObjectNamespace;
  BUILDER_AGENT: DurableObjectNamespace;
  EXECUTOR_AGENT: DurableObjectNamespace;
  COORDINATOR_AGENT: DurableObjectNamespace;
  MEMORY_AGENT: DurableObjectNamespace;
  RESEARCH_AGENT: DurableObjectNamespace;

  // AI & Storage
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  DB: D1Database;
  CACHE: KVNamespace;
  MCP_OAUTH: KVNamespace;
  MEMORY: KVNamespace;

  // 15 Cloudflare MCP Servers
  MCP_DOCS: McpServer;
  MCP_BINDINGS: McpServer;
  MCP_BUILDS: McpServer;
  MCP_OBSERVABILITY: McpServer;
  MCP_RADAR: McpServer;
  MCP_CONTAINER: McpServer;
  MCP_BROWSER: McpServer;
  MCP_LOGPUSH: McpServer;
  MCP_AI_GATEWAY: McpServer;
  MCP_AI_SEARCH: McpServer;
  MCP_AUDIT_LOGS: McpServer;
  MCP_DNS_ANALYTICS: McpServer;
  MCP_DEX: McpServer;
  MCP_CASB: McpServer;
  MCP_GRAPHQL: McpServer;

  // External MCP Servers
  MCP_CONTEXT7: McpServer;
  MCP_E2B: McpServer;
  MCP_FIRECRAWL: McpServer;
  MCP_BRAVE_SEARCH: McpServer;
  MCP_SEQUENTIAL_THINKING: McpServer;
  MCP_FILESYSTEM: McpServer;

  // Environment variables
  ENVIRONMENT: string;
  ENABLE_MEMORY: string;
  ENABLE_SEQUENTIAL_THINKING: string;
  MAX_CONCURRENT_AGENTS: string;

  // API Keys (set via secrets)
  E2B_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  BRAVE_API_KEY?: string;
}

export interface McpServer {
  call(tool: string, params: any): Promise<any>;
  listTools(): Promise<McpTool[]>;
  getStatus(): Promise<McpStatus>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpStatus {
  connected: boolean;
  serverName: string;
  toolCount: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  goal: string;
  capabilities: string[];
  tools: string[];
  mcpServers: string[];
  backstory: string;
  memoryEnabled?: boolean;
  sequentialThinkingEnabled?: boolean;
}

export interface AgentState {
  config: AgentConfig | null;
  taskHistory: Task[];
  mcpConnections: Map<string, boolean>;
  memory: ConversationMemory[];
  thinkingHistory: ThinkingStep[];
}

export interface Task {
  id: string;
  input: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  mcpToolsUsed: string[];
  thinkingSteps?: ThinkingStep[];
  executionTimeMs?: number;
  timestamp: string;
}

export interface ConversationMemory {
  id: string;
  message: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  embedding?: number[];
  tags?: string[];
  importance?: number;
}

export interface ThinkingStep {
  id: string;
  stepNumber: number;
  stage: 'understanding' | 'planning' | 'executing' | 'validating' | 'reflecting';
  thought: string;
  confidence: number;
  timestamp: string;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  agents: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Map<string, any>;
  orchestrationType: 'supervisor' | 'swarm' | 'hierarchical';
}

export interface ResearchSession {
  id: string;
  query: string;
  sources: Array<{
    url: string;
    title: string;
    content: string;
    relevance: number;
  }>;
  findings: string;
  mcpToolsUsed: string[];
  status: 'pending' | 'researching' | 'completed' | 'failed';
}

export interface CodeExecution {
  id: string;
  code: string;
  language: 'python' | 'javascript' | 'typescript' | 'bash';
  output?: string;
  error?: string;
  executionTimeMs?: number;
  sandboxId?: string;
}

export interface MemoryEntry {
  id: string;
  agentId?: string;
  content: string;
  tags: string[];
  importance: number;
  accessCount: number;
  lastAccessed?: string;
  expiresAt?: string;
}
