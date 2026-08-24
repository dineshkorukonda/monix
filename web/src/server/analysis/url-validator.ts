export interface UrlValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}

export function normalizeAndValidateScanUrl(
  input: unknown,
): UrlValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "URL must be a string." };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "URL cannot be empty." };
  }
  if (trimmed.includes(" ")) {
    return { valid: false, error: "URL cannot contain spaces." };
  }

  let formatted = trimmed;
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Protocol must be http or https." };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return { valid: false, error: "Hostname must be a valid domain." };
    }
    if (!/^[a-zA-Z0-9.-]+$/.test(parsed.hostname)) {
      return { valid: false, error: "Hostname contains invalid characters." };
    }
    return { valid: true, url: formatted };
  } catch {
    return { valid: false, error: "Malformed URL." };
  }
}
