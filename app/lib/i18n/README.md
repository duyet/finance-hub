# Finance Hub i18n System

A comprehensive internationalization system supporting English (en) and Vietnamese (vi) with proper currency and date formatting for each locale.

## Features

- Bilingual support (English/Vietnamese)
- Automatic locale detection from Accept-Language header or cookie
- Type-safe translation keys with TypeScript
- Server-side and client-side rendering compatible
- Proper currency formatting:
  - **Vietnamese VND**: 1.234.560 ₫ (dot separator, no decimals, parentheses for negative)
  - **English USD**: $1,234.56 (comma separator, 2 decimals, minus for negative)
- Date formatting according to locale conventions:
  - **Vietnamese**: DD/MM/YYYY
  - **English**: MM/DD/YYYY
- Language switcher with cookie persistence
- Comprehensive translation coverage for financial terms

## Directory Structure

```
finance-hub/
├── app/
│   ├── lib/i18n/
│   │   ├── i18n.config.ts       # i18next configuration
│   │   ├── i18n.server.ts       # Server-side utilities
│   │   ├── request.ts           # Request context handling
│   │   ├── currency.ts          # Currency formatting utilities
│   │   ├── client.ts            # Client-side hooks
│   │   ├── index.ts             # Main exports
│   │   └── README.md            # This file
│   └── components/i18n/
│       ├── LanguageSwitcher.tsx # Language switcher components
│       └── examples.tsx         # Usage examples
└── public/locales/
    ├── en/
    │   └── common.json          # English translations
    └── vi/
        └── common.json          # Vietnamese translations
```

## Quick Start

### Server-Side Usage

```tsx
import { getLocaleFromRequest, formatCurrency, formatDate } from '~/lib/i18n';

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = getLocaleFromRequest(request);

  // Format currency
  const balance = formatCurrency(1234560, 'VND', locale);
  // Vietnamese: "1.234.560 ₫"
  // English: "1.234.560 ₫"

  // Format date
  const today = formatDate(new Date(), locale, 'short');
  // Vietnamese: "28/12/2025"
  // English: "12/28/2025"

  return { balance, today, locale };
}
```

### Client-Side Usage

```tsx
import { useI18n } from '~/lib/i18n/client';

function MyComponent() {
  const { t, locale, formatCurrency, formatDate } = useI18n();

  return (
    <div>
      <h1>{t('nav.dashboard')}</h1> {/* "Dashboard" or "Tổng quan" */}
      <p>{formatCurrency(1234560, 'VND')}</p>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

## Translation Keys

### Navigation

```tsx
t('nav.dashboard')     // "Dashboard" | "Tổng quan"
t('nav.transactions')  // "Transactions" | "Giao dịch"
t('nav.accounts')      // "Accounts" | "Tài khoản"
t('nav.creditCards')   // "Credit Cards" | "Thẻ tín dụng"
t('nav.loans')         // "Loans" | "Khoản vay"
t('nav.settings')      // "Settings" | "Cài đặt"
```

### Actions

```tsx
t('actions.save')      // "Save" | "Lưu"
t('actions.cancel')    // "Cancel" | "Hủy"
t('actions.delete')    // "Delete" | "Xóa"
t('actions.edit')      // "Edit" | "Chỉnh sửa"
t('actions.add')       // "Add" | "Thêm"
t('actions.export')    // "Export" | "Xuất"
```

### Financial Terms

```tsx
t('financial.income')     // "Income" | "Thu nhập"
t('financial.expense')    // "Expense" | "Chi tiêu"
t('financial.netWorth')   // "Net Worth" | "Giá trị ròng"
t('financial.runway')     // "Runway" | "Khả năng tài chính"
t('financial.burnRate')   // "Burn Rate" | "Tốc độ đốt tiền"
```

### Translation with Parameters

```tsx
t('validation.minLength', { min: 5 })
// English: "Must be at least 5 characters"
// Vietnamese: "Phải có ít nhất 5 ký tự"

t('validation.maxValue', { max: 100 })
// English: "Must be no more than 100"
// Vietnamese: "Không được vượt quá 100"
```

## Currency Formatting

### Format Currency

```tsx
import { formatCurrency } from '~/lib/i18n';

// Vietnamese VND
formatCurrency(1234560, 'VND', 'vi')
// "1.234.560 ₫"

// Negative amounts in Vietnamese
formatCurrency(-1234560, 'VND', 'vi')
// "(1.234.560 ₫)"

// USD
formatCurrency(1234.56, 'USD', 'en')
// "$1,234.56"

// Negative amounts in English
formatCurrency(-1234.56, 'USD', 'en')
// "-$1,234.56"
```

### Format VND Specifically

```tsx
import { formatVND } from '~/lib/i18n/currency';

