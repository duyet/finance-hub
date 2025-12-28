import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { Locale } from "./i18n.config";
import { getLocaleFromRequest, setLocaleCookie } from "./i18n.server";

/**
 * I18n request context
 * Stores the current locale for the request lifecycle
 */
export interface I18nContext {
  locale: Locale;
  getLocale: () => Locale;
  setLocale: (locale: Locale) => string;
}

/**
 * Create i18n context from a request
 * Extracts locale from headers/cookies and provides setter
 */
export function createI18nContext(request: Request): I18nContext {
  const locale = getLocaleFromRequest(request);

  return {
    locale,
    getLocale: () => locale,
    setLocale: (newLocale: Locale) => setLocaleCookie(newLocale),
  };
}

/**
 * Get i18n context from loader args
 */
export function getI18nContext(args: LoaderFunctionArgs): I18nContext {
  return createI18nContext(args.request);
}

/**
 * Get i18n context from action args
 */
export function getI18nActionContext(args: ActionFunctionArgs): I18nContext {
  return createI18nContext(args.request);
}

/**
 * Create loader response with i18n data
 * Automatically adds locale to loader data
 */
export function createI18nLoader<T extends Record<string, unknown>>(
  data: T,
  locale: Locale
): T & { locale: Locale } {
  return {
    ...data,
    locale,
  };
}

/**
 * Handle locale change action
 * Parse form data and return response with cookie
 */
export async function handleLocaleChange(
  request: Request
): Promise<{ locale: Locale; cookieHeader: string }> {
  const formData = await request.formData();
  const newLocale = formData.get("locale") as string;

  if (!["en", "vi"].includes(newLocale)) {
    throw new Response("Invalid locale", { status: 400 });
  }

  const cookieHeader = setLocaleCookie(newLocale as Locale);

  return {
    locale: newLocale as Locale,
    cookieHeader,
  };
}

/**
 * Redirect with locale preservation
 */
export function redirectWithLocale(
  url: string,
  locale: Locale,
  init?: ResponseInit
): Response {
  const urlObj = new URL(url, typeof window === "undefined" ? "http://localhost" : window.location.origin);

  // Preserve locale in URL if it's there
  const pathname = urlObj.pathname;
  if (pathname.startsWith("/en") || pathname.startsWith("/vi")) {
    // Already has locale prefix
  } else if (locale !== "en") {
    // Add locale prefix for non-default locales
    urlObj.pathname = `/${locale}${pathname}`;
  }

  return new Response(null, {
    ...init,
    status: 302,
    headers: {
      ...init?.headers,
      "Set-Cookie": setLocaleCookie(locale),
      Location: urlObj.toString(),
    },
  });
}

/**
 * Get URL with locale prefix
 */
export function getLocaleUrl(path: string, locale: Locale): string {
  // Don't prefix if it's the default locale
  if (locale === "en") {
    return path;
  }

  // Don't prefix if it already has one
  if (path.startsWith("/en") || path.startsWith("/vi")) {
    return path;
  }

  return `/${locale}${path}`;
}
