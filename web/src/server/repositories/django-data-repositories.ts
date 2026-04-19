import type {
  CredentialRepository,
  ScanRecord,
  ScanRepository,
  TargetRecord,
  TargetRepository,
} from "@/server/domain/repositories";
import type { DjangoApiClient } from "@/server/infrastructure/django-api-client";

export class DjangoTargetRepository implements TargetRepository {
  constructor(private readonly client: DjangoApiClient) {}

  list(token: string): Promise<TargetRecord[]> {
    return this.client.requestJson<TargetRecord[]>(
      "/api/targets/",
      { method: "GET" },
      token,
    );
  }

  get(token: string, targetId: string): Promise<TargetRecord> {
    return this.client.requestJson<TargetRecord>(
      `/api/targets/${targetId}/`,
      { method: "GET" },
      token,
    );
  }
}

export class DjangoScanRepository implements ScanRepository {
  constructor(private readonly client: DjangoApiClient) {}

  list(token: string): Promise<ScanRecord[]> {
    return this.client.requestJson<ScanRecord[]>(
      "/api/scans/",
      { method: "GET" },
      token,
    );
  }

  getReport(token: string, reportId: string): Promise<unknown> {
    return this.client.requestJson<unknown>(
      `/api/reports/${reportId}/`,
      { method: "GET" },
      token,
    );
  }
}

export class DjangoCredentialRepository implements CredentialRepository {
  constructor(private readonly client: DjangoApiClient) {}

  gscStatus(token: string): Promise<{ connected: boolean }> {
    return this.client.requestJson<{ connected: boolean }>(
      "/api/gsc/status/",
      { method: "GET" },
      token,
    );
  }

  cloudflareStatus(token: string): Promise<{
    connected: boolean;
    account_name?: string;
    account_id?: string;
    zones_count?: number;
  }> {
    return this.client.requestJson<{
      connected: boolean;
      account_name?: string;
      account_id?: string;
      zones_count?: number;
    }>("/api/cloudflare/status/", { method: "GET" }, token);
  }
}
