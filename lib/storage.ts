"use client";

/**
 * Everything Cueline remembers lives in this browser. The API key in
 * particular is never written to a server — it is attached to a single
 * request at fire time and discarded on the other end.
 */

const KEY_PREFIX = "cueline:";

export function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the session still works, it just won't persist */
  }
}

export function drop(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_PREFIX + key);
}
