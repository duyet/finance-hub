import type { LinksFunction, LoaderFunctionArgs, HeadersFunction } from "react-router";
import * as ReactRouter from "react-router";
import "./tailwind.css";
import { getLocaleFromRequest } from "./lib/i18n/i18n.server";
import type { Locale } from "./lib/i18n/i18n.config";
import { useNavigation } from "react-router";
import { FullPageLoading } from "./components/ui/loading";
import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { ThemeProvider } from "./components/theme/theme-provider";

const { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } = ReactRouter;

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "manifest", href: "/app.webmanifest" },
  { rel: "apple-touch-icon", href: "/icon-192.png" },
  { rel: "theme-color", href: "#2563eb" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  // Get locale from request headers or cookies
  const locale = getLocaleFromRequest(request);

  // Load translations for the client
  const translations = await loadTranslations(locale, request);

  return {
    locale,
    translations,
  };
}

/**
 * Security headers for all responses
 *
 * Implements OWASP recommended security headers:
 * - Content-Security-Policy: Restricts resource sources
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Controls browser features
 * - Strict-Transport-Security: Enforces HTTPS (production only)
 */
export const headers: HeadersFunction = () => {
  const isProduction = process.env.NODE_ENV === "production";

  // Content Security Policy
  // Allows resources from same origin, Cloudflare, and common CDNs
  const cspDirectives = [
    // Default to same-origin
    "default-src 'self'",
    // Scripts from same origin and inline for PWA/i18n data
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Styles from same origin and inline (Tailwind)
    "style-src 'self' 'unsafe-inline'",
    // Images from same origin, data URLs, and Cloudflare R2
    "img-src 'self' data: https: *.r2.dev *.workers.dev",
    // Connect to same origin and OAuth providers
    "connect-src 'self' https://github.com https://accounts.google.com",
    // Fonts from same origin and Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    // Media from same origin and R2
    "media-src 'self' https: *.r2.dev",
    // Objects (none allowed)
    "object-src 'none'",
    // Base URI for relative URLs
    "base-uri 'self'",
    // Form targets to same origin only
    "form-action 'self'",
    // Frame ancestors (prevent embedding)
    "frame-ancestors 'none'",
    // Report only (in development) or enforce (in production)
    isProduction ? "" : "report-uri /csp-report",
  ].join("; ");

  return {
    // Content Security Policy
    "Content-Security-Policy": cspDirectives,

    // Prevent clickjacking - superseded by CSP frame-ancestors but kept for compatibility
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent XSS via Reflective XSS attack
    "X-XSS-Protection": "1; mode=block",

    // Referrer Policy - strict origin, cross-origin
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy (formerly Feature Policy)
    // Disable unused features, enable only what's needed
    "Permissions-Policy": [
      "camera=(self)",
      "microphone=()",
      "geolocation=(self)",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", "),

    // HSTS (HTTPS enforcement) - only in production
    ...(isProduction
      ? {
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        }
      : {}),

    // Cross-Origin policies
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
};

/**
 * Load translations from public/locales
 */
async function loadTranslations(locale: Locale, request: Request) {
  const namespaces = ["common", "dashboard", "transactions", "credit_cards", "loans", "settings", "receipts"];
  const mergedTranslations: Record<string, any> = {};

  try {
    const url = new URL(request.url);

    for (const ns of namespaces) {
      try {
        const response = await fetch(`${url.origin}/locales/${locale}/${ns}.json`);
        if (response.ok) {
          const nsTranslations = await response.json();
          // Merge namespace translations into the main object
          Object.assign(mergedTranslations, nsTranslations);
        } else {
          console.warn(`Failed to load ${ns} translations for ${locale}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to load ${ns} translations for ${locale}:`, error);
      }
    }
  } catch (error) {
    console.warn("Failed to load translations:", error);
  }

  // Return merged translations (may be empty if all loads failed)
  return mergedTranslations;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { locale, translations } = useLoaderData<typeof loader>();

  return (
    <html lang={locale} className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-background text-foreground">
        <ThemeProvider defaultTheme="system" storageKey="finance-hub-theme">
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        {/* Pass locale and translations to client */}
        <script
          id="i18n-data"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ locale, translations }),
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <ErrorBoundary onError={(error) => console.error("Application error:", error)}>
      <div className="min-h-full">
        {isLoading && <FullPageLoading />}
        <Outlet />
        <PWAInstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
