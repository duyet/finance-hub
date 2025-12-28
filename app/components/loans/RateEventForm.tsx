/**
 * RateEventForm Component
 *
 * Form for adding new interest rate events
 */

import { useState } from "react";
import { useNavigation, Form } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import type { Locale } from "~/lib/i18n/i18n.config";
import { calculateInterest } from "~/lib/services/amortization";
import { CalendarIcon } from "lucide-react";

// Helper functions that work on both client and server
function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(date: Date, locale: Locale, format: string): string {
  const options: Intl.DateTimeFormatOptions = format === "medium"
    ? { year: "numeric", month: "short", day: "numeric" }
    : { year: "numeric", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

interface RateEventFormProps {
  loanId: string;
  currentRate: number;
  outstandingPrincipal: number;
  locale: Locale;
  currencyCode?: string;
}

export function RateEventForm({
  loanId,
  currentRate,
  outstandingPrincipal,
  locale,
  currencyCode = "USD",
}: RateEventFormProps) {
  const [open, setOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(new Date());
  const [ratePercentage, setRatePercentage] = useState(currentRate.toFixed(2));
  const [rateType, setRateType] = useState<"FIXED" | "FLOATING" | "TEASER">("FLOATING");
  const [baseRate, setBaseRate] = useState("");
  const [marginPercentage, setMarginPercentage] = useState("0");
  const [reason, setReason] = useState("");

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Calculate preview
  const currentMonthlyInterest = calculateInterest(outstandingPrincipal, currentRate);
  const newMonthlyInterest = calculateInterest(outstandingPrincipal, parseFloat(ratePercentage) || 0);
  const monthlyDifference = newMonthlyInterest - currentMonthlyInterest;

  const rateIncrease = parseFloat(ratePercentage) > currentRate;
  const rateDecrease = parseFloat(ratePercentage) < currentRate;

  const handleSubmit = (e: React.FormEvent) => {
    if (!effectiveDate) {
      e.preventDefault();
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Rate Event</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Interest Rate Event</DialogTitle>
          <DialogDescription>
            Record a change in interest rate for this loan. Future installments will be recalculated.
          </DialogDescription>
        </DialogHeader>

        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="intent" value="addRateEvent" />
          <input type="hidden" name="loanId" value={loanId} />

          <div className="space-y-4 py-4">
            {/* Effective Date */}
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveDate
                      ? formatDate(effectiveDate, locale, "medium")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveDate}
                    onSelect={setEffectiveDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input
                type="hidden"
                name="effectiveDate"
                value={effectiveDate?.toISOString().split("T")[0] || ""}
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label htmlFor="ratePercentage">Interest Rate (%) *</Label>
              <Input
                id="ratePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="ratePercentage"
                value={ratePercentage}
                onChange={(e) => setRatePercentage(e.target.value)}
                required
                className={rateIncrease ? "border-red-300" : rateDecrease ? "border-green-300" : ""}
              />
              {rateIncrease && (
                <p className="text-sm text-red-600">
                  ⚠️ Rate increase: +{(parseFloat(ratePercentage) - currentRate).toFixed(2)}%
                </p>
              )}
              {rateDecrease && (
                <p className="text-sm text-green-600">
                  Rate decrease: -{(currentRate - parseFloat(ratePercentage)).toFixed(2)}%
                </p>
              )}
            </div>

            {/* Rate Type */}
            <div className="space-y-2">
              <Label htmlFor="rateType">Rate Type *</Label>
              <Select
                value={rateType}
                onValueChange={(value: "FIXED" | "FLOATING" | "TEASER") => setRateType(value)}
                name="rateType"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Rate</SelectItem>
                  <SelectItem value="FLOATING">Floating Rate</SelectItem>
                  <SelectItem value="TEASER">Teaser Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Base Rate (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="baseRate">Base Rate (Optional)</Label>
              <Input
                id="baseRate"
                type="text"
                name="baseRate"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="e.g., SOFR, LIBOR, Prime Rate"
              />
            </div>

            {/* Margin Percentage (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="marginPercentage">Margin (%)</Label>
              <Input
                id="marginPercentage"
                type="number"
                step="0.01"
                name="marginPercentage"
                value={marginPercentage}
                onChange={(e) => setMarginPercentage(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Reason (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                type="text"
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Central bank rate change"
              />
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Principal:</span>
                  <span className="font-medium">
                    {formatCurrency(outstandingPrincipal, currencyCode, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Monthly Interest:</span>
                  <span className="font-medium">
                    {formatCurrency(currentMonthlyInterest, currencyCode, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New Monthly Interest:</span>
                  <span className={`font-medium ${rateIncrease ? "text-red-600" : rateDecrease ? "text-green-600" : ""}`}>
                    {formatCurrency(newMonthlyInterest, currencyCode, locale)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-600">Monthly Difference:</span>
                  <span className={`font-medium ${monthlyDifference > 0 ? "text-red-600" : monthlyDifference < 0 ? "text-green-600" : ""}`}>
                    {monthlyDifference > 0 ? "+" : ""}
                    {formatCurrency(monthlyDifference, currencyCode, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!effectiveDate || isSubmitting}
              variant={rateIncrease ? "destructive" : "default"}
            >
              {isSubmitting ? "Adding..." : rateIncrease ? "Confirm Rate Increase" : "Confirm Rate Change"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
