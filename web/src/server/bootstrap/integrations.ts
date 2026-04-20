import { SupabaseCloudflareRepository } from "@/server/repositories/supabase-cloudflare-repository";
import { SupabaseGscRepository } from "@/server/repositories/supabase-gsc-repository";
import { CloudflareService } from "@/server/services/cloudflare-service";
import { GscService } from "@/server/services/gsc-service";

export function buildIntegrationServices() {
  return {
    gsc: new GscService(new SupabaseGscRepository()),
    cloudflare: new CloudflareService(new SupabaseCloudflareRepository()),
  };
}
