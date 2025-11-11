/**
 * ResourceManager - Automatic Cloudflare Resource Creation
 *
 * Creates and manages CF resources via API:
 * - KV namespaces
 * - D1 databases
 * - R2 buckets
 * - Vectorize indexes
 * - Hyperdrive connection pools
 * - Durable Objects
 * - Queues
 */

import { Env } from '../types/env';

export interface ResourceBinding {
  type: 'kv' | 'd1' | 'r2' | 'vectorize' | 'durable_object' | 'queue' | 'hyperdrive';
  name: string;
  id?: string;
  config?: any;
}

export class ResourceManager {
  constructor(private env: Env) {}

  /**
   * Create KV namespace
   */
  async createKVNamespace(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: name }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create KV namespace: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'kv',
      name,
      data.result.id,
      JSON.stringify({}),
      'active'
    ).run();

    return { id: data.result.id, name };
  }

  /**
   * Create D1 database
   */
  async createD1Database(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/d1/database`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create D1 database: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'd1',
      name,
      data.result.uuid,
      JSON.stringify({}),
      'active'
    ).run();

    return { id: data.result.uuid, name };
  }

  /**
   * Create R2 bucket
   */
  async createR2Bucket(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/r2/buckets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create R2 bucket: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'r2',
      name,
      name, // R2 uses name as ID
      JSON.stringify({}),
      'active'
    ).run();

    return { id: name, name };
  }

  /**
   * Create Vectorize index
   */
  async createVectorizeIndex(
    name: string,
    dimensions: number = 1536,
    metric: 'cosine' | 'euclidean' | 'dot-product' = 'cosine'
  ): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/vectorize/indexes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          config: {
            dimensions,
            metric,
          },
        }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create Vectorize index: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'vectorize',
      name,
      data.result.name,
      JSON.stringify({ dimensions, metric }),
      'active'
    ).run();

    return { id: data.result.name, name };
  }

  /**
   * Create Hyperdrive connection pool
   */
  async createHyperdrive(
    name: string,
    connectionString: string,
    database?: string
  ): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/hyperdrive/configs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          origin: {
            database: database || 'postgres',
            host: this.parseHostFromConnectionString(connectionString),
            port: this.parsePortFromConnectionString(connectionString),
            scheme: 'postgres',
            user: this.parseUserFromConnectionString(connectionString),
            password: this.parsePasswordFromConnectionString(connectionString),
          },
        }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create Hyperdrive: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'hyperdrive',
      name,
      data.result.id,
      JSON.stringify({ connectionString: connectionString.replace(/:[^:@]+@/, ':***@') }), // Redact password
      'active'
    ).run();

    return { id: data.result.id, name };
  }

  /**
   * Create Queue
   */
  async createQueue(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/queues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_name: name }),
      }
    );

    const data = await response.json() as any;
    if (!data.success) {
      throw new Error(`Failed to create Queue: ${JSON.stringify(data.errors)}`);
    }

    // Store in D1
    await this.env.DB.prepare(
      'INSERT INTO cf_resources (id, resource_type, resource_name, resource_id, configuration, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'queue',
      name,
      data.result.queue_id,
      JSON.stringify({}),
      'active'
    ).run();

    return { id: data.result.queue_id, name };
  }

  /**
   * Generate binding configuration for wrangler.toml
   */
  generateBindingConfig(bindings: ResourceBinding[]): string {
    let config = '';

    for (const binding of bindings) {
      switch (binding.type) {
        case 'kv':
          config += `\n[[kv_namespaces]]\nbinding = "${binding.name}"\nid = "${binding.id}"\n`;
          break;
        case 'd1':
          config += `\n[[d1_databases]]\nbinding = "${binding.name}"\ndatabase_name = "${binding.name}"\ndatabase_id = "${binding.id}"\n`;
          break;
        case 'r2':
          config += `\n[[r2_buckets]]\nbinding = "${binding.name}"\nbucket_name = "${binding.id}"\n`;
          break;
        case 'vectorize':
          config += `\n[[vectorize]]\nbinding = "${binding.name}"\nindex_name = "${binding.id}"\n`;
          break;
        case 'hyperdrive':
          config += `\n[[hyperdrive]]\nbinding = "${binding.name}"\nid = "${binding.id}"\n`;
          break;
        case 'queue':
          config += `\n[[queues.producers]]\nbinding = "${binding.name}"\nqueue = "${binding.name}"\n`;
          break;
        case 'durable_object':
          config += `\n[[durable_objects.bindings]]\nname = "${binding.name}"\nclass_name = "${binding.config?.className || binding.name}"\nscript_name = "${binding.config?.scriptName || 'worker'}"\n`;
          break;
      }
    }

    return config;
  }

  /**
   * Get all resources from D1
   */
  async listResources(type?: string): Promise<any[]> {
    let query = 'SELECT * FROM cf_resources WHERE status = ?';
    const params = ['active'];

    if (type) {
      query += ' AND resource_type = ?';
      params.push(type);
    }

    const result = await this.env.DB.prepare(query).bind(...params).all();
    return result.results || [];
  }

  /**
   * Delete resource
   */
  async deleteResource(resourceId: string, type: string): Promise<void> {
    // Mark as deleted in D1
    await this.env.DB.prepare(
      'UPDATE cf_resources SET status = ?, deleted_at = ? WHERE resource_id = ?'
    ).bind('deleted', Math.floor(Date.now() / 1000), resourceId).run();

    // Delete from Cloudflare based on type
    switch (type) {
      case 'kv':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
      case 'd1':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/d1/database/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
      case 'r2':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/r2/buckets/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
      case 'vectorize':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/vectorize/indexes/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
      case 'hyperdrive':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/hyperdrive/configs/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
      case 'queue':
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/queues/${resourceId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.env.CF_API_TOKEN}` },
          }
        );
        break;
    }
  }

  // Helper functions for parsing connection strings
  private parseHostFromConnectionString(connStr: string): string {
    const match = connStr.match(/@([^:\/]+)/);
    return match ? match[1] : 'localhost';
  }

  private parsePortFromConnectionString(connStr: string): number {
    const match = connStr.match(/:(\d+)\//);
    return match ? parseInt(match[1]) : 5432;
  }

  private parseUserFromConnectionString(connStr: string): string {
    const match = connStr.match(/\/\/([^:]+):/);
    return match ? match[1] : 'postgres';
  }

  private parsePasswordFromConnectionString(connStr: string): string {
    const match = connStr.match(/:([^@]+)@/);
    return match ? match[1] : '';
  }
}
