export class UpstreamApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UpstreamApiError";
    this.status = status;
  }
}

function djangoOrigin(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_DJANGO_URL ||
    process.env.MONIX_DJANGO_URL ||
    "http://127.0.0.1:8000"
  )
    .trim()
    .replace(/\/$/, "");
}

function toHeaders(headersInit?: HeadersInit): Headers {
  return new Headers(headersInit ?? {});
}

export class DjangoApiClient {
  private readonly origin = djangoOrigin();

  async requestJson<T>(
    path: string,
    init: RequestInit,
    bearerToken?: string,
  ): Promise<T> {
    const res = await this.requestRaw(path, init, bearerToken);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        typeof err?.error === "string" && err.error.length > 0
          ? err.error
          : `Upstream request failed (${res.status})`;
      throw new UpstreamApiError(message, res.status);
    }
    return (await res.json()) as T;
  }

  async requestRaw(
    path: string,
    init: RequestInit,
    bearerToken?: string,
  ): Promise<Response> {
    const headers = toHeaders(init.headers);
    if (bearerToken) {
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(`${this.origin}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "manual",
    });
  }
}
