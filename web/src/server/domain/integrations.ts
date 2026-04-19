export interface GscAnalyticsRequest {
  site_url: string;
  start_date?: string;
  end_date?: string;
}

export interface GscRepository {
  connectUrl(token: string): Promise<{ authorization_url: string }>;
  callback(query: string): Promise<Response>;
  status(token: string): Promise<{ connected: boolean }>;
  sites(token: string): Promise<{ sites: unknown[] }>;
  analytics(token: string, payload: GscAnalyticsRequest): Promise<unknown>;
  disconnect(token: string): Promise<{ ok: boolean }>;
  syncTargets(
    token: string,
  ): Promise<{ ok: boolean; targets: number; errors: number }>;
}

export interface CloudflareRepository {
  status(token: string): Promise<{
    connected: boolean;
    account_name?: string;
    account_id?: string;
    zones_count?: number;
  }>;
  connect(
    token: string,
    payload: { api_token: string },
  ): Promise<{ success: boolean; account_name: string; zones_count: number }>;
  disconnect(token: string): Promise<{ ok: boolean }>;
  zones(
    token: string,
  ): Promise<
    Array<{ id: string; name: string; status: string; plan_name: string }>
  >;
  analytics(token: string, zoneId: string, days: number): Promise<unknown>;
}

export interface IntegrationCredentialsRepository {
  getGscStatus(token: string): Promise<{ connected: boolean }>;
  getCloudflareStatus(token: string): Promise<{
    connected: boolean;
    account_name?: string;
    account_id?: string;
    zones_count?: number;
  }>;
}
