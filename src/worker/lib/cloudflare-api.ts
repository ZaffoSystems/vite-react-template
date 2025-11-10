import { Env } from '../types/env';

/**
 * Cloudflare API Client
 * Full management of CF infrastructure: Workers, KV, D1, R2, Queues, Durable Objects
 */
export class CloudflareAPI {
  private apiToken: string;
  private accountId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(env: Env) {
    this.apiToken = env.CF_API_TOKEN;
    this.accountId = env.CF_ACCOUNT_ID;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      throw new Error(`CF API Error: ${data.errors?.[0]?.message || response.statusText}`);
    }

    return data.result;
  }

  // ==================== Workers ====================

  async listWorkers(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/workers/scripts`);
  }

  async getWorker(scriptName: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
  }

  async deployWorker(scriptName: string, script: string, bindings?: any): Promise<any> {
    const formData = new FormData();
    formData.append('script', new Blob([script], { type: 'application/javascript+module' }));

    if (bindings) {
      formData.append('bindings', JSON.stringify(bindings));
    }

    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });
  }

  async deleteWorker(scriptName: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, {
      method: 'DELETE',
    });
  }

  async getWorkerSettings(scriptName: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}/settings`);
  }

  async updateWorkerSettings(scriptName: string, settings: any): Promise<any> {
    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // ==================== KV ====================

  async listKVNamespaces(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/storage/kv/namespaces`);
  }

  async createKVNamespace(title: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/storage/kv/namespaces`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteKVNamespace(namespaceId: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}`, {
      method: 'DELETE',
    });
  }

  async listKVKeys(namespaceId: string, prefix?: string): Promise<any[]> {
    const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
    return this.request(`/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/keys${params}`);
  }

  // ==================== D1 ====================

  async listD1Databases(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/d1/database`);
  }

  async createD1Database(name: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/d1/database`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteD1Database(databaseId: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/d1/database/${databaseId}`, {
      method: 'DELETE',
    });
  }

  async queryD1(databaseId: string, sql: string, params?: any[]): Promise<any> {
    return this.request(`/accounts/${this.accountId}/d1/database/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }

  // ==================== R2 ====================

  async listR2Buckets(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/r2/buckets`);
  }

  async createR2Bucket(name: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/r2/buckets`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteR2Bucket(name: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/r2/buckets/${name}`, {
      method: 'DELETE',
    });
  }

  // ==================== Queues ====================

  async listQueues(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/queues`);
  }

  async createQueue(name: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/queues`, {
      method: 'POST',
      body: JSON.stringify({ queue_name: name }),
    });
  }

  async deleteQueue(queueId: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/queues/${queueId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Durable Objects ====================

  async listDurableObjects(scriptName: string, className: string): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/workers/durable_objects/namespaces/${scriptName}/${className}/objects`);
  }

  // ==================== Analytics ====================

  async getWorkerAnalytics(scriptName: string, since?: Date): Promise<any> {
    const params = since ? `?since=${since.toISOString()}` : '';
    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}/analytics${params}`);
  }

  async getAccountAnalytics(): Promise<any> {
    return this.request(`/accounts/${this.accountId}/analytics/dashboard`);
  }

  // ==================== Zones ====================

  async listZones(): Promise<any[]> {
    return this.request(`/zones`);
  }

  async getZone(zoneId: string): Promise<any> {
    return this.request(`/zones/${zoneId}`);
  }

  // ==================== DNS ====================

  async listDNSRecords(zoneId: string): Promise<any[]> {
    return this.request(`/zones/${zoneId}/dns_records`);
  }

  async createDNSRecord(zoneId: string, record: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }): Promise<any> {
    return this.request(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Vectorize ====================

  async listVectorizeIndexes(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/vectorize/indexes`);
  }

  async createVectorizeIndex(name: string, config: {
    dimensions: number;
    metric?: 'cosine' | 'euclidean' | 'dot-product';
  }): Promise<any> {
    return this.request(`/accounts/${this.accountId}/vectorize/indexes`, {
      method: 'POST',
      body: JSON.stringify({ name, config }),
    });
  }

  async deleteVectorizeIndex(indexName: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/vectorize/indexes/${indexName}`, {
      method: 'DELETE',
    });
  }

  // ==================== AI Gateway ====================

  async listAIGateways(): Promise<any[]> {
    return this.request(`/accounts/${this.accountId}/ai-gateway/gateways`);
  }

  async createAIGateway(name: string): Promise<any> {
    return this.request(`/accounts/${this.accountId}/ai-gateway/gateways`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getAIGatewayLogs(gatewayId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/ai-gateway/gateways/${gatewayId}/logs${query}`);
  }
}
