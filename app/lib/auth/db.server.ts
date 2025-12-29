import type {
  D1Database,
  Fetcher,
  R2Bucket,
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  /** Cloudflare Workers AI binding for text/image inference */
  AI?: Fetcher;
  /** KV namespace for caching */
  CACHE?: KVNamespace;
  /** Queue for async tasks (OCR processing) */
  QUEUE?: Queue<unknown>;
  /** R2 bucket for receipt image storage */
  RECEIPTS_BUCKET?: R2Bucket;
  /** Public URL for R2 bucket (e.g., https://pub-xxx.r2.dev) */
  R2_PUBLIC_URL?: string;
  /** Bucket name for receipts */
  BUCKET_NAME?: string;
  /** OCR model selection: "gemma-3" (default) or "llama-3.2" */
  OCR_MODEL?: string;
  /** Cloudflare AI Gateway ID for observability and caching */
  AI_GATEWAY_ID?: string;
  /** Cloudflare Account ID for AI Gateway */
  CLOUDFLARE_ACCOUNT_ID?: string;
  /** AI Gateway name (configured in Cloudflare dashboard) */
  AI_GATEWAY_NAME?: string;
  /** OpenRouter API token for model provider diversity */
  OPENROUTER_API_TOKEN?: string;
  // Other bindings...
}

export interface CloudflareRequest extends Request {
  context?: {
    cloudflare?: {
      env: Env;
    };
  };
}

/**
 * Get the D1 database instance from the Cloudflare context
 */
export function getDb(request: CloudflareRequest): D1Database {
  const context = request.context;

  if (!context?.cloudflare?.env?.DB) {
    throw new Error("D1 database binding not found. Make sure DB is bound in wrangler.toml");
  }

  return context.cloudflare.env.DB;
}

/**
 * User database operations
 */
export const userDb = {
  /**
   * Find user by ID
   */
  async findById(db: D1Database, userId: string) {
    const result = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<UserRow>();

    return result || null;
  },

  /**
   * Find user by GitHub ID
   */
  async findByGitHubId(db: D1Database, githubId: string) {
    const result = await db
      .prepare("SELECT * FROM users WHERE github_id = ?")
      .bind(githubId)
      .first<UserRow>();

    return result || null;
  },

  /**
   * Find user by Google ID
   */
  async findByGoogleId(db: D1Database, googleId: string) {
    const result = await db
      .prepare("SELECT * FROM users WHERE google_id = ?")
      .bind(googleId)
      .first<UserRow>();

    return result || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(db: D1Database, email: string) {
    const result = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<UserRow>();

    return result || null;
  },

  /**
   * Create a new user
   */
  async create(
    db: D1Database,
    data: {
      id: string;
      githubId?: string | null;
      googleId?: string | null;
      email: string;
      emailVerified: boolean;
      name?: string | null;
      avatarUrl?: string | null;
    }
  ) {
    await db
      .prepare(
        `INSERT INTO users (id, github_id, google_id, email, email_verified, name, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.id,
        data.githubId || null,
        data.googleId || null,
        data.email,
        data.emailVerified ? 1 : 0,
        data.name || null,
        data.avatarUrl || null
      )
      .run();

    return userDb.findById(db, data.id);
  },

  /**
   * Update user information
   */
  async update(
    db: D1Database,
    userId: string,
    data: {
      email?: string;
      emailVerified?: boolean;
      name?: string | null;
      avatarUrl?: string | null;
    }
  ) {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }
    if (data.emailVerified !== undefined) {
      updates.push("email_verified = ?");
      values.push(data.emailVerified ? 1 : 0);
    }
    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.avatarUrl !== undefined) {
      updates.push("avatar_url = ?");
      values.push(data.avatarUrl);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(userId);

      await db
        .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return userDb.findById(db, userId);
  },
};

/**
 * Session database operations
 */
export const sessionDb = {
  /**
   * Find session by ID
   */
  async findById(db: D1Database, sessionId: string) {
    const result = await db
      .prepare(`
        SELECT s.*, u.id as user_id, u.email, u.name, u.avatar_url
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > datetime('now')
      `)
      .bind(sessionId)
      .first<SessionRow & { user_id: string; email: string; name: string | null; avatar_url: string | null }>();

    return result || null;
  },

  /**
   * Create a new session
   */
  async create(
    db: D1Database,
    data: {
      id: string;
      userId: string;
      expiresAt: Date;
    }
  ) {
    await db
      .prepare(
        `INSERT INTO sessions (id, user_id, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(data.id, data.userId, data.expiresAt.toISOString())
      .run();

    return sessionDb.findById(db, data.id);
  },

  /**
   * Delete a session by ID
   */
  async delete(db: D1Database, sessionId: string) {
    await db
      .prepare("DELETE FROM sessions WHERE id = ?")
      .bind(sessionId)
      .run();
  },

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(db: D1Database, userId: string) {
    await db
      .prepare("DELETE FROM sessions WHERE user_id = ?")
      .bind(userId)
      .run();
  },

  /**
   * Clean up expired sessions
   */
  async deleteExpired(db: D1Database) {
    await db
      .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
      .run();
  },
};

/**
 * Type definitions
 */
export interface UserRow {
  id: string;
  github_id: string | null;
  google_id: string | null;
  email: string;
  email_verified: number;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}
