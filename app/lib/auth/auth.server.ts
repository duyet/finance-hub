import { generateState } from "arctic";
import { GitHub, Google } from "arctic";
import { generateRandomString, alphabet } from "oslo/crypto";
import { getDb, userDb } from "./db.server";

/**
 * Get environment variable or throw error if missing
 */
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get OAuth redirect URL
 */
function getRedirectUrl(): string {
  if (process.env.OAUTH_REDIRECT_URL) {
    return process.env.OAUTH_REDIRECT_URL;
  }

  // In development, use localhost
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8788";
  }

  // In production, this should be set via environment variable
  throw new Error(
    "OAUTH_REDIRECT_URL environment variable must be set in production"
  );
}

/**
 * Initialize GitHub OAuth provider (internal)
 */
const github = new GitHub(
  getEnvVar("GITHUB_CLIENT_ID"),
  getEnvVar("GITHUB_CLIENT_SECRET"),
  null
);

/**
 * Initialize Google OAuth provider (internal)
 */
const google = new Google(
  getEnvVar("GOOGLE_CLIENT_ID"),
  getEnvVar("GOOGLE_CLIENT_SECRET"),
  `${getRedirectUrl()}/auth/callback/google`
);

/**
 * Generate state for OAuth flow
 */
async function generateOAuthState(): Promise<string> {
  return await generateState();
}

/**
 * Create GitHub authorization URL
 */
export async function createGitHubAuthorizationUrl(): Promise<{
  url: URL;
  state: string;
}> {
  const state = await generateOAuthState();
  const url = github.createAuthorizationURL(state, ["user:email"]);

  return { url, state };
}

/**
 * Create Google authorization URL
 */
export async function createGoogleAuthorizationUrl(): Promise<{
  url: URL;
  state: string;
  codeVerifier: string;
}> {
  const state = await generateOAuthState();
  const codeVerifier = generateState();
  const url = google.createAuthorizationURL(state, codeVerifier, ["profile", "email"]);

  return { url, state, codeVerifier };
}

/**
 * Generate a unique user ID (internal)
 */
async function generateUserId(): Promise<string> {
  // Generate 15 characters with alphanumeric alphabet for ~90 bits of entropy
  return generateRandomString(15, alphabet("a-z", "0-9"));
}

/**
 * Validate and verify GitHub OAuth state
 */
export async function validateGitHubCallback(
  code: string,
  state: string,
  savedState: string
): Promise<GitHubUser> {
  if (state !== savedState) {
    throw new Error("Invalid state: CSRF token mismatch");
  }

  const tokens = await github.validateAuthorizationCode(code);
  const githubUserRequest = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });

  if (!githubUserRequest.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  const githubUser = await githubUserRequest.json() as GithubUserResponse;

  // Fetch user's primary email
  const githubEmailsRequest = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });

  let primaryEmail = githubUser.email;
  let emailVerified = !!githubUser.email;

  if (githubEmailsRequest.ok) {
    const emails = await githubEmailsRequest.json() as GithubEmailResponse[];
    const primary = emails.find((e) => e.primary && e.verified);
    if (primary) {
      primaryEmail = primary.email;
      emailVerified = primary.verified;
    }
  }

  return {
    id: githubUser.id.toString(),
    login: githubUser.login,
    name: githubUser.name || githubUser.login,
    email: primaryEmail || `${githubUser.login}@users.noreply.github.com`,
    emailVerified,
    avatarUrl: githubUser.avatar_url,
  };
}

/**
 * Validate and verify Google OAuth state
 */
export async function validateGoogleCallback(
  code: string,
  codeVerifier: string,
  state: string,
  savedState: string
): Promise<GoogleUser> {
  if (state !== savedState) {
    throw new Error("Invalid state: CSRF token mismatch");
  }

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const googleUserRequest = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    }
  );

  if (!googleUserRequest.ok) {
    throw new Error("Failed to fetch Google user");
  }

  const googleUser = await googleUserRequest.json() as GoogleUserResponse;

  return {
    id: googleUser.id,
    email: googleUser.email,
    emailVerified: !!googleUser.verified_email,
    name: googleUser.name,
    avatarUrl: googleUser.picture,
  };
}

/**
 * Get or create user from GitHub OAuth
 */
export async function getOrCreateGitHubUser(
  request: Request,
  githubUser: GitHubUser
): Promise<User> {
  const db = getDb(request);

  // Check if user exists by GitHub ID
  let user = await userDb.findByGitHubId(db, githubUser.id);

  if (!user) {
    // Check if user exists by email
    user = await userDb.findByEmail(db, githubUser.email);

    if (user) {
      // Link GitHub account to existing user
      await db
        .prepare("UPDATE users SET github_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(githubUser.id, user.id)
        .run();
      user = await userDb.findById(db, user.id);
    } else {
      // Create new user
      const userId = await generateUserId();
      user = await userDb.create(db, {
        id: userId,
        githubId: githubUser.id,
        email: githubUser.email,
        emailVerified: githubUser.emailVerified,
        name: githubUser.name,
        avatarUrl: githubUser.avatarUrl,
      });
    }
  } else {
    // Update user information
    user = await userDb.update(db, user.id, {
      email: githubUser.email,
      emailVerified: githubUser.emailVerified,
      name: githubUser.name,
      avatarUrl: githubUser.avatarUrl,
    });
  }

  return mapUserRowToUser(user!);
}

/**
 * Get or create user from Google OAuth
 */
export async function getOrCreateGoogleUser(
  request: Request,
  googleUser: GoogleUser
): Promise<User> {
  const db = getDb(request);

  // Check if user exists by Google ID
  let user = await userDb.findByGoogleId(db, googleUser.id);

  if (!user) {
    // Check if user exists by email
    user = await userDb.findByEmail(db, googleUser.email);

    if (user) {
      // Link Google account to existing user
      await db
        .prepare("UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(googleUser.id, user.id)
        .run();
      user = await userDb.findById(db, user.id);
    } else {
      // Create new user
      const userId = await generateUserId();
      user = await userDb.create(db, {
        id: userId,
        googleId: googleUser.id,
        email: googleUser.email,
        emailVerified: googleUser.emailVerified,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
      });
    }
  } else {
    // Update user information
    user = await userDb.update(db, user.id, {
      email: googleUser.email,
      emailVerified: googleUser.emailVerified,
      name: googleUser.name,
      avatarUrl: googleUser.avatarUrl,
    });
  }

  return mapUserRowToUser(user!);
}

/**
 * Map database row to User type
 */
function mapUserRowToUser(row: {
  id: string;
  github_id: string | null;
  google_id: string | null;
  email: string;
  email_verified: number;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}): User {
  return {
    id: row.id,
    githubId: row.github_id || undefined,
    googleId: row.google_id || undefined,
    email: row.email,
    emailVerified: row.email_verified === 1,
    name: row.name || undefined,
    avatarUrl: row.avatar_url || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Type definitions
 */
export interface User {
  id: string;
  githubId?: string;
  googleId?: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubUser {
  id: string;
  login: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
}

export interface GoogleUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}
