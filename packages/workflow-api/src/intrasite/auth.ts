import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { SessionUser } from "./types.js";

const DEFAULT_SECRET = "carescope-intrasite-dev-secret-change-me";

export function jwtSecret(): string {
  return process.env["INTRASITE_JWT_SECRET"] || DEFAULT_SECRET;
}

export function jwtExpiresSeconds(): number {
  const raw = process.env["INTRASITE_JWT_EXPIRES_IN"] ?? "12h";
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match) return 12 * 60 * 60;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 60 * 60;
  return n * 60 * 60 * 24;
}

export function cookieName(): string {
  return process.env["INTRASITE_COOKIE_NAME"] ?? "intrasite_token";
}

export function cookieSecure(): boolean {
  return process.env["INTRASITE_COOKIE_SECURE"] === "true";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

type JwtPayload = SessionUser & { exp: number; iat: number };

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function signPart(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signToken(user: SessionUser): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    ...user,
    iat,
    exp: iat + jwtExpiresSeconds(),
  };
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = signPart(`${header}.${body}`, jwtSecret());
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): SessionUser | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = signPart(`${header}.${body}`, jwtSecret());
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as JwtPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!payload.id || !payload.email || !payload.role) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function assertLoginRateLimit(email: string): void {
  const now = Date.now();
  const windowMs = 60_000;
  const current = loginAttempts.get(email);
  if (!current || current.resetAt < now) {
    loginAttempts.set(email, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > 8) {
    throw Object.assign(new Error("Too many login attempts. Try again in a minute."), {
      status: 429,
    });
  }
}

export function clearLoginRateLimit(email: string): void {
  loginAttempts.delete(email);
}
