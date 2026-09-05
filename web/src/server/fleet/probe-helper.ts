import http from "node:http";
import https from "node:https";

export interface RobustProbeResult {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  finalUrl: string | null;
  pageTitle: string | null;
  bodySnippet: string;
  isLoginProtected: boolean;
  loginPortalType: string | null;
  error: string | null;
}

const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
});

function singleRequest(
  urlStr: string,
  timeoutMs: number,
  rejectUnauthorized: boolean,
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  durationMs: number;
}> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;
      const agent =
        isHttps && !rejectUnauthorized ? insecureHttpsAgent : undefined;

      const req = client.request(
        urlStr,
        {
          method: "GET",
          agent,
          timeout: timeoutMs,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MonixFleetBot/2.0",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            if (body.length < 150000) {
              body += chunk;
            }
          });
          res.on("end", () => {
            const durationMs = Date.now() - start;
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body,
              durationMs,
            });
          });
        },
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Timeout (exceeded ${timeoutMs}ms)`));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function robustProbeSite(
  initialUrl: string,
  timeoutMs = 9000,
): Promise<RobustProbeResult> {
  const start = Date.now();
  let currentUrl = initialUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = `https://${currentUrl}`;
  }

  let hops = 0;
  const maxHops = 4;
  let finalStatusCode: number | null = null;
  let finalBody = "";
  let finalUrl = currentUrl;
  let lastError: string | null = null;

  while (hops < maxHops) {
    hops++;
    const remainingTime = Math.max(2000, timeoutMs - (Date.now() - start));
    let res: {
      statusCode: number;
      headers: http.IncomingHttpHeaders;
      body: string;
      durationMs: number;
    } | null = null;

    try {
      res = await singleRequest(currentUrl, remainingTime, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        /certificate|leaf|self-signed|unable to verify|UNABLE_TO_VERIFY|CERT_/i.test(
          errMsg,
        )
      ) {
        try {
          res = await singleRequest(currentUrl, remainingTime, false);
        } catch (innerErr: unknown) {
          lastError =
            innerErr instanceof Error ? innerErr.message : "Connection failed";
          break;
        }
      } else {
        lastError = errMsg;
        break;
      }
    }

    if (!res) break;

    finalStatusCode = res.statusCode;
    finalBody = res.body;
    finalUrl = currentUrl;

    if (
      [301, 302, 303, 307, 308].includes(res.statusCode) &&
      res.headers.location
    ) {
      try {
        const nextUrl = new URL(res.headers.location, currentUrl).toString();
        currentUrl = nextUrl;
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  const totalTimeMs = Date.now() - start;

  if (finalStatusCode === null) {
    return {
      isUp: false,
      statusCode: null,
      responseTimeMs: totalTimeMs,
      finalUrl: currentUrl,
      pageTitle: null,
      bodySnippet: "",
      isLoginProtected: false,
      loginPortalType: null,
      error: lastError || "Connection failed or host unreachable",
    };
  }

  let pageTitle: string | null = null;
  const titleMatch = finalBody.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]) {
    pageTitle = titleMatch[1].replace(/\s+/g, " ").trim();
  }

  const hasLoginForm = /<form[^>]*>|<input[^>]*type=["'password["']/i.test(
    finalBody,
  );
  const hasAuthKeywords =
    /login|sign in|sign-in|sso|cas|erp|auth|authentication|username|credentials|forbidden|access denied/i.test(
      finalBody,
    ) || /login|auth\sso|erp/i.test(finalUrl || "");

  let isLoginProtected = false;
  let loginPortalType: string | null = null;

  if (
    hasLoginForm ||
    hasAuthKeywords ||
    finalStatusCode === 401 ||
    finalStatusCode === 403
  ) {
    isLoginProtected = true;
    if (finalStatusCode === 403 || finalStatusCode === 401) {
      loginPortalType = "Protected Gateway (403/401)";
    } else if (pageTitle && /erp/i.test(pageTitle)) {
      loginPortalType = `ERP Portal (${pageTitle})`;
    } else if (pageTitle && /lms/i.test(pageTitle)) {
      loginPortalType = `LMS Portal (${pageTitle})`;
    } else if (pageTitle && /sac/i.test(pageTitle)) {
      loginPortalType = `SAC Portal (${pageTitle})`;
    } else if (pageTitle) {
      loginPortalType = `Auth Portal: ${pageTitle.slice(0, 24)}`;
    } else {
      loginPortalType = "Login / Auth Gateway";
    }
  }

  const isUp =
    (finalStatusCode >= 200 && finalStatusCode < 400) ||
    finalStatusCode === 401 ||
    finalStatusCode === 403;

  return {
    isUp,
    statusCode: finalStatusCode,
    responseTimeMs: totalTimeMs,
    finalUrl,
    pageTitle,
    bodySnippet: finalBody.slice(0, 2000),
    isLoginProtected,
    loginPortalType,
    error: isUp ? null : `HTTP ${finalStatusCode}`,
  };
}
