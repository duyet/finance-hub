import { generateRandomString, alphabet } from "oslo/crypto";
import { TimeSpan, createDate } from "oslo";
import { serializeCookie, parseCookies } from "oslo/cookie";
import { getDb, sessionDb } from "./db.server";
import type { User } from "./auth.server";

/**
 * Session cookie name
 */
const SESSION_COOKIE_NAME = "session";

/**
 * Session duration (30 days)
 */
const SESSION_EXPIRATION = new TimeSpan(30, "d");

/**
 * Get the base URL for the session cookie
 */
function getCookieBase(): string {
  if (process.env.OAUTH_REDIRECT_URL) {
    const url = new URL(process.env.OAUTH_REDIRECT_URL);
    return url.hostname;
  }

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    return "localhost";
  }

  // In production, this should be set via environment variable
  throw new Error(
    "OAUTH_REDIRECT_URL environment variable must be set in production"
  );
}

/**
 * Create a session cookie
 */
function createSessionCookie(sessionId: string, expiresAt: Date): string {
  return serializeCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    domain: process.env.NODE_ENV === "production" ? getCookieBase() : undefined,
  });
}

/**
 * Create a blank session cookie (for logout)
 */
function createBlankSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    domain: process.env.NODE_ENV === "production" ? getCookieBase() : undefined,
  });
}

/**
 * Get session ID from request cookies
 */
function getSessionId(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);
  return cookies.get(SESSION_COOKIE_NAME) || null;
}

/**
 * Generate a unique session ID
 */
async function generateSessionId(): Promise<string> {
  // Generate 20 characters with alphanumeric alphabet for ~120 bits of entropy
  return generateRandomString(20, alphabet("a-z", "0-9"));
}

/**
 * Create a new session for a user
 */
export async function createSession(
  request: Request,
  userId: string
): Promise<{ headers: Headers; sessionId: string }> {
  const db = getDb(request);
  const sessionId = await generateSessionId();
  const expiresAt = createDate(SESSION_EXPIRATION);

  // Create session in database
  await sessionDb.create(db, {
    id: sessionId,
    userId: userId,
    expiresAt: expiresAt,
  });

  // Create session cookie
  const sessionCookie = createSessionCookie(sessionId, expiresAt);

  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie);

  return { headers, sessionId };
}

/**
 * Validate session and return user if valid
 */
export async function validateSession(
  request: Request
): Promise<{ user: User; sessionId: string } | null> {
  const sessionId = getSessionId(request);

  if (!sessionId) {
    return null;
  }

  const db = getDb(request);
  const session = await sessionDb.findById(db, sessionId);

  if (!session) {
    return null;
  }

  const user: User = {
    id: session.user_id,
    email: session.email,
    name: session.name || undefined,
    avatarUrl: session.avatar_url || undefined,
    emailVerified: true, // OAuth users always have verified emails
    createdAt: new Date(), // Not needed for session validation
    updatedAt: new Date(),
  };

  return { user, sessionId };
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(
  request: Request,
  sessionId: string
): Promise<Headers> {
  const db = getDb(request);
  await sessionDb.delete(db, sessionId);

  const headers = new Headers();
  headers.append("Set-Cookie", createBlankSessionCookie());

  return headers;
}

/**
 * Get current user from session
 */
export async function getUserFromSession(
  request: Request
): Promise<User | null> {
  const session = await validateSession(request);
  return session ? session.user : null;
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(
  request: Request
): Promise<{ user: User; sessionId: string }> {
  const session = await validateSession(request);

  if (!session) {
    const url = new URL(request.url);
    const redirectUrl = new URL("/auth/login", url.origin);
    redirectUrl.searchParams.set("redirect", url.pathname + url.search);

    throw Response.redirect(redirectUrl.toString(), 302);
  }

  return session;
}
