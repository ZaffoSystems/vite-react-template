/**
 * RAG Service - Document Chunking and Semantic Search
 *
 * Handles:
 * - Document chunking with overlap
 * - Embedding generation via CF AI Gateway
 * - Vectorize storage and retrieval
 * - Context retrieval for natural language queries
 */

import { Env } from '../types/env';
import { AIGatewayClient } from '../lib/ai-gateway';

export interface DocumentChunk {
  id: string;
  document_id: string;
  document_type: 'code' | 'documentation' | 'api_response' | 'user_note';
  content: string;
  chunk_index: number;
  metadata: any;
  embedding_id?: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export class RAGService {
  private aiGateway: AIGatewayClient;

  constructor(private env: Env) {
    this.aiGateway = new AIGatewayClient(env);
  }

  /**
   * Chunk a document with overlap
   */
  chunkDocument(
    content: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start += chunkSize - overlap;

      if (start >= content.length) break;
    }

    return chunks;
  }

  /**
   * Load document into RAG system
   */
  async loadDocument(
    documentId: string,
    documentType: 'code' | 'documentation' | 'api_response' | 'user_note',
    content: string,
    metadata: any = {}
  ): Promise<{ chunksCreated: number; embeddingsGenerated: number }> {
    // Get chunk configuration from system_config
    const chunkSizeResult = await this.env.DB.prepare(
      'SELECT value FROM system_config WHERE key = ?'
    ).bind('rag_chunk_size').first<{ value: string }>();

    const chunkOverlapResult = await this.env.DB.prepare(
      'SELECT value FROM system_config WHERE key = ?'
    ).bind('rag_chunk_overlap').first<{ value: string }>();

    const chunkSize = chunkSizeResult ? parseInt(chunkSizeResult.value) : 1000;
    const chunkOverlap = chunkOverlapResult ? parseInt(chunkOverlapResult.value) : 200;

    // Chunk the document
    const chunks = this.chunkDocument(content, chunkSize, chunkOverlap);

    let embeddingsGenerated = 0;

    // Store each chunk and generate embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = crypto.randomUUID();
      const chunk = chunks[i];

      // Generate embedding via CF AI Gateway (using text-embedding model)
      let embeddingId: string | undefined;
      try {
        const embedding = await this.generateEmbedding(chunk);
        embeddingId = await this.storeEmbedding(chunkId, embedding);
        embeddingsGenerated++;
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${i}:`, error);
      }

      // Store chunk in D1
      await this.env.DB.prepare(
        'INSERT INTO document_chunks (id, document_id, document_type, content, chunk_index, metadata, embedding_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        chunkId,
        documentId,
        documentType,
        chunk,
        i,
        JSON.stringify(metadata),
        embeddingId || null
      ).run();
    }

    return {
      chunksCreated: chunks.length,
      embeddingsGenerated,
    };
  }

  /**
   * Generate embedding for text using CF AI Gateway
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      `https://gateway.ai.cloudflare.com/v1/${this.env.AI_GATEWAY_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/workers-ai/@cf/baai/bge-base-en-v1.5`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [text] }),
      }
    );

    const data = await response.json();
    return data.data[0];
  }

  /**
   * Store embedding in Vectorize
   */
  private async storeEmbedding(id: string, embedding: number[]): Promise<string> {
    await this.env.VECTORIZE.insert([
      {
        id,
        values: embedding,
        metadata: { chunk_id: id },
      },
    ]);
    return id;
  }

  /**
   * Search for relevant chunks using semantic search
   */
  async searchRelevantChunks(
    query: string,
    topK: number = 5,
    documentType?: string
  ): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Search Vectorize
    const vectorResults = await this.env.VECTORIZE.query(queryEmbedding, {
      topK,
      returnValues: false,
      returnMetadata: true,
    });

    // Retrieve chunks from D1
    const results: SearchResult[] = [];

    for (const match of vectorResults.matches) {
      const chunkId = match.id;

      let query = 'SELECT * FROM document_chunks WHERE id = ?';
      const params: any[] = [chunkId];

      if (documentType) {
        query += ' AND document_type = ?';
        params.push(documentType);
      }

      const chunk = await this.env.DB.prepare(query).bind(...params).first<any>();

      if (chunk) {
        results.push({
          chunk: {
            id: chunk.id,
            document_id: chunk.document_id,
            document_type: chunk.document_type,
            content: chunk.content,
            chunk_index: chunk.chunk_index,
            metadata: JSON.parse(chunk.metadata || '{}'),
            embedding_id: chunk.embedding_id,
          },
          score: match.score,
        });
      }
    }

    return results;
  }

  /**
   * Get context for natural language query
   */
  async getContext(query: string, maxTokens: number = 2000): Promise<string> {
    const results = await this.searchRelevantChunks(query, 10);

    let context = '';
    let tokens = 0;

    for (const result of results) {
      const chunkTokens = Math.ceil(result.chunk.content.length / 4); // Rough estimate
      if (tokens + chunkTokens > maxTokens) break;

      context += `\n\n--- ${result.chunk.document_type} (score: ${result.score.toFixed(2)}) ---\n${result.chunk.content}`;
      tokens += chunkTokens;
    }

    return context;
  }

  /**
   * Load code repository into RAG
   */
  async loadCodeRepository(files: { path: string; content: string }[]): Promise<void> {
    for (const file of files) {
      await this.loadDocument(
        crypto.randomUUID(),
        'code',
        file.content,
        {
          file_path: file.path,
          language: this.detectLanguage(file.path),
        }
      );
    }
  }

  /**
   * Load API documentation
   */
  async loadAPIDocumentation(docs: { title: string; content: string }[]): Promise<void> {
    for (const doc of docs) {
      await this.loadDocument(
        crypto.randomUUID(),
        'documentation',
        doc.content,
        { title: doc.title }
      );
    }
  }

  /**
   * Delete document from RAG
   */
  async deleteDocument(documentId: string): Promise<void> {
    // Get all chunks for this document
    const chunks = await this.env.DB.prepare(
      'SELECT id, embedding_id FROM document_chunks WHERE document_id = ?'
    ).bind(documentId).all<{ id: string; embedding_id: string }>();

    // Delete embeddings from Vectorize
    for (const chunk of chunks.results || []) {
      if (chunk.embedding_id) {
        try {
          await this.env.VECTORIZE.deleteByIds([chunk.embedding_id]);
        } catch (error) {
          console.error(`Failed to delete embedding ${chunk.embedding_id}:`, error);
        }
      }
    }

    // Delete chunks from D1
    await this.env.DB.prepare(
      'DELETE FROM document_chunks WHERE document_id = ?'
    ).bind(documentId).run();
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    chunksByType: Record<string, number>;
  }> {
    const totalChunks = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM document_chunks'
    ).first<{ count: number }>();

    const totalDocuments = await this.env.DB.prepare(
      'SELECT COUNT(DISTINCT document_id) as count FROM document_chunks'
    ).first<{ count: number }>();

    const byType = await this.env.DB.prepare(
      'SELECT document_type, COUNT(*) as count FROM document_chunks GROUP BY document_type'
    ).all<{ document_type: string; count: number }>();

    const chunksByType: Record<string, number> = {};
    for (const row of byType.results || []) {
      chunksByType[row.document_type] = row.count;
    }

    return {
      totalDocuments: totalDocuments?.count || 0,
      totalChunks: totalChunks?.count || 0,
      chunksByType,
    };
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      sql: 'sql',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sh: 'bash',
    };
    return langMap[ext || ''] || 'unknown';
  }
}
