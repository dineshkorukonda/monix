import type { CloudflareRepository } from "@/server/domain/integrations";

export class CloudflareService {
  constructor(private readonly repo: CloudflareRepository) {}

  getStatus(token: string) {
    return this.repo.status(token);
  }

  connect(token: string, payload: { api_token: string }) {
    return this.repo.connect(token, payload);
  }

  disconnect(token: string) {
    return this.repo.disconnect(token);
  }

  listZones(token: string) {
    return this.repo.zones(token);
  }

  getAnalytics(token: string, zoneId: string, days: number) {
    return this.repo.analytics(token, zoneId, days);
  }
}
