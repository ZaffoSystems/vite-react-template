import { Env } from '../types/env';

interface DockerImage {
  repository: string;
  tag: string;
  digest: string;
  lastUpdated: string;
  size: number;
}

/**
 * Docker Hub Sync Service
 * Monitors Docker Hub for image updates and triggers Worker deployments
 */
export class DockerHubClient {
  private username?: string;
  private token?: string;
  private baseUrl = 'https://hub.docker.com/v2';

  constructor(env: Env) {
    this.username = env.DOCKER_HUB_USERNAME;
    this.token = env.DOCKER_HUB_TOKEN;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Docker Hub API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Authenticate with Docker Hub
   */
  async authenticate(username: string, password: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Docker Hub authentication failed');
    }

    const data = await response.json() as any;
    this.token = data.token;
    return data.token;
  }

  /**
   * List repositories for a user
   */
  async listRepositories(username?: string): Promise<any[]> {
    const user = username || this.username;
    if (!user) {
      throw new Error('Username required');
    }

    const data = await this.request(`/repositories/${user}/`);
    return data.results || [];
  }

  /**
   * Get repository details
   */
  async getRepository(repository: string): Promise<any> {
    return this.request(`/repositories/${repository}/`);
  }

  /**
   * List tags for a repository
   */
  async listTags(repository: string, page: number = 1, pageSize: number = 100): Promise<DockerImage[]> {
    const data = await this.request(`/repositories/${repository}/tags?page=${page}&page_size=${pageSize}`);

    return (data.results || []).map((tag: any) => ({
      repository,
      tag: tag.name,
      digest: tag.digest,
      lastUpdated: tag.last_updated,
      size: tag.full_size,
    }));
  }

  /**
   * Get specific tag details
   */
  async getTag(repository: string, tag: string): Promise<DockerImage | null> {
    try {
      const data = await this.request(`/repositories/${repository}/tags/${tag}/`);

      return {
        repository,
        tag: data.name,
        digest: data.digest,
        lastUpdated: data.last_updated,
        size: data.full_size,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if image has been updated since last sync
   */
  async hasImageUpdated(repository: string, tag: string, lastDigest: string): Promise<boolean> {
    const image = await this.getTag(repository, tag);
    if (!image) return false;

    return image.digest !== lastDigest;
  }

  /**
   * Sync repository and return changed images
   */
  async syncRepository(repository: string, existingImages: Map<string, string>): Promise<DockerImage[]> {
    const tags = await this.listTags(repository);
    const updatedImages: DockerImage[] = [];

    for (const image of tags) {
      const lastDigest = existingImages.get(image.tag);

      if (!lastDigest || lastDigest !== image.digest) {
        updatedImages.push(image);
      }
    }

    return updatedImages;
  }

  /**
   * Get image manifest (for deployment info)
   */
  async getManifest(repository: string, tag: string): Promise<any> {
    try {
      // This requires Docker Registry API v2, not Hub API
      const registryUrl = `https://registry-1.docker.io/v2/${repository}/manifests/${tag}`;

      const response = await fetch(registryUrl, {
        headers: {
          'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Watch repository for changes (for scheduled sync)
   */
  async watchRepository(
    repository: string,
    db: D1Database,
    onUpdate: (image: DockerImage) => Promise<void>
  ): Promise<void> {
    // Load existing images from database
    const existing = await db.prepare(
      'SELECT tag, digest FROM docker_images WHERE repository = ?'
    ).bind(repository).all();

    const existingMap = new Map<string, string>();
    for (const row of existing.results) {
      existingMap.set(row.tag as string, row.digest as string);
    }

    // Sync and get updates
    const updatedImages = await this.syncRepository(repository, existingMap);

    // Process each update
    for (const image of updatedImages) {
      await onUpdate(image);

      // Update database
      await db.prepare(
        `INSERT INTO docker_images (id, repository, tag, digest, last_synced, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         digest = excluded.digest,
         last_synced = excluded.last_synced,
         updated_at = excluded.updated_at`
      ).bind(
        `${repository}:${image.tag}`,
        repository,
        image.tag,
        image.digest,
        Date.now(),
        Date.now()
      ).run();
    }
  }
}
