/**
 * OcrProcessing Component
 * Displays loading state during AI processing
 */

import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Brain, Loader2 } from "lucide-react";

interface OcrProcessingProps {
  progress?: number;
  message?: string;
}

export function OcrProcessing({ progress = 0, message }: OcrProcessingProps) {
  const steps = [
    { label: "Analyzing image...", threshold: 20 },
    { label: "Extracting text...", threshold: 50 },
    { label: "Identifying merchant...", threshold: 70 },
    { label: "Parsing amounts...", threshold: 85 },
    { label: "Finalizing...", threshold: 95 },
  ];

  const currentStep =
    steps.find((step) => progress < step.threshold) || steps[steps.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Processing Receipt with AI
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />

          <p className="text-center text-sm text-muted-foreground">
            {message || currentStep.label}
          </p>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          Using Llama 3.2 Vision model
        </div>
      </CardContent>
    </Card>
  );
}
