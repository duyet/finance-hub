// Supported locales
export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Default locale
export const DEFAULT_LOCALE: Locale = "en";

// Helper to check if locale is supported
export function isSupportedLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

// Helper to get locale from accept-language header
export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Parse accept-language header
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      const quality = qValue ? parseFloat(qValue) : 1.0;
      return { code: code.split("-")[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported locale
  for (const lang of languages) {
    if (isSupportedLocale(lang.code)) {
      return lang.code;
    }
  }

  return DEFAULT_LOCALE;
}

// Helper to get locale from cookie
export function getLocaleFromCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const localeCookie = cookies.find((c) => c.startsWith("locale="));

  if (localeCookie) {
    const locale = localeCookie.split("=")[1];
    if (isSupportedLocale(locale)) {
      return locale;
    }
  }

  return null;
}

// Get locale with fallback chain
export function getLocale(
  cookieHeader: string | null,
  acceptLanguage: string | null
): Locale {
  // Try cookie first
  const fromCookie = getLocaleFromCookie(cookieHeader);
  if (fromCookie) return fromCookie;

  // Try accept-language header
  const fromHeader = getLocaleFromHeader(acceptLanguage);
  if (fromHeader) return fromHeader;

  // Fallback to default
  return DEFAULT_LOCALE;
}
