# Finance Hub

A comprehensive, serverless Personal Finance Management (PFM) application built on the Cloudflare Edge. Designed for the Vietnamese market with bilingual support (English/Vietnamese), complex liability management, and AI-powered data ingestion.

## Features

- **Dashboard**: Real-time net worth, runway calculation, and interactive charts
- **AI Financial Insights**: Natural language Q&A about your finances using Llama 3.1 8B
- **Transactions**: Full CRUD with advanced filtering, bulk operations, and pagination
- **Credit Cards**: Billing cycle management with grace period calculations
- **Loans**: Floating interest rate tracking with amortization schedules
- **CSV Import**: AI-powered column mapping using Cloudflare Workers AI
- **Receipt OCR**: Automatic data extraction from receipts using Llama 3.2 Vision
- **Bank Sync**: Webhook integration with Casso and SePay (Vietnamese payment gateways)
- **PDF Reports**: Client-side report generation with Vietnamese character support
- **Authentication**: Google and GitHub OAuth
- **Bilingual**: Full English/Vietnamese localization
- **PWA Support**: Installable on desktop and mobile with offline capability
- **Accessibility**: WCAG-compliant ARIA labels and screen reader support

## Tech Stack

- **Framework**: React Router v7 (formerly Remix v7)
- **Runtime**: Cloudflare Workers (Edge)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI**: Cloudflare Workers AI (Llama 3.1 8B, Llama 3.2 Vision, Llama 3.3)
- **Queue**: Cloudflare Queues (async processing)
- **UI**: Shadcn UI + Tailwind CSS v4
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer
- **i18n**: react-i18next
- **Auth**: Arctic (OAuth) + Oslo (sessions)
- **PWA**: Service Worker with offline caching

## Getting Started

### Prerequisites

- Node.js 22+
- npm or bun
- Cloudflare account with Workers enabled

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your credentials
# - OAuth credentials (Google, GitHub)
# - Bank sync API keys (Casso, SePay)
```

### Local Development

```bash
# Start development server
npm run dev

# Visit http://localhost:5173
```

### Database Setup

```bash
# Create D1 database
wrangler d1 create finance-hub-prod

# Update wrangler.toml with the returned database_id

# Run migrations (local)
wrangler d1 migrations apply finance-hub-prod --local

# Run migrations (production)
wrangler d1 migrations apply finance-hub-prod --remote
```

### Cloudflare Resources

```bash
# Create R2 bucket for receipts
wrangler r2 bucket create finance-hub-receipts

# Create KV namespace for caching (optional)
wrangler kv:namespace create CACHE
```

## Deployment

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

### CI/CD

GitHub Actions workflows are included for automated deployment:

- `.github/workflows/ci.yml` - Type checking, linting, and tests
- `.github/workflows/deploy.yml` - Automatic deployment on push to main
- `.github/workflows/migrate-database.yml` - Manual database migrations

**Required Secrets:**

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Configuration

### wrangler.toml

Update the following values:

```toml
[[d1_databases]]
database_id = "your-database-id"  # Replace with actual ID

[[kv_namespaces]]
id = "your-kv-namespace-id"  # Replace with actual ID
```

### Environment Variables

See `.dev.vars.example` for all required environment variables.

## Project Structure

```
finance-hub/
├── app/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── transactions/   # Transaction components
│   │   ├── credit-cards/   # Credit card components
│   │   ├── loans/          # Loan components
│   │   ├── import/         # CSV import components
│   │   ├── receipts/       # Receipt OCR components
│   │   ├── bank-sync/      # Bank sync components
│   │   ├── reports/        # PDF report components
│   │   ├── ai/             # AI insights components
│   │   ├── pwa/            # PWA install prompts
│   │   └── layout/         # Layout components
│   ├── lib/
│   │   ├── auth/           # Authentication logic
│   │   ├── db/             # Database queries
│   │   ├── i18n/           # Internationalization
│   │   ├── services/       # Business logic services
│   │   ├── types/          # TypeScript types
│   │   ├── validations/    # Zod schemas
│   │   └── utils.ts        # Utility functions
│   ├── routes/             # React Router routes
│   ├── root.tsx            # Root component
│   ├── entry.worker.ts     # Service worker for PWA
│   └── tailwind.css        # Tailwind CSS
├── functions/              # Cloudflare Workers
├── migrations/             # D1 database migrations
├── public/
│   ├── locales/            # i18n translation files
│   └── app.webmanifest    # PWA manifest
├── server/                 # Server entry points
├── .github/workflows/      # CI/CD workflows
├── wrangler.toml           # Cloudflare configuration
└── package.json
```

## Documentation

- [PRD](./Finance%20Hub%20Web%20App%20PRD.md) - Product Requirements Document
- [AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md) - Authentication guide
- [BANK_SYNC.md](./docs/BANK_SYNC.md) - Bank sync configuration
- [RECEIPT_OCR.md](./docs/RECEIPT_OCR.md) - Receipt OCR documentation
- [I18N_IMPLEMENTATION.md](./I18N_IMPLEMENTATION.md) - i18n implementation details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Run linting: `npm run lint`
6. Type check: `npm run typecheck`
7. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
