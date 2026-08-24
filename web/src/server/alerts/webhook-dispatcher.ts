export type WebhookEventType =
  | "incident.started"
  | "incident.resolved"
  | "certificate.expiry_warning";

export interface WebhookPayload {
  event: WebhookEventType;
  site: {
    id: string;
    url: string;
  };
  timestamp: string;
  details: Record<string, unknown>;
}

export async function dispatchWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  customFetch = fetch,
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const body = JSON.stringify(payload);
  let attempts = 0;
  let lastError: string | undefined;

  while (attempts < 2) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await customFetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Monix-Webhook/1.0",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, attempts };
      }
      lastError = `HTTP ${response.status}`;
    } catch (err: unknown) {
      lastError = (err as Error).message || "Webhook delivery failed";
    }
  }

  return { success: false, attempts, error: lastError };
}