formatVND(1234560, 'vi')
// "1.234.560 ₫"

formatVND(-5000000, 'vi')
// "(5.000.000 ₫)"
```

### Currency Utilities

```tsx
import {
  formatUSD,
  parseCurrency,
  formatCurrencyRange,
  formatCurrencyChange,
  formatCompactCurrency,
  getCurrencySymbol
} from '~/lib/i18n/currency';

// USD formatting
formatUSD(1234.56)
// "$1,234.56"

// Parse currency string back to number
parseCurrency("1.234.560 ₫", 'vi')
// 1234560

// Format range
formatCurrencyRange(1000000, 5000000, { currency: 'VND', locale: 'vi' })
// "1.000.000 ₫ - 5.000.000 ₫"

// Format with sign
formatCurrencyChange(500000, { currency: 'VND', locale: 'vi' })
// "+500.000 ₫"

// Compact format
formatCompactCurrency(1500000000, 'VND', 'vi')
// "1,5B ₫"

// Get currency symbol
getCurrencySymbol('VND')
// "₫"
```

## Date Formatting

```tsx
import { formatDate } from '~/lib/i18n';

// Short format
formatDate(new Date(), 'vi', 'short')
// "28/12/2025"

formatDate(new Date(), 'en', 'short')
// "12/28/2025"

// Medium format
formatDate(new Date(), 'vi', 'medium')
// "28 thg 12, 2025"

formatDate(new Date(), 'en', 'medium')
// "Dec 28, 2025"

// Long format
formatDate(new Date(), 'vi', 'long')
// "28 tháng 12, 2025"

formatDate(new Date(), 'en', 'long')
// "December 28, 2025"
```

## Language Switcher

### Basic Language Switcher

```tsx
import { LanguageSwitcher } from '~/components/i18n/LanguageSwitcher';
import { useI18n } from '~/lib/i18n/client';

function Navbar() {
  const { locale } = useI18n();
  return <LanguageSwitcher currentLocale={locale} />;
}
```

### Compact Language Switcher

```tsx
import { LanguageSwitcherCompact } from '~/components/i18n/LanguageSwitcher';

function Navbar() {
  const { locale } = useI18n();
  return <LanguageSwitcherCompact currentLocale={locale} />;
}
```

### Dropdown Language Switcher

```tsx
import { LanguageSwitcherDropdown } from '~/components/i18n/LanguageSwitcher';

function Settings() {
  const { locale } = useI18n();
  return <LanguageSwitcherDropdown currentLocale={locale} />;
}
```

## Advanced Usage

### Custom Translations in Loaders

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const locale = getLocaleFromRequest(request);

  // Load custom translations
  const translations = await loadTranslations(locale);

  return {
    locale,
    translations,
    data: {
      balance: formatCurrency(1234560, 'VND', locale),
      date: formatDate(new Date(), locale, 'short'),
    },
  };
}
```

### Type-Safe Translation Keys

```tsx
import { useI18nTyped } from '~/lib/i18n/client';

function MyComponent() {
  const { t } = useI18nTyped();

  // ✅ Type-safe with autocomplete
  t('nav.dashboard')

  // ❌ Type error - invalid key
  t('nav.invalid')
}
```

### Locale-Aware Number Formatting

```tsx
const { formatNumber, formatPercentage } = useI18n();

// Format large numbers
formatNumber(1234567.89)
// Vietnamese: "1.234.567,89"
// English: "1,234,567.89"

// Format percentages
formatPercentage(75.5, 2)
// Vietnamese: "75,50%"
// English: "75.50%"
```

## Server-Side Locale Detection

The i18n system automatically detects locale from:

1. **Cookie** (priority): `locale` cookie
2. **Accept-Language header**: Browser language preference
3. **Default**: English (en)

### Detection Priority

```tsx
// 1. Check cookie first
const fromCookie = getLocaleFromCookie(request.headers.get('Cookie'));

// 2. Check Accept-Language header
const fromHeader = getLocaleFromHeader(request.headers.get('Accept-Language'));

// 3. Use default
const locale = fromCookie || fromHeader || DEFAULT_LOCALE;
```

### Manual Locale Setting

```tsx
import { setLocaleCookie, redirect } from '~/lib/i18n';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const locale = formData.get('locale') as 'en' | 'vi';

  return redirect('/', {
    headers: {
      'Set-Cookie': setLocaleCookie(locale),
    },
  });
}
```

## Vietnamese Formatting Standards

### Numbers

- Thousands separator: dot (.)
- Decimal separator: comma (,)
- Examples:
  - 1.234.560 (one million two hundred thirty-four thousand five hundred sixty)
  - 3,14 (three point one four)

### Currency (VND)

