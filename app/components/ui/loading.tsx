/**
 * Loading Components
 *
 * Visual feedback components for loading states.
 * Improves perceived performance during navigation and data fetching.
 */

import { cn } from "~/lib/utils";

/**
 * Spinner - classic loading spinner
 */
export function Spinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * FullPageLoading - full page loading overlay
 */
export function FullPageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * InlineLoading - inline loading indicator
 */
export function InlineLoading({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2 text-gray-600", className)}>
      <Spinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

/**
 * ButtonLoading - loading state for buttons
 */
export function ButtonLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Spinner size="sm" />
      <span className="ml-2">Loading...</span>
    </div>
  );
}
