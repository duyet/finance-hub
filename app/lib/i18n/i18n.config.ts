import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Supported locales
export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Default locale
export const DEFAULT_LOCALE: Locale = "en";

// Namespace structure
export const NAMESPACES = {
  COMMON: "common",
  DASHBOARD: "dashboard",
  TRANSACTIONS: "transactions",
  CREDIT_CARDS: "credit_cards",
  LOANS: "loans",
  SETTINGS: "settings",
  RECEIPTS: "receipts",
} as const;

// Translation resources interface
interface TranslationResources {
  [locale: string]: {
    [namespace: string]: Record<string, string | object>;
  };
}

// Initialize i18next
export async function initI18n(locale: Locale = DEFAULT_LOCALE) {
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {} as Record<string, Record<string, string | object>>,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: NAMESPACES.COMMON,
      ns: Object.values(NAMESPACES),
      fallbackNS: NAMESPACES.COMMON,

      detection: {
        order: ["cookie", "header", "navigator"],
        caches: ["cookie"],
        lookupCookie: "locale",
        // lookupHeader: "accept-language", // Not supported by i18next types
        lookupFromPathIndex: 0,
        // checkWhitelist: true, // Not supported by i18next types
      } as any,

      interpolation: {
        escapeValue: false, // React already escapes values
        formatSeparator: ",",
        format: function (value, format, lng) {
          if (format === "uppercase") return value.toUpperCase();
          if (format === "lowercase") return value.toLowerCase();
          if (format === "capitalize") return value.charAt(0).toUpperCase() + value.slice(1);
          return value;
        },
      },

      react: {
        useSuspense: false,
        bindI18n: "languageChanged",
        bindI18nStore: "added removed",
        transEmptyNodeValue: "",
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "b", "span"],
      },

      debug: process.env.NODE_ENV === "development",
    });

  return i18n;
}

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

export default i18n;
