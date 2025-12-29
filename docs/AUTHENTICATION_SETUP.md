# Authentication System Setup Guide

This document provides complete instructions for setting up and using the authentication system in Finance Hub.

## Overview

The authentication system uses:
- **Arctic**: OAuth 2.0 provider integration (Google and GitHub)
- **Oslo**: Secure session management with HTTP-only cookies
- **D1 Database**: User and session storage
- **React Router**: Route loaders and actions for auth flows

## Features

- OAuth 2.0 authentication with Google and GitHub
- Secure session management with HTTP-only, SameSite=Lax cookies
- CSRF protection via OAuth state verification
- Automatic user creation and profile updates
- Email linking across OAuth providers
- Session expiration (30 days)
- Protected route helpers
- Full logout functionality

## Database Schema

The authentication system uses two tables:

### Users Table
```sql
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
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Configure D1 Database

Run the migration to create the required tables:

```bash
# Create D1 database (if not already created)
wrangler d1 create finance-hub-prod

# Update wrangler.toml with the returned database_id

# Run migrations
wrangler d1 execute finance-hub-prod --local --file=./migrations/0001_initial_schema.sql

# For production
wrangler d1 execute finance-hub-prod --file=./migrations/0001_initial_schema.sql
```

### 2. Set Up OAuth Providers

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Authorized redirect URIs:
   - Development: `http://localhost:8788/auth/callback/google`
   - Production: `https://yourdomain.com/auth/callback/google`
8. Copy **Client ID** and **Client Secret**

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - Application name: `Finance Hub` (or your preferred name)
   - Homepage URL: Your app's homepage
   - Authorization callback URL:
     - Development: `http://localhost:8788/auth/callback/github`
     - Production: `https://yourdomain.com/auth/callback/github`
4. Click **Register application**
5. Copy **Client ID** and generate a new **Client Secret**

### 3. Configure Environment Variables

Create a `.dev.vars` file for local development (add to `.gitignore`):

```bash
# .dev.vars (for local development)
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GITHUB_CLIENT_ID=your-actual-github-client-id
GITHUB_CLIENT_SECRET=your-actual-github-client-secret
OAUTH_REDIRECT_URL=http://localhost:8788
```

For production, set these in your Cloudflare Workers environment or use Wrangler secrets:

```bash
# Using Wrangler secrets
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put OAUTH_REDIRECT_URL
```

### 4. Update OAuth Provider Callback URLs

Make sure your OAuth provider callbacks include the correct paths:
- Google: `/auth/callback/google`
- GitHub: `/auth/callback/github`

These are handled by the `auth.callback.tsx` route with dynamic provider parameter.

## Usage

### Adding Authentication to a Route

Use the `requireAuth` helper in your route loader:

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, sessionId } = await requireAuth(request);

  // user is guaranteed to be authenticated
  return { user };
}
```

### Getting Optional User Data

If authentication is optional, use `validateSession`:

```typescript
import { validateSession } from "~/lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await validateSession(request);

  if (session) {
    return { user: session.user };
  }

  return { user: null };
}
```

### Protecting Multiple Routes

Create a protected route layout:

```typescript
// app/routes/dashboard.tsx
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  return { user };
}

export default function DashboardLayout() {
  return (
    <div>
      <nav>{/* Navigation */}</nav>
      <Outlet />
    </div>
  );
}
```

Then create child routes:

```typescript
// app/routes/dashboard._index.tsx
export default function DashboardHome() {
  return <div>Dashboard content</div>;
}
```

### User Logout

Link to the logout route:

```tsx
import { Link } from "react-router";

<Link to="/auth/logout">Sign Out</Link>
```

Or use a form for POST request:

```tsx
import { Form } from "react-router";

<Form method="post" action="/auth/logout">
  <button type="submit">Sign Out</button>
