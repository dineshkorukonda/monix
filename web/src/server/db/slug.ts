const CLEAN_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

export function generatePublicSlug(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += CLEAN_ALPHABET[bytes[i] % CLEAN_ALPHABET.length];
  }
  return id;
}

export function isValidPublicSlug(slug: unknown): slug is string {
  if (typeof slug !== "string") return false;
  if (!slug || slug.length < 6 || slug.length > 32) return false;
  return /^[A-Za-z0-9_-]+$/.test(slug);
}
