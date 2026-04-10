const TRANSIENT_PATTERNS = [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "socket hang up",
  "network error",
  "timeout",
  "502",
  "503",
  "504",
  "rate limit",
  "AbortError",
  "FetchError",
];

export function isTransientError(error: unknown): boolean {
  const msg = String((error as any)?.message ?? error).toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p.toLowerCase()));
}
