/**
 * Financial Health Score Utilities
 *
 * Client-safe utility functions for formatting and displaying
 * financial health scores. These can be imported by components.
 */

export type ScoreCategory = "excellent" | "good" | "fair" | "poor" | "critical";

/**
 * Get score category label
 */
export function getScoreCategoryLabel(category: ScoreCategory): string {
  const labels = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    critical: "Critical",
  };
  return labels[category];
}

/**
 * Get score category color
 */
export function getScoreCategoryColor(category: ScoreCategory): string {
  const colors = {
    excellent: "text-green-600 dark:text-green-400",
    good: "text-blue-600 dark:text-blue-400",
    fair: "text-yellow-600 dark:text-yellow-400",
    poor: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400",
  };
  return colors[category];
}

/**
 * Get score category bg color
 */
export function getScoreCategoryBgColor(category: ScoreCategory): string {
  const colors = {
    excellent: "bg-green-50 dark:bg-green-950",
    good: "bg-blue-50 dark:bg-blue-950",
    fair: "bg-yellow-50 dark:bg-yellow-950",
    poor: "bg-orange-50 dark:bg-orange-950",
    critical: "bg-red-50 dark:bg-red-950",
  };
  return colors[category];
}
