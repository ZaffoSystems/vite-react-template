import { Env } from '../types/env';
import { AIGatewayClient } from './ai-gateway';

interface Document {
  id: string;
  sourcePath: string;
  content: string;
  metadata: Record<string, any>;
  chunks: DocumentChunk[];
}

interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  index: number;
}

interface SearchResult {
  documentId: string;
  chunkId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * RAG (Retrieval Augmented Generation) System
 * Auto-ingests documents from R2, generates embeddings, stores in Vectorize
 */
export class RAGSystem {
  private db: D1Database;
  private r2: R2Bucket;
  private vectorize: VectorizeIndex;
  private ai: AIGatewayClient;
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(env: Env) {
    this.db = env.DB;
    this.r2 = env.R2;
    this.vectorize = env.VECTORIZE;
    this.ai = new AIGatewayClient(env);
    this.chunkSize = parseInt(env.RAG_CHUNK_SIZE || '1000');
    this.chunkOverlap = parseInt(env.RAG_CHUNK_OVERLAP || '200');
  }

  /**
   * Auto-ingest documents from R2 bucket
   */
  async ingestFromR2(prefix?: string): Promise<number> {
    let ingested = 0;

    const objects = await this.r2.list({ prefix });

    for (const obj of objects.objects) {
      const processed = await this.isDocumentProcessed(obj.key);
      if (processed) continue;

      try {
        const content = await this.r2.get(obj.key);
        if (!content) continue;

        const text = await content.text();
        await this.ingestDocument(obj.key, text, {
          source: 'r2',
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
        });

        ingested++;
      } catch (error) {
        console.error(`Failed to ingest ${obj.key}:`, error);
      }
    }

    return ingested;
  }

  /**
   * Ingest a document into the RAG system
   */
  async ingestDocument(
    sourcePath: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const documentId = crypto.randomUUID();
    const contentHash = await this.hashContent(content);

    // Check if already indexed
    const existing = await this.db.prepare(
      'SELECT id FROM rag_documents WHERE content_hash = ?'
    ).bind(contentHash).first();

    if (existing) {
      return existing.id as string;
    }

    // Chunk the document
    const chunks = this.chunkText(content);

    // Generate embeddings for each chunk
    const vectorIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.ai.getEmbedding(chunk);

      if (embedding) {
        const vectorId = `${documentId}-chunk-${i}`;
        vectorIds.push(vectorId);

        // Insert into Vectorize
        await this.vectorize.insert([{
          id: vectorId,
          values: embedding,
          metadata: {
            documentId,
            chunkIndex: i,
            content: chunk,
            ...metadata,
          },
        }]);
      }
    }

    // Store in D1
    await this.db.prepare(
      `INSERT INTO rag_documents (id, source_path, content_hash, content, metadata, chunk_count, indexed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      documentId,
      sourcePath,
      contentHash,
      content,
      JSON.stringify(metadata),
      chunks.length,
      Date.now(),
      Date.now()
    ).run();

    return documentId;
  }

  /**
   * Search documents using semantic search
   */
  async search(query: string, options: {
    topK?: number;
    filter?: Record<string, any>;
    minScore?: number;
  } = {}): Promise<SearchResult[]> {
    const topK = options.topK || 5;
    const minScore = options.minScore || 0.7;

    // Generate query embedding
    const queryEmbedding = await this.ai.getEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }

    // Search in Vectorize
    const results = await this.vectorize.query(queryEmbedding, {
      topK,
      filter: options.filter,
      returnMetadata: true,
    });

    // Filter by score and format results
    const searchResults: SearchResult[] = [];

    for (const match of results.matches) {
      if (match.score < minScore) continue;

      searchResults.push({
        documentId: match.metadata.documentId as string,
        chunkId: match.id,
        content: match.metadata.content as string,
        score: match.score,
        metadata: match.metadata as Record<string, any>,
      });
    }

    return searchResults;
  }

  /**
   * Get context for RAG-enhanced generation
   */
  async getContext(query: string, maxChunks: number = 5): Promise<string> {
    const results = await this.search(query, { topK: maxChunks });

    if (results.length === 0) {
      return '';
    }

    const context = results
      .map(r => `[Score: ${r.score.toFixed(2)}]\n${r.content}`)
      .join('\n\n---\n\n');

    return context;
  }

  /**
   * Generate answer using RAG
   */
  async generateAnswer(query: string, options: {
    model?: string;
    maxContextChunks?: number;
  } = {}): Promise<{
    answer: string;
    sources: SearchResult[];
  }> {
    const sources = await this.search(query, { topK: options.maxContextChunks || 5 });
    const context = sources.map(s => s.content).join('\n\n');

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant. Answer the question based on the provided context. If the context doesn\'t contain enough information, say so.',
      },
      {
        role: 'user' as const,
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ];

    const response = await this.ai.runWithBinding(
      options.model || '@cf/meta/llama-3.1-8b-instruct-fast',
      messages
    );

    if (!response.success) {
      throw new Error('Failed to generate answer');
    }

    const answer = response.result?.response || 'Failed to generate answer';

    return {
      answer,
      sources,
    };
  }

  /**
   * Watch R2 bucket for new files and auto-ingest
   */
  async watchR2Bucket(prefix?: string): Promise<void> {
    // List all objects
    const objects = await this.r2.list({ prefix });

    for (const obj of objects.objects) {
      // Check if already processed
      const existing = await this.db.prepare(
        'SELECT id FROM rag_documents WHERE source_path = ?'
      ).bind(obj.key).first();

      if (!existing) {
        try {
          const content = await this.r2.get(obj.key);
          if (content) {
            const text = await content.text();
            await this.ingestDocument(obj.key, text, {
              source: 'r2',
              key: obj.key,
            });
          }
        } catch (error) {
          console.error(`Failed to auto-ingest ${obj.key}:`, error);
        }
      }
    }
  }

  /**
   * Delete document from RAG system
   */
  async deleteDocument(documentId: string): Promise<void> {
    // Get chunk count
    const doc = await this.db.prepare(
      'SELECT chunk_count FROM rag_documents WHERE id = ?'
    ).bind(documentId).first();

    if (!doc) return;

    const chunkCount = doc.chunk_count as number;

    // Delete from Vectorize
    const vectorIds = Array.from({ length: chunkCount }, (_, i) => `${documentId}-chunk-${i}`);
    await this.vectorize.deleteByIds(vectorIds);

    // Delete from D1
    await this.db.prepare(
      'DELETE FROM rag_documents WHERE id = ?'
    ).bind(documentId).run();
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);

      start += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  /**
   * Hash content for deduplication
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if document is already processed
   */
  private async isDocumentProcessed(sourcePath: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT id FROM rag_documents WHERE source_path = ?'
    ).bind(sourcePath).first();

    return !!result;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const result = await this.db.prepare(
      'SELECT * FROM rag_documents WHERE id = ?'
    ).bind(documentId).first();

    if (!result) return null;

    return {
      id: result.id as string,
      sourcePath: result.source_path as string,
      content: result.content as string,
      metadata: JSON.parse(result.metadata as string),
      chunks: [],
    };
  }

  /**
   * List all documents
   */
  async listDocuments(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const results = await this.db.prepare(
      'SELECT id, source_path, metadata, chunk_count, indexed_at FROM rag_documents ORDER BY indexed_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    return results.results.map(r => ({
      id: r.id,
      sourcePath: r.source_path,
      metadata: JSON.parse(r.metadata as string),
      chunkCount: r.chunk_count,
      indexedAt: r.indexed_at,
    }));
  }
}
