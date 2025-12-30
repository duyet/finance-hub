# Finance Hub - TODO and Next Steps

## Current State (Dec 30, 2025)

The app has been simplified to focus on core functionality:
- Dashboard + Financial Health Score
- Accounts CRUD (view, create, edit, delete)
- Categories CRUD (view, create)
- Transactions CRUD (view, create, edit, delete, batch operations)
- CSV Import with AI-powered column mapping
- i18n (EN/VI) + OAuth (GitHub/Google)
- PWA Install Prompt

## Completed

- PRD core features implementation
- Authentication (OAuth with GitHub/Google)
- ESLint configuration (0 errors, 0 warnings)
- TypeScript strict mode (0 type errors)
- Bundle optimization (280ms build)
- 206 unit tests passing
- i18n integration (EN/VI)
- AI-powered CSV column mapping
- Removed unused dependencies and services

## Next Steps

### Phase 1: Core Improvements

1. [ ] Add categories/:id route for editing categories
2. [ ] Add API route for AI insights to routes.ts
3. [ ] Add transaction new route for creating transactions

### Phase 2: Testing

1. [ ] Add more unit tests
   - Form validation schemas
   - i18n utilities
   - Database CRUD operations

2. [ ] E2E tests
   - CRUD operations testing
   - CSV import flow

### Phase 3: Deployment

1. [ ] Update wrangler.toml with real resource IDs
   - D1 database ID
   - R2 bucket ID
   - KV namespace ID

2. [ ] Set up production environment variables
   - OAuth credentials
   - Session secret

---

## Development Quick Reference

### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run type checking
bun run typecheck

# Run linting
bun run lint

# Run unit tests
bun run test

# Format code
bun run format
```

### Deployment

```bash
# Build for production
bun run build

# Deploy to Cloudflare Pages
bun run deploy
```

### Database

```bash
# Run migrations (local)
wrangler d1 migrations apply finance-hub-prod --local

# Run migrations (production)
wrangler d1 migrations apply finance-hub-prod --remote
```

---

## Notes

- Focus on quality over quantity
- Keep the codebase clean and maintainable
- All features should be fully implemented (no stubs)
