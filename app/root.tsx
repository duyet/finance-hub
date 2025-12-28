import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import * as ReactRouter from "react-router";
import "./tailwind.css";
import { getLocaleFromRequest } from "./lib/i18n/i18n.server";
import type { Locale } from "./lib/i18n/i18n.config";

const { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } = ReactRouter;

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
      <body className="h-full bg-gray-50">
        {children}
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
  return (
    <div className="min-h-full">
      <Outlet />
    </div>
  );
}
