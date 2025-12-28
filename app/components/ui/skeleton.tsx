/**
 * Skeleton Component
 *
 * Loading placeholder components for improving perceived performance.
 * Used while data is being fetched from loaders.
 *
 * @see https://www.smashingmagazine.com/2022/11/modern-skeleton-screens-css/
 */

import { cn } from "~/lib/utils";

/**
 * Base skeleton pulse animation
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

/**
 * Card skeleton - mimics a card with header, content, and footer
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Table skeleton - mimics a data table with header and rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg shadow overflow-hidden", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <Skeleton className="h-6 w-48" />
      </div>
      {/* Table header */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Table rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stat card skeleton - mimics metric/stat cards
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-6", className)}>
      <Skeleton className="h-12 w-12 rounded-full mb-4" />
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/**
 * Chart skeleton - mimics a chart area
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-6", className)}>
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );
}

/**
 * List skeleton - mimics a vertical list with avatars
 */
export function ListSkeleton({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg shadow divide-y divide-gray-200", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton - combines multiple skeleton types for dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Recent transactions */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}

/**
 * Form skeleton - mimics a form with inputs
 */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-6 space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24 rounded" />
        <Skeleton className="h-10 w-24 rounded" />
      </div>
    </div>
  );
}