</Form>
```

## API Reference

### Session Functions

#### `createSession(request, userId)`
Creates a new session for a user and returns headers with the session cookie.

```typescript
const { headers, sessionId } = await createSession(request, userId);
```

#### `validateSession(request)`
Validates the current session and returns user data if valid.

```typescript
const session = await validateSession(request);
if (session) {
  console.log(session.user, session.sessionId);
}
```

#### `invalidateSession(request, sessionId)`
Invalidates a specific session.

```typescript
const headers = await invalidateSession(request, sessionId);
```

#### `requireAuth(request)`
Helper that requires authentication and redirects to login if not authenticated.

```typescript
const { user, sessionId } = await requireAuth(request);
```

#### `getUserFromSession(request)`
Convenience function to get just the user from the session.

```typescript
const user = await getUserFromSession(request);
```

### Auth Functions

#### `createGitHubAuthorizationUrl()`
Creates a GitHub OAuth authorization URL with state.

```typescript
const { url, state } = await createGitHubAuthorizationUrl();
```

#### `createGoogleAuthorizationUrl()`
Creates a Google OAuth authorization URL with state.

```typescript
const { url, state } = await createGoogleAuthorizationUrl();
```

#### `validateGitHubCallback(code, state, savedState)`
Validates GitHub OAuth callback and returns user data.

```typescript
const githubUser = await validateGitHubCallback(code, state, savedState);
```

#### `validateGoogleCallback(code, state, savedState)`
Validates Google OAuth callback and returns user data.

```typescript
const googleUser = await validateGoogleCallback(code, state, savedState);
```

## Security Features

1. **CSRF Protection**: OAuth state parameter prevents CSRF attacks
2. **HTTP-only Cookies**: Session cookies cannot be accessed via JavaScript
3. **Secure Cookies**: Cookies are only sent over HTTPS in production
4. **SameSite Protection**: Cookies use SameSite=Lax to prevent CSRF
5. **Session Expiration**: Sessions automatically expire after 30 days
6. **Database-Level Security**: Prepared statements prevent SQL injection
7. **Input Validation**: All OAuth data is validated before use

## Troubleshooting

### "D1 database binding not found"
- Ensure `DB` binding is configured in `wrangler.toml`
- Check that the database exists: `wrangler d1 list`

### "Missing required environment variable"
- Ensure all OAuth credentials are set in `.dev.vars` or Wrangler secrets
- Restart the development server after adding environment variables

### "Invalid state: CSRF token mismatch"
- OAuth state cookies expire after 10 minutes
- Ensure cookies are being set correctly in your browser
- Check that the OAuth redirect URLs match exactly

### OAuth callback not working
- Verify the callback URL in your OAuth provider settings matches your app URL
- Check that the provider parameter in the route matches (`github` or `google`)
- Ensure environment variables include the correct `OAUTH_REDIRECT_URL`

### Session not persisting
- Check that cookies are being set with the correct domain
- Verify SameSite and Secure settings match your environment
- Ensure browser is not blocking third-party cookies

## Development Workflow

1. Start local development server:
```bash
npm run dev
```

2. The app will be available at `http://localhost:8788`

3. Navigate to `/auth/login` to test authentication

4. After successful authentication, you'll be redirected to `/dashboard`

5. Sessions persist across browser restarts (until expiration or logout)

## Production Deployment

1. Set all environment variables using Wrangler secrets:
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put OAUTH_REDIRECT_URL
```

2. Update OAuth provider redirect URIs to production URL

3. Run migrations on production database:
```bash
wrangler d1 execute finance-hub-prod --file=./migrations/0001_initial_schema.sql
```

4. Deploy the application:
```bash
npm run deploy
```

## File Structure

```
app/
├── lib/
│   └── auth/
│       ├── auth.server.ts      # OAuth providers and user management
│       ├── db.server.ts        # Database operations
│       └── session.server.ts   # Session management
├── routes/
│   ├── auth.login.tsx          # Login page
│   ├── auth.callback.tsx       # OAuth callback handler
│   ├── auth.logout.tsx         # Logout page
│   └── dashboard._index.tsx    # Example protected route
migrations/
└── 0001_initial_schema.sql     # Database schema
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the OAuth provider documentation
3. Check Cloudflare D1 documentation
4. Verify environment variables and bindings
