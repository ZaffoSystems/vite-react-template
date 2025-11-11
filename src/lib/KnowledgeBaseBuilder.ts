// KnowledgeBaseBuilder - Create RAG knowledge base from GitHub repository
import type { Env } from '../types';

export interface RepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  includePaths?: string[];  // e.g., ['src/', 'docs/']
  excludePaths?: string[];  // e.g., ['node_modules/', 'dist/']
  fileExtensions?: string[];  // e.g., ['.ts', '.js', '.md']
}

export interface CodeChunk {
  id: string;
  content: string;
  file: string;
  startLine: number;
  endLine: number;
  language: string;
  embedding?: number[];
}

export class KnowledgeBaseBuilder {
  private env: Env;
  private chunkSize: number = 512;  // tokens per chunk

  constructor(env: Env) {
    this.env = env;
  }

  // Build knowledge base from repository
  async buildFromRepo(config: RepoConfig): Promise<{ chunks: number; indexed: number }> {
    console.log(`📚 [KB] Building knowledge base from ${config.owner}/${config.repo}`);

    let totalChunks = 0;
    let indexed = 0;

    try {
      // Get repository contents
      const files = await this.fetchRepoFiles(config);
      
      console.log(`📄 [KB] Found ${files.length} files to process`);

      // Process each file
      for (const file of files) {
        const chunks = await this.chunkFile(file);
        totalChunks += chunks.length;

        // Generate embeddings and store in Vectorize
        for (const chunk of chunks) {
          try {
            const embedding = await this.generateEmbedding(chunk.content);
            
            await this.env.VECTORIZE.insert([{
              id: chunk.id,
              values: embedding,
              metadata: {
                type: 'code',
                file: chunk.file,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                language: chunk.language,
                content: chunk.content,
                repo: `${config.owner}/${config.repo}`,
                branch: config.branch || 'main',
              },
            }]);

            indexed++;
          } catch (error) {
            console.error(`Failed to index chunk ${chunk.id}:`, error);
          }
        }
      }

      // Store metadata in D1
      await this.env.DB.prepare(`
        INSERT INTO knowledge_bases (id, repo, owner, branch, chunks_count, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'ready', CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        config.repo,
        config.owner,
        config.branch || 'main',
        indexed
      ).run();

      console.log(`✅ [KB] Knowledge base built: ${indexed}/${totalChunks} chunks indexed`);

      return { chunks: totalChunks, indexed };
    } catch (error: any) {
      console.error(`❌ [KB] Error building knowledge base:`, error);
      throw error;
    }
  }

  // Fetch files from GitHub repository
  private async fetchRepoFiles(config: RepoConfig): Promise<Array<{ path: string; content: string; language: string }>> {
    // Use GitHub API or MCP to fetch repository contents
    // This is a simplified version - in production, use recursive tree fetching
    
    const files: Array<{ path: string; content: string; language: string }> = [];
    
    // Example: Fetch specific files
    const targetPaths = config.includePaths || ['src/', 'docs/'];
    
    for (const path of targetPaths) {
      try {
        // Use Context7 MCP or direct GitHub API
        // For now, this is a placeholder
        console.log(`Fetching: ${path}`);
      } catch (error) {
        console.error(`Failed to fetch ${path}:`, error);
      }
    }

    return files;
  }

  // Chunk file into manageable pieces
  private async chunkFile(file: { path: string; content: string; language: string }): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    const lines = file.content.split('\n');
    
    let currentChunk = '';
    let startLine = 1;
    let currentLine = 1;

    for (const line of lines) {
      currentChunk += line + '\n';
      
      // Chunk by token count (approximate: ~4 chars per token)
      if (currentChunk.length > this.chunkSize * 4) {
        chunks.push({
          id: `${file.path}:${startLine}-${currentLine}`,
          content: currentChunk.trim(),
          file: file.path,
          startLine,
          endLine: currentLine,
          language: file.language,
        });
        
        currentChunk = '';
        startLine = currentLine + 1;
      }
      
      currentLine++;
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${file.path}:${startLine}-${currentLine}`,
        content: currentChunk.trim(),
        file: file.path,
        startLine,
        endLine: currentLine,
        language: file.language,
      });
    }

    return chunks;
  }

  // Generate embedding
  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [text],
    });
    return result.data[0];
  }

  // Query knowledge base
  async query(query: string, limit: number = 5): Promise<Array<{
    content: string;
    file: string;
    lines: string;
    similarity: number;
  }>> {
    const embedding = await this.generateEmbedding(query);
    
    const results = await this.env.VECTORIZE.query(embedding, {
      topK: limit,
      filter: { type: 'code' },
    });

    return results.matches.map((match: any) => ({
      content: match.metadata.content,
      file: match.metadata.file,
      lines: `${match.metadata.startLine}-${match.metadata.endLine}`,
      similarity: match.score,
    }));
  }
}