- Format: 1.234.560 ₫
- No decimal places
- Negative values in parentheses: (1.234.560 ₫)

### Dates

- Format: DD/MM/YYYY
- Example: 28/12/2025

## English Formatting Standards

### Numbers

- Thousands separator: comma (,)
- Decimal separator: period (.)
- Examples:
  - 1,234,560 (one million two hundred thirty-four thousand five hundred sixty)
  - 3.14 (three point one four)

### Currency (USD)

- Format: $1,234.56
- Two decimal places
- Negative values with minus: -$1,234.56

### Dates

- Format: MM/DD/YYYY
- Example: 12/28/2025

## Adding New Translations

1. Add the key to both translation files:

**public/locales/en/common.json**
```json
{
  "newSection": {
    "newKey": "English translation"
  }
}
```

**public/locales/vi/common.json**
```json
{
  "newSection": {
    "newKey": "Vietnamese translation"
  }
}
```

2. Use in components:

```tsx
const { t } = useI18n();
t('newSection.newKey')
```

## Type Safety

The i18n system provides TypeScript support for translation keys:

```tsx
import type { TranslationKey } from '~/lib/i18n/client';

function translate(key: TranslationKey): string {
  return t(key);
}
```

For better autocomplete, define keys in a dedicated type:

```tsx
// types/i18n.d.ts
export type TranslationKey =
  | 'app.name'
  | 'nav.dashboard'
  | 'actions.save'
  // ... add all keys
```

## Testing

### Test Translation Functions

```tsx
import { useI18n } from '~/lib/i18n/client';

function MyComponent() {
  const { t, has } = useI18n();

  // Check if translation exists
  if (has('custom.key')) {
    return <div>{t('custom.key')}</div>;
  }

  return <div>Key not found</div>;
}
```

### Test Locale Switching

```tsx
import { render, screen } from '@testing-library/react';
import { useI18n } from '~/lib/i18n/client';

// Mock loader data
const mockLoaderData = {
  locale: 'vi',
  translations: viTranslations,
};

test('Vietnamese translations render correctly', () => {
  render(<MyComponent />, {
    loaderData: { root: mockLoaderData },
  });

  expect(screen.getByText('Tổng quan')).toBeInTheDocument();
});
```

## Best Practices

1. **Always use translation keys**: Never hardcode text
   ```tsx
   // ❌ Bad
   <h1>Dashboard</h1>

   // ✅ Good
   <h1>{t('nav.dashboard')}</h1>
   ```

2. **Format currency and dates with locale**:
   ```tsx
   // ❌ Bad
   <p>{amount.toLocaleString()}</p>

   // ✅ Good
   <p>{formatCurrency(amount, 'VND')}</p>
   ```

3. **Use parameter interpolation for dynamic content**:
   ```tsx
   // ❌ Bad
   <p>Must be at least {minLength} characters</p>

   // ✅ Good
   <p>{t('validation.minLength', { min: minLength })}</p>
   ```

4. **Test both locales**: Verify UI looks good in English and Vietnamese

5. **Check text expansion**: Vietnamese text is often longer than English, ensure layouts accommodate it

## Troubleshooting

### Translations not loading

Check that the translation files exist in `public/locales/`:

```bash
ls public/locales/en/common.json
ls public/locales/vi/common.json
```

### Currency formatting not working

Ensure you're using the correct locale:

```tsx
// ❌ Wrong
formatCurrency(1234560, 'VND', 'en')

// ✅ Correct
formatCurrency(1234560, 'VND', 'vi')
```

### Locale not persisting

Check that the cookie is being set:

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const locale = formData.get('locale');

  return redirect('/', {
    headers: {
      'Set-Cookie': setLocaleCookie(locale as 'en' | 'vi'),
    },
  });
}
```

## API Reference

### Server Functions

- `getLocaleFromRequest(request)` - Get locale from request
- `setLocaleCookie(locale)` - Create locale cookie header
- `formatCurrency(amount, currency, locale)` - Format currency
- `formatVND(amount, locale)` - Format VND specifically
- `formatDate(date, locale, format)` - Format date
- `formatNumber(value, locale)` - Format number

### Client Hooks

- `useI18n()` - Get i18n context and utilities
- `useI18nTyped()` - Type-safe version with autocomplete

### Components

- `LanguageSwitcher` - Full language selector
- `LanguageSwitcherCompact` - Compact flag-based switcher
- `LanguageSwitcherDropdown` - Dropdown-style switcher

## Contributing

When adding new features:

1. Add translations to both `en/common.json` and `vi/common.json`
2. Update the `TranslationKey` type if using TypeScript
3. Test UI in both locales
4. Check currency and date formatting for both locales
5. Update this README with new translation keys

## License

MIT
