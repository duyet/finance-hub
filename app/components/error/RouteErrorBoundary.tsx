/**
 * Route-specific Error Boundary
 *
 * Provides error handling for specific routes with custom fallback UI.
 */

import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ErrorBoundary as BaseErrorBoundary, ErrorFallback } from "./ErrorBoundary";

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
}

/**
 * Route Error Boundary Component
 *
 * Enhanced error boundary for route-level error handling with navigation options.
 *
 * @example
 * ```tsx
 * export default function SomeRoute() {
 *   return (
 *     <RouteErrorBoundary showBackButton backTo="/dashboard">
 *       <YourContent />
 *     </RouteErrorBoundary>
 *   );
 * }
 * ```
 */
export function RouteErrorBoundary({
  children,
  fallback,
  showBackButton = false,
  backTo = "/dashboard",
}: RouteErrorBoundaryProps) {
  return (
    <BaseErrorBoundary
      fallback={
        fallback || (
          <RouteErrorFallback
            showBackButton={showBackButton}
            backTo={backTo}
          />
        )
      }
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Route Error Fallback Component
 *
 * Custom fallback UI for route-level errors with optional back button.
 */
function RouteErrorFallback({
  showBackButton,
  backTo,
}: {
  showBackButton?: boolean;
  backTo?: string;
}) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(backTo || "/dashboard");
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-amber-100 p-4">
              <svg
                className="h-10 w-10 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to load this page
          </h2>

          <p className="text-gray-600 mb-8">
            Something went wrong while loading this page. This might be due to a temporary
            issue or invalid data. You can try going back and loading the page again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton ? (
              <button
                onClick={handleGoBack}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Go Back
              </button>
            ) : (
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Go to Dashboard
              </a>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Reload Page
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If this problem persists, please contact support or check the system status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * HOC for wrapping route components with error boundary
 *
 * @example
 * ```tsx
 * export default withRouteErrorBoundary(SomeRoute, { showBackButton: true });
 * ```
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RouteErrorBoundaryProps, "children">
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <RouteErrorBoundary {...options}>
      <Component {...props} />
    </RouteErrorBoundary>
  );

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}
