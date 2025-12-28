# Authentication System - Quick Reference

## File Structure

```
app/
├── lib/
│   └── auth/
│       ├── auth.server.ts      # OAuth providers (Google, GitHub)
│       ├── db.server.ts        # D1 database operations
│       └── session.server.ts   # Session management utilities
├── routes/
│   ├── auth.login.tsx          # GET/POST /auth/login
│   ├── auth.callback.$provider.tsx  # GET /auth/callback/:provider
│   ├── auth.logout.tsx         # GET/POST /auth/logout
│   └── dashboard._index.tsx    # Example protected route
migrations/
└── 0001_initial_schema.sql     # Users and sessions tables
```

## Quick Start

1. **Set environment variables** in `.dev.vars`:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OAUTH_REDIRECT_URL=http://localhost:8788
```

2. **Run database migration**:
```bash
wrangler d1 execute finance-hub-prod --local --file=./migrations/0001_initial_schema.sql
```

3. **Start dev server**:
```bash
npm run dev
```

## Common Patterns

### Protect a Route (Required Auth)
```typescript
import { requireAuth } from "~/lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request); // Redirects to /auth/login if not authenticated
  return { user };
}
```

### Optional Auth
```typescript
import { getUserFromSession } from "~/lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request); // Returns null if not authenticated
  return { user };
}
```

### Access User Data in Component
```typescript
import { useLoaderData } from "react-router";

export default function MyComponent() {
  const { user } = useLoaderData<typeof loader>();
  return <div>Welcome, {user.name || user.email}</div>;
}
```

### Add Logout Button
```tsx
import { Form } from "react-router";

<Form method="post" action="/auth/logout">
  <button type="submit">Sign Out</button>
</Form>
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/login` | GET | Display login page |
| `/auth/login` | POST | Initiate OAuth flow |
| `/auth/callback/:provider` | GET | Handle OAuth callback |
| `/auth/logout` | GET | Display logout confirmation |
| `/auth/logout` | POST | Logout and destroy session |

## Helper Functions

### Session Management (`~/lib/auth/session.server.ts`)
- `createSession(request, userId)` - Create new session
- `validateSession(request)` - Get current session
- `invalidateSession(request, sessionId)` - Destroy session
- `requireAuth(request)` - Require auth or redirect
- `getUserFromSession(request)` - Get user or null
- `createLogoutResponse(redirectUrl)` - Logout response

### OAuth (`~/lib/auth/auth.server.ts`)
- `createGitHubAuthorizationUrl()` - GitHub OAuth URL
- `createGoogleAuthorizationUrl()` - Google OAuth URL
- `validateGitHubCallback(code, state, savedState)` - Verify GitHub
- `validateGoogleCallback(code, state, savedState)` - Verify Google
- `getOrCreateGitHubUser(request, githubUser)` - Create/get user
- `getOrCreateGoogleUser(request, googleUser)` - Create/get user

### Database (`~/lib/auth/db.server.ts`)
- `getDb(request)` - Get D1 instance
- `userDb.findById(db, id)` - Find user by ID
- `userDb.findByEmail(db, email)` - Find user by email
- `userDb.create(db, data)` - Create user
- `userDb.update(db, id, data)` - Update user
- `sessionDb.create(db, data)` - Create session
- `sessionDb.delete(db, id)` - Delete session

## User Object Structure

```typescript
interface User {
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
```

## Security Features

✅ CSRF protection via OAuth state
✅ HTTP-only session cookies
✅ Secure cookies (HTTPS in production)
✅ SameSite=Lax cookie protection
✅ 30-day session expiration
✅ Prepared SQL statements
✅ Input validation

## Setup OAuth Providers

### Google
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Redirect: `http://localhost:8788/auth/callback/google`

### GitHub
1. [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App
3. Callback: `http://localhost:8788/auth/callback/github`

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  email TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

**"D1 database binding not found"**
- Check `wrangler.toml` has `[[d1_databases]]` binding

**"Missing required environment variable"**
- Add OAuth credentials to `.dev.vars`

**"Invalid state: CSRF token mismatch"**
- State expires in 10 minutes
- Complete OAuth flow quickly

**OAuth callback fails**
- Verify redirect URLs in OAuth provider settings
- Check `OAUTH_REDIRECT_URL` environment variable

## Full Documentation

See `AUTHENTICATION_SETUP.md` for comprehensive setup and usage instructions.
