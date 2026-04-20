import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Fernet = require("fernet") as {
  Secret: new (secret64: string) => unknown;
  Token: new (
    opts: Record<string, unknown>,
  ) => {
    encode: (message?: string) => string;
    decode: (token?: string) => string;
  };
};

function fernetKeyMaterial(): string {
  const explicit = process.env.GOOGLE_REFRESH_TOKEN_FERNET_KEY?.trim();
  if (explicit) {
    return explicit;
  }
  const fallback =
    process.env.MONIX_FERNET_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!fallback) {
    throw new Error(
      "Set GOOGLE_REFRESH_TOKEN_FERNET_KEY (or MONIX_FERNET_SECRET / SUPABASE_SERVICE_ROLE_KEY) for token encryption.",
    );
  }
  const digest = createHash("sha256").update(fallback, "utf8").digest();
  return digest.toString("base64url");
}

export function encryptAtRest(plaintext: string): string {
  const secret = new Fernet.Secret(fernetKeyMaterial());
  const token = new Fernet.Token({ secret, ttl: 0 });
  return token.encode(plaintext);
}

export function decryptAtRest(ciphertext: string): string {
  const secret = new Fernet.Secret(fernetKeyMaterial());
  const token = new Fernet.Token({ secret, ttl: 0, token: ciphertext });
  return token.decode();
}
