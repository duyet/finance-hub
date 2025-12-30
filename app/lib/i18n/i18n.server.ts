/**
 * Server-side i18n utilities
 *
 * Handles locale detection from request headers and cookies.
 * Client-side formatting is handled by useI18n() hook in client.ts.
 */

import type { Locale } from "./i18n.config";
import { getLocale } from "./i18n.config";

/**
 * Get locale from request headers and cookies
 *
 * Priority: Cookie > Accept-Language header > Default locale
 */
export function getLocaleFromRequest(request: Request): Locale {
  const cookieHeader = request.headers.get("Cookie");
  const acceptLanguage = request.headers.get("Accept-Language");
  return getLocale(cookieHeader, acceptLanguage);
}
