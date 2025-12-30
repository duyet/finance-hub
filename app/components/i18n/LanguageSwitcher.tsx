import { Form, useNavigation } from "react-router";
import type { Locale } from "~/lib/i18n/i18n.config";
import { SUPPORTED_LOCALES } from "~/lib/i18n/i18n.config";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  className?: string;
}

/**
 * Language Switcher Component
 *
 * Allows users to switch between English and Vietnamese.
 * Persisted via cookie and triggers a page reload to apply changes.
 *
 * @example
 * ```tsx
 * import { useI18n } from '~/lib/i18n/client';
 *
 * function Navbar() {
 *   const { locale } = useI18n();
 *   return <LanguageSwitcher currentLocale={locale} />;
 * }
 * ```
 */
export function LanguageSwitcher({
  currentLocale,
  className = "",
}: LanguageSwitcherProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const locales: { code: Locale; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  ];

  return (
    <Form method="post" action="/action/change-locale" className={className}>
      <select
        name="locale"
        defaultValue={currentLocale}
        onChange={(e) => {
          // Submit the form when locale changes
          const form = e.currentTarget.form as HTMLFormElement | null;
          form?.requestSubmit?.();
        }}
        disabled={isSubmitting}
        className="block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50"
        aria-label="Select language"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag} {locale.label}
          </option>
        ))}
      </select>
    </Form>
  );
}

/**
 * Compact Language Switcher
 * Shows only the current language flag, expands on click
 */
export function LanguageSwitcherCompact({
  currentLocale,
  className = "",
}: LanguageSwitcherProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const localeInfo: Record<Locale, { flag: string; label: string }> = {
    en: { flag: "🇺🇸", label: "English" },
    vi: { flag: "🇻🇳", label: "Tiếng Việt" },
  };

  const current = localeInfo[currentLocale];
  const otherLocale: Locale = currentLocale === "en" ? "vi" : "en";
  const other = localeInfo[otherLocale];

  return (
    <Form method="post" action="/action/change-locale" className={className}>
      <input type="hidden" name="locale" value={otherLocale} />
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        title={`Switch to ${other.label}`}
        aria-label={`Switch to ${other.label}`}
      >
        <span className="text-lg" role="img" aria-label={current.label}>
          {current.flag}
        </span>
        <span className="hidden sm:inline">{current.label}</span>
      </button>
    </Form>
  );
}

/**
 * Dropdown Language Switcher
 * Full dropdown with flags and labels
 */
export function LanguageSwitcherDropdown({
  currentLocale,
  className = "",
}: LanguageSwitcherProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const locales: { code: Locale; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  ];

  return (
    <div className={`relative ${className}`}>
      <Form method="post" action="/action/change-locale">
        <label htmlFor="locale-select" className="sr-only">
          Select language
        </label>
        <select
          id="locale-select"
          name="locale"
          defaultValue={currentLocale}
          onChange={(e) => {
            const form = e.currentTarget.form as HTMLFormElement | null;
            form?.requestSubmit?.();
          }}
          disabled={isSubmitting}
          className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locales.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {locale.flag} {locale.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </Form>
    </div>
  );
}
