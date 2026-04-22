"use client";

export type StoredAuthSession = {
  email: string;
  token: string;
};

const STORAGE_KEY = "monix.auth.session";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredAuthSession(session: StoredAuthSession): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken(): string {
  return getStoredAuthSession()?.token ?? "";
}
