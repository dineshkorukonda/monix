import type { CloudflareRepository } from "@/server/domain/integrations";
import type { DjangoApiClient } from "@/server/infrastructure/django-api-client";

export class DjangoCloudflareRepository implements CloudflareRepository {
  constructor(private readonly client: DjangoApiClient) {}

  status(token: string) {
    return this.client.requestJson<{
      connected: boolean;
      account_name?: string;
      account_id?: string;
      zones_count?: number;
    }>("/api/cloudflare/status/", { method: "GET" }, token);
  }

  connect(token: string, payload: { api_token: string }) {
    return this.client.requestJson<{
      success: boolean;
      account_name: string;
      zones_count: number;
    }>(
      "/api/cloudflare/connect/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
  }

  disconnect(token: string) {
    return this.client.requestJson<{ ok: boolean }>(
      "/api/cloudflare/disconnect/",
      { method: "DELETE" },
      token,
    );
  }

  zones(token: string) {
    return this.client.requestJson<
      Array<{ id: string; name: string; status: string; plan_name: string }>
    >("/api/cloudflare/zones/", { method: "GET" }, token);
  }

  analytics(token: string, zoneId: string, days: number) {
    const params = new URLSearchParams({ zone_id: zoneId, days: String(days) });
    return this.client.requestJson<unknown>(
      `/api/cloudflare/analytics/?${params}`,
      { method: "GET" },
      token,
    );
  }
}
