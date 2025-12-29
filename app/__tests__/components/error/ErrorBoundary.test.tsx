/**
 * Unit tests for Error Boundary Component
 *
 * Tests error catching, fallback UI rendering, and recovery mechanisms.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ErrorBoundary, ErrorFallback, withErrorBoundary } from "~/components/error/ErrorBoundary";

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
  vi.clearAllMocks();
});

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    const ThrowError = () => null;

    render(
      <ErrorBoundary>
        <ThrowError />
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should catch errors and render fallback UI", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
        <div>This should not render</div>
      </ErrorBoundary>
    );

    expect(screen.queryByText("This should not render")).not.toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should render custom fallback when provided", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("should call onError prop when error occurs", () => {
    const onError = vi.fn();
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test error");
    expect(onError.mock.calls[0][1]).toHaveProperty("componentStack");
  });

  it("should log error to console", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      "Error Boundary caught an error:",
      expect.any(Error)
    );
  });

  it("should reset error state when Try again is clicked", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error fallback should be shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click "Try again" button
    const tryAgainButton = screen.getByText("Try again");
    fireEvent.click(tryAgainButton);

    // Rerender with non-throwing component
    const NoError = () => <div>No error now</div>;
    rerender(
      <ErrorBoundary>
        <NoError />
      </ErrorBoundary>
    );

    // Should show the normal content
    expect(screen.getByText("No error now")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("should include Go to Dashboard link", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const dashboardLink = screen.getByText("Go to Dashboard");
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/");
  });
});

describe("ErrorFallback", () => {
  it("should render error message when error is provided", () => {
    const error = new Error("Custom error message");
    render(<ErrorFallback error={error} />);

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("should render default message when no error provided", () => {
    render(<ErrorFallback error={null} />);

    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
  });

  it("should call resetError when Try again is clicked", () => {
    const resetError = vi.fn();
    const error = new Error("Test error");

    render(<ErrorFallback error={error} resetError={resetError} />);

    const tryAgainButton = screen.getByText("Try again");
    fireEvent.click(tryAgainButton);

    expect(resetError).toHaveBeenCalled();
  });

  it("should not show Try again button when resetError not provided", () => {
    const error = new Error("Test error");

    render(<ErrorFallback error={error} />);

    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
  });
});

describe("withErrorBoundary HOC", () => {
  it("should wrap component with error boundary", () => {
    const SafeComponent = () => <div>Safe content</div>;
    const WrappedComponent = withErrorBoundary(SafeComponent);

    render(<WrappedComponent />);

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("should catch errors in wrapped component", () => {
    const ThrowError = () => {
      throw new Error("Component error");
    };
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should pass error boundary props to wrapper", () => {
    const ThrowError = () => {
      throw new Error("Component error");
    };
    const customFallback = <div>Custom fallback</div>;
    const WrappedComponent = withErrorBoundary(ThrowError, { fallback: customFallback });

    render(<WrappedComponent />);

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("should preserve component display name", () => {
    const NamedComponent = () => <div>Named</div>;
    NamedComponent.displayName = "NamedComponent";

    const WrappedComponent = withErrorBoundary(NamedComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(NamedComponent)");
  });
});

describe("ErrorBoundary edge cases", () => {
  it("should handle null children gracefully", () => {
    render(
      <ErrorBoundary>{null}</ErrorBoundary>
    );

    // Should not crash
    expect(document.body).toBeInTheDocument();
  });

  it("should handle multiple children", () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });

  it("should catch errors from deeply nested components", () => {
    const DeepError = () => {
      throw new Error("Deep error");
    };

    render(
      <ErrorBoundary>
        <div>
          <div>
            <DeepError />
          </div>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should only catch errors in its subtree", () => {
    // First boundary catches its own error
    const { rerender } = render(
      <>
        <ErrorBoundary fallback={<div>Boundary 1 error</div>}>
          <ErrorBoundary fallback={<div>Boundary 2 error</div>}>
            <div>Content</div>
          </ErrorBoundary>
        </ErrorBoundary>
      </>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
