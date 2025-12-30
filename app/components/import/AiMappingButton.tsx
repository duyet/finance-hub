/**
 * AiMappingButton Component
 * Button to trigger AI column mapping
 */

import { useState } from "react";
import { useI18n } from "~/lib/i18n/client";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/use-toast";

interface AiMappingButtonProps {
  onMapColumns: () => Promise<Record<string, string>>;
  disabled?: boolean;
}

export function AiMappingButton({
  onMapColumns,
  disabled = false,
}: AiMappingButtonProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onMapColumns();
      toast({
        title: t("import.csv.ai.success", "AI Mapping Complete"),
        description: t(
          "import.csv.ai.successDescription",
          "Columns have been automatically mapped. Please review and adjust if needed."
        ),
      });
    } catch (error) {
      toast({
        title: t("import.csv.ai.error", "AI Mapping Failed"),
        description:
          error instanceof Error
            ? error.message
            : t(
                "import.csv.ai.errorDescription",
                "Failed to map columns with AI. Please map manually."
              ),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t("import.csv.ai.loading", "AI is mapping...")}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          {t("import.csv.ai.button", "Auto-detect with AI")}
        </>
      )}
    </Button>
  );
}
