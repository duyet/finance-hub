/**
 * Finance Hub i18n System
 *
 * A comprehensive internationalization system supporting English and Vietnamese
 * with proper currency and date formatting for each locale.
 *
 * @example Server-side usage
 * ```tsx
 * import { getLocaleFromRequest, formatCurrency, formatDate } from '~/lib/i18n';
 *
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const locale = getLocaleFromRequest(request);
 *   const balance = formatCurrency(1234560, 'VND', locale);
 *   return { balance, locale };
 * }
 * ```
 *
 * @example Client-side usage
 * ```tsx
 * import { useI18n } from '~/lib/i18n/client';
 *
 * function MyComponent() {
 *   const { t, locale, formatCurrency } = useI18n();
 *   return <h1>{t('nav.dashboard')}</h1>;
 * }
 * ```
 */

// Configuration
export * from "./i18n.config";
export type { Locale } from "./i18n.config";

// Server-side utilities
export {
  getLocaleFromRequest,
  setLocaleCookie,
  formatCurrency,
  formatVND,
  formatDate,
  formatDateRange,
  formatNumber,
  formatPercentage,
  parseNumber,
  getI18nData,
  changeLocale,
} from "./i18n.server";
export type { CurrencyCode } from "./i18n.server";

// Request context
export {
  createI18nContext,
  getI18nContext,
  getI18nActionContext,
  createI18nLoader,
  handleLocaleChange,
  redirectWithLocale,
  getLocaleUrl,
} from "./request";

// Currency utilities
export {
  formatCurrency as formatCurrencyUtil,
  formatVND as formatVNDUtil,
  formatUSD,
  parseCurrency,
  formatCurrencyRange,
  formatCurrencyChange,
  formatPercentage as formatPercentageUtil,
  formatCompactCurrency,
  getCurrencySymbol,
  isNegativeCurrency,
  formatMultiCurrency,
  formatExchange,
} from "./currency";
export type { CurrencyFormatOptions } from "./currency";
