import crypto from "node:crypto";
import { pool } from "@/lib/db.server";

export type AppUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  is_active: boolean;
};

const SESSION_COOKIE = "tati_session";
const SESSION_TTL_DAYS = Number(process.env.TATI_SESSION_TTL_DAYS ?? 30);
const AUTH_REQUIRED = String(process.env.TATI_AUTH_REQUIRED ?? "false").toLowerCase() === "true";

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${b64url(salt)}$${b64url(derived)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, saltB64, hashB64] = stored.split("$");
    if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const got = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      }),
  );
}

export async function getUserFromRequest(request: Request): Promise<AppUser | null> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const { rows } = await pool.query<AppUser>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.role, u.is_active
     FROM public.user_sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.is_active = true
     LIMIT 1`,
    [tokenHash] as never,
  );
  return rows[0] ?? null;
}

export function isAuthRequired(): boolean {
  return AUTH_REQUIRED;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = b64url(crypto.randomBytes(48));
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO public.user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()] as never,
  );
  return { token, expiresAt };
}

export async function revokeSession(token: string | null): Promise<void> {
  if (!token) return;
  await pool.query(`DELETE FROM public.user_sessions WHERE token_hash = $1`, [hashToken(token)] as never);
}

export function buildSessionCookie(token: string, expiresAt: Date): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Expires=${expiresAt.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function readSessionTokenFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies[SESSION_COOKIE] ?? null;
}
