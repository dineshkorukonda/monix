import type { GscAnalyticsRequest, GscRepository } from "@/server/domain/integrations";

export class GscService {
  constructor(private readonly repo: GscRepository) {}

  getConnectAuthorizationUrl(token: string) {
    return this.repo.connectUrl(token);
  }

  handleOAuthCallback(query: string) {
    return this.repo.callback(query);
  }

  getStatus(token: string) {
    return this.repo.status(token);
  }

  listSites(token: string) {
    return this.repo.sites(token);
  }

  getAnalytics(token: string, payload: GscAnalyticsRequest) {
    return this.repo.analytics(token, payload);
  }

  disconnect(token: string) {
    return this.repo.disconnect(token);
  }

  syncTargets(token: string) {
    return this.repo.syncTargets(token);
  }
}
