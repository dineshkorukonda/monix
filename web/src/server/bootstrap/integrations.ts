import { DjangoApiClient } from "@/server/infrastructure/django-api-client";
import { DjangoCloudflareRepository } from "@/server/repositories/django-cloudflare-repository";
import { DjangoGscRepository } from "@/server/repositories/django-gsc-repository";
import { CloudflareService } from "@/server/services/cloudflare-service";
import { GscService } from "@/server/services/gsc-service";

const client = new DjangoApiClient();

export function buildIntegrationServices() {
  return {
    gsc: new GscService(new DjangoGscRepository(client)),
    cloudflare: new CloudflareService(new DjangoCloudflareRepository(client)),
  };
}
