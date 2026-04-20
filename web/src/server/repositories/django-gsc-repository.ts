import type {
  GscAnalyticsRequest,
  GscRepository,
} from "@/server/domain/integrations";
import type { DjangoApiClient } from "@/server/infrastructure/django-api-client";

export class DjangoGscRepository implements GscRepository {
  constructor(private readonly client: DjangoApiClient) {}

  connectUrl(ctx: { bearerToken: string; supabaseUserId: string }) {
    void ctx.supabaseUserId;
    return this.client.requestJson<{ authorization_url: string }>(
      "/api/gsc/connect/",
      { method: "GET" },
      ctx.bearerToken,
    );
  }

  callback(query: string) {
    return this.client.requestRaw(`/api/gsc/callback/?${query}`, {
      method: "GET",
    });
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
    return this.client.requestJson<{
      ok: boolean;
      targets: number;
      errors: number;
    }>("/api/gsc/sync-targets/", { method: "POST", body: "{}" }, token);
  }
}
