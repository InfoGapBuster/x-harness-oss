import type { HttpClient } from '../http.js';
import type { ApiResponse, ScheduledPost, CollectedPost } from '../types.js';

export class PostsResource {
  constructor(private readonly http: HttpClient) {}

  async post(text: string, mediaIds?: string[], quoteTweetId?: string): Promise<{ id: string; text: string }> {
    const res = await this.http.post<ApiResponse<{ id: string; text: string }>>('/api/posts', { text, mediaIds, quoteTweetId });
    return res.data;
  }

  async quote(xAccountId: string, text: string, quoteTweetId: string): Promise<{ id: string; text: string }> {
    const res = await this.http.post<ApiResponse<{ id: string; text: string }>>('/api/posts', { xAccountId, text, quoteTweetId });
    return res.data;
  }

  async reply(xAccountId: string, text: string, tweetId: string): Promise<{ id: string; text: string }> {
    const res = await this.http.post<ApiResponse<{ id: string; text: string }>>(`/api/posts/${tweetId}/reply`, { xAccountId, text });
    return res.data;
  }

  async schedule(xAccountId: string, text: string, scheduledAt: string, mediaIds?: string[]): Promise<ScheduledPost> {
    const res = await this.http.post<ApiResponse<ScheduledPost>>('/api/posts/schedule', { xAccountId, text, scheduledAt, mediaIds });
    return res.data;
  }

  async listScheduled(xAccountId?: string): Promise<ScheduledPost[]> {
    const qs = xAccountId ? `?xAccountId=${xAccountId}` : '';
    const res = await this.http.get<ApiResponse<ScheduledPost[]>>(`/api/posts/scheduled${qs}`);
    return res.data;
  }

  async cancelScheduled(id: string): Promise<void> {
    await this.http.delete(`/api/posts/scheduled/${id}`);
  }

  async collect(xAccountId: string, query: string): Promise<{ count: number; nextToken?: string }> {
    const res = await this.http.post<ApiResponse<{ count: number; nextToken?: string }>>('/api/posts/collect', { xAccountId, query });
    return res.data;
  }

  async listCollected(xAccountId: string, opts: { query?: string; limit?: number; offset?: number } = {}): Promise<CollectedPost[]> {
    const params = new URLSearchParams({ xAccountId });
    if (opts.query) params.set('query', opts.query);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    const res = await this.http.get<ApiResponse<CollectedPost[]>>(`/api/posts/collected?${params}`);
    return res.data;
  }

  async deleteCollected(id: string): Promise<void> {
    await this.http.delete(`/api/posts/collected/${id}`);
  }
}
