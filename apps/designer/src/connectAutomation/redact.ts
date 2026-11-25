const SENSITIVE = /mrn|ssn|dob|birth|patient|name|token|password|secret|authorization|bearer|credential/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE.test(key);
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? "[redacted]" : redactValue(item, depth + 1);
  }
  return out;
}

export function containsSecret(config: Record<string, unknown>): boolean {
  return Object.entries(config).some(([key, value]) => {
    if (!isSensitiveKey(key) || key === "credentialRef") return false;
    return typeof value === "string" && value.trim().length > 0;
  });
}

const BLOCKED_HOST = /^(localhost|metadata\.google\.internal|.*\.local|.*\.internal)$/i;

export function validateHttpsDestination(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "URL is not valid.";
  }
  if (url.username || url.password) return "URLs with embedded credentials are not allowed.";
  if (url.protocol !== "https:") return "Only https destinations are allowed.";
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOST.test(host) || host === "0.0.0.0") return "That destination is not allowed.";
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return "Private addresses are not allowed.";
  const octets = host.split(".").map((part) => Number(part));
  if (octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return "Private addresses are not allowed.";
  return null;
}

export function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value;
  let current = value;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function writePath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const next = cursor[part];
    if (!next || typeof next !== "object") cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

export function coerce(value: unknown, type: string, fallback: string): unknown {
  const source = value === undefined || value === null || value === "" ? fallback : value;
  if (type === "number") {
    const parsed = Number(source);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === "boolean") return source === true || source === "true" || source === "yes";
  return source === undefined || source === null ? "" : String(source);
}
