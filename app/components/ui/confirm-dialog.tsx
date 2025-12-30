/**
 * ConfirmDialog Component
 *
 * Reusable confirmation dialog that provides a styled, consistent
 * alternative to the native browser confirm() dialog.
 *
 * Features:
 * - Consistent styling with the rest of the app
 * - Accessible (keyboard navigation, screen reader support)
 * - Prevents accidental actions with clear confirmation flow
 * - Supports custom titles, descriptions, and button labels
 */

import { forwardRef } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * ConfirmDialog Component
 *
 * A styled confirmation dialog that replaces native confirm() for better UX.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isDeleteDialogOpen}
 *   onOpenChange={setIsDeleteDialogOpen}
 *   title="Delete Transaction?"
 *   description="This action cannot be undone."
 *   onConfirm={() => handleDelete()}
 *   variant="danger"
 * />
 * ```
 */
export const ConfirmDialog = forwardRef<HTMLButtonElement, ConfirmDialogProps>(
  (
    {
      open,
      onOpenChange,
      title = "Are you sure?",
      description = "This action cannot be undone.",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "danger",
      onConfirm,
      isLoading = false,
    },
    ref
  ) => {
    const handleConfirm = () => {
      onConfirm();
      onOpenChange(false);
    };

    const variantStyles = {
      danger: {
        icon: "text-red-600",
        button: "bg-red-600 hover:bg-red-700 text-white",
      },
      warning: {
        icon: "text-yellow-600",
        button: "bg-yellow-600 hover:bg-yellow-700 text-white",
      },
      info: {
        icon: "text-blue-600",
        button: "bg-blue-600 hover:bg-blue-700 text-white",
      },
    };

    const styles = variantStyles[variant];

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-opacity-10 ${
                variant === "danger"
                  ? "bg-red-100"
                  : variant === "warning"
                  ? "bg-yellow-100"
                  : "bg-blue-100"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
              </div>
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={ref}
              type="button"
              className={styles.button}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ConfirmDialog.displayName = "ConfirmDialog";
