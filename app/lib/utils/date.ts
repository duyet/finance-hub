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

/**
 * Format date as "MMM dd, yyyy HH:mm" (e.g., "Jan 15, 2024 14:30")
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date as "yyyy-MM-dd" (e.g., "2024-01-15")
 */
export function formatDateISO(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the start of month
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Check if two dates are in the same month
 */
export function isSameMonth(dateLeft: Date, dateRight: Date): boolean {
  return (
    dateLeft.getFullYear() === dateRight.getFullYear() &&
    dateLeft.getMonth() === dateRight.getMonth()
  );
}

/**
 * Get the difference in months between two dates
 */
export function differenceInMonths(dateLeft: Date, dateRight: Date): number {
  const yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
  const monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  return yearDiff * 12 + monthDiff;
}
