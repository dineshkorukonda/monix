import { DjangoApiClient } from "@/server/infrastructure/django-api-client";
import type { GscAnalyticsRequest, GscRepository } from "@/server/domain/integrations";

export class DjangoGscRepository implements GscRepository {
  constructor(private readonly client: DjangoApiClient) {}

  connectUrl(token: string) {
    return this.client.requestJson<{ authorization_url: string }>(
      "/api/gsc/connect/",
      { method: "GET" },
      token,
    );
  }

  callback(query: string) {
    return this.client.requestRaw(`/api/gsc/callback/?${query}`, { method: "GET" });
  }

  status(token: string) {
    return this.client.requestJson<{ connected: boolean }>(
      "/api/gsc/status/",
      { method: "GET" },
      token,
    );
  }

  sites(token: string) {
    return this.client.requestJson<{ sites: unknown[] }>(
      "/api/gsc/sites/",
      { method: "GET" },
      token,
    );
  }

  analytics(token: string, payload: GscAnalyticsRequest) {
    return this.client.requestJson<unknown>(
      "/api/gsc/analytics/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
  }

  disconnect(token: string) {
    return this.client.requestJson<{ ok: boolean }>(
      "/api/gsc/disconnect/",
      { method: "POST", body: "{}" },
      token,
    );
  }

  syncTargets(token: string) {
    return this.client.requestJson<{ ok: boolean; targets: number; errors: number }>(
      "/api/gsc/sync-targets/",
      { method: "POST", body: "{}" },
      token,
    );
  }
}
