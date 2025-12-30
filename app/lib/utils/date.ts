/**
 * Date formatting utilities using Intl API
 * Lightweight replacement for date-fns
 */

/**
 * Format date as "MMMM d, yyyy" (e.g., "January 15, 2024")
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date as "MMM d, yyyy" (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
