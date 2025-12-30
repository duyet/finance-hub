# Finance Hub i18n System

Internationalization system supporting English (en) and Vietnamese (vi).

## Directory Structure

```
app/lib/i18n/
├── i18n.config.ts   # Locale configuration and detection
├── i18n.server.ts   # Server-side locale detection
├── client.ts        # Client-side useI18n hook
├── currency.ts      # Currency formatting utilities
├── index.ts         # Type exports
└── README.md
```

## Usage

### Client-Side (Primary)

```tsx
import { useI18n } from '~/lib/i18n/client';

function MyComponent() {
  const { t, locale, formatCurrency, formatDate } = useI18n();

  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      <p>{formatCurrency(1234560, 'VND')}</p>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

### Server-Side (Loader)

```tsx
import { getLocaleFromRequest } from '~/lib/i18n/i18n.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = getLocaleFromRequest(request);
  return { locale };
}
```

### Currency Formatting

```tsx
import { formatCurrency } from '~/lib/i18n/currency';

// Vietnamese VND (dot separator, no decimals)
formatCurrency(1234560, { currency: 'VND', locale: 'vi' })
// "1.234.560 ₫"

// USD (comma separator, 2 decimals)
formatCurrency(1234.56, { currency: 'USD', locale: 'en' })
// "$1,234.56"
```

## Formatting Standards

### Vietnamese
- **Numbers**: Dot (.) as thousands separator, comma (,) as decimal
- **VND**: 1.234.560 ₫ (no decimals, parentheses for negative)
- **Dates**: DD/MM/YYYY

### English
- **Numbers**: Comma (,) as thousands separator, dot (.) as decimal
- **USD**: $1,234.56 (2 decimals, minus for negative)
- **Dates**: MM/DD/YYYY

## Translation Keys

Common keys available via `t()`:

```tsx
t('nav.dashboard')     // "Dashboard" | "Tổng quan"
t('nav.transactions')  // "Transactions" | "Giao dịch"
t('nav.accounts')      // "Accounts" | "Tài khoản"
t('actions.save')      // "Save" | "Lưu"
t('actions.cancel')    // "Cancel" | "Hủy"
```

Translation files: `public/locales/{en,vi}/common.json`

## Locale Detection

Priority order:
1. Cookie (`locale=vi`)
2. Accept-Language header
3. Default (en)
