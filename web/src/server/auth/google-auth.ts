import { signGoogleSignInState } from "./google-signin-state";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

function googleSignInConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI?.trim() || "";
  return { clientId, clientSecret, redirectUri };
}

export async function buildGoogleSignInAuthUrl(): Promise<string> {
  const { clientId, redirectUri } = googleSignInConfig();
  if (!clientId || !redirectUri) {
    throw new Error(
      "Set GOOGLE_CLIENT_ID and GOOGLE_AUTH_REDIRECT_URI for Google Sign-In.",
    );
  }
  const state = await signGoogleSignInState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleSignInCode(code: string): Promise<{
  access_token: string;
}> {
  const { clientId, clientSecret, redirectUri } = googleSignInConfig();
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET must be set.");
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return { access_token: String(data.access_token) };
}

export async function getGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get Google user info: ${res.status}`);
  return (await res.json()) as {
    id: string;
    email: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
}
