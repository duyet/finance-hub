/**
 * Auto Categorize Button Component
 *
 * Triggers auto-categorization of uncategorized transactions
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AutoCategorizeButtonProps {
  uncategorizedCount: number;
  onCategorize: () => Promise<number>;
  disabled?: boolean;
}

export function AutoCategorizeButton({
  uncategorizedCount,
  onCategorize,
  disabled = false,
}: AutoCategorizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const count = await onCategorize();
      setResult({ count });
    } catch (error) {
      console.error("Auto-categorization failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (result && result.count > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Sparkles className="w-4 h-4" />
        <span>
          Successfully categorized {result.count} transaction{result.count !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  if (result && result.count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>No transactions matched categorization patterns</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isLoading || uncategorizedCount === 0}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Categorizing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Auto-Categorize ({uncategorizedCount})
        </>
      )}
    </Button>
  );
}
