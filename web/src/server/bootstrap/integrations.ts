import { DjangoApiClient } from "@/server/infrastructure/django-api-client";
import { DjangoCloudflareRepository } from "@/server/repositories/django-cloudflare-repository";
import { DjangoGscRepository } from "@/server/repositories/django-gsc-repository";
import { CloudflareService } from "@/server/services/cloudflare-service";
import { GscService } from "@/server/services/gsc-service";

export function buildIntegrationServices() {
  const client = new DjangoApiClient();
  return {
    gsc: new GscService(new DjangoGscRepository(client)),
    cloudflare: new CloudflareService(new DjangoCloudflareRepository(client)),
  };
}
