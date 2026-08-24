import { describe, expect, it } from "bun:test";
import { dispatchWebhook, type WebhookPayload } from "./webhook-dispatcher";

describe("webhook-dispatcher", () => {
  const payload: WebhookPayload = {
    event: "incident.started",
    site: {
      id: "1234",
      url: "https://example.com",
    },
    timestamp: new Date().toISOString(),
    details: {
      cause: "HTTP 500",
    },
  };

  it("successfully dispatches webhook on 200 OK", async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    };

    const res = await dispatchWebhook(
      "https://webhook.example.com",
      payload,
      mockFetch,
    );
    expect(res.success).toBe(true);
    expect(res.attempts).toBe(1);
  });

  it("retries once on failure and reports error when both fail", async () => {
    let calls = 0;
    const mockFetch = async () => {
      calls++;
      return new Response("BadRequest", { status: 500 });
    };

    const res = await dispatchWebhook(
      "https://webhook.example.com",
      payload,
      mockFetch,
    );
    expect(res.success).toBe(false);
    expect(res.attempts).toBe(2);
    expect(calls).toBe(2);
  });
});
