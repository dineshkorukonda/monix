export interface TargetRecord {
  id: string;
  url: string;
  name: string;
  gsc_property_url?: string | null;
  gsc_analytics?: unknown;
}

export interface ScanRecord {
  id: string;
  report_id: string;
  url: string;
  score: number;
  created_at: string;
}

export interface TargetRepository {
  list(token: string): Promise<TargetRecord[]>;
  get(token: string, targetId: string): Promise<TargetRecord>;
}

export interface ScanRepository {
  list(token: string): Promise<ScanRecord[]>;
  getReport(token: string, reportId: string): Promise<unknown>;
}

export interface CredentialRepository {
  gscStatus(token: string): Promise<{ connected: boolean }>;
  cloudflareStatus(token: string): Promise<{ connected: boolean; account_name?: string; account_id?: string; zones_count?: number }>;
}
