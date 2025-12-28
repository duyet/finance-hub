/**
 * PaymentForm Component
 *
 * Form for recording loan payments
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import type { Locale } from "~/lib/i18n/i18n.config";
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

interface Installment {
  id: string;
  due_date: string;
  installment_number: number;
  total_amount: number;
  principal_component: number;
  interest_component: number;
  status: string;
}

interface PaymentFormProps {
  loanId: string;
  installments: Installment[];
  locale: Locale;
  currencyCode?: string;
}

export function PaymentForm({ loanId, installments, locale, currencyCode = "USD" }: PaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [installmentId, setInstallmentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [principalPortion, setPrincipalPortion] = useState("");
  const [interestPortion, setInterestPortion] = useState("");
  const [feePortion, setFeePortion] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Get pending installments
  const pendingInstallments = installments.filter(
    (inst) => inst.status !== "PAID" && inst.status !== "WAIVED"
  );

  // Auto-fill amounts when installment is selected
  const handleInstallmentChange = (instId: string) => {
    setInstallmentId(instId);
    const installment = installments.find((i) => i.id === instId);
    if (installment) {
      setAmount(installment.total_amount.toString());
      setPrincipalPortion(installment.principal_component.toString());
      setInterestPortion(installment.interest_component.toString());
    }
  };

  // Calculate remaining for fee
  const totalPortions = (parseFloat(principalPortion) || 0) + (parseFloat(interestPortion) || 0) + (parseFloat(feePortion) || 0);
  const remaining = parseFloat(amount || "0") - totalPortions;

  const handleSubmit = (e: React.FormEvent) => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record Payment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Loan Payment</DialogTitle>
          <DialogDescription>
            Record a payment made against this loan. You can associate it with an installment or record as prepayment.
          </DialogDescription>
        </DialogHeader>

        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="intent" value="recordPayment" />
          <input type="hidden" name="loanId" value={loanId} />

          <div className="space-y-4 py-4">
            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate
                      ? formatDate(paymentDate, locale, "medium")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input
                type="hidden"
                name="paymentDate"
                value={paymentDate.toISOString().split("T")[0]}
              />
            </div>

            {/* Installment (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="installmentId">Apply to Installment (Optional)</Label>
              <Select value={installmentId} onValueChange={handleInstallmentChange} name="installmentId">
                <SelectTrigger>
                  <SelectValue placeholder="Select installment or leave blank for prepayment" />
                </SelectTrigger>
                <SelectContent>
                  {pendingInstallments.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      #{inst.installment_number} - {formatDate(new Date(inst.due_date), locale, "medium")} -{" "}
                      {formatCurrency(inst.total_amount, currencyCode, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount Paid *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>

            {/* Principal Portion */}
            <div className="space-y-2">
              <Label htmlFor="principalPortion">Principal Portion *</Label>
              <Input
                id="principalPortion"
                type="number"
                step="0.01"
                min="0"
                name="principalPortion"
                value={principalPortion}
                onChange={(e) => setPrincipalPortion(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>

            {/* Interest Portion */}
            <div className="space-y-2">
              <Label htmlFor="interestPortion">Interest Portion *</Label>
              <Input
                id="interestPortion"
                type="number"
                step="0.01"
                min="0"
                name="interestPortion"
                value={interestPortion}
                onChange={(e) => setInterestPortion(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>

            {/* Fee Portion */}
            <div className="space-y-2">
              <Label htmlFor="feePortion">Fee Portion</Label>
              <Input
                id="feePortion"
                type="number"
                step="0.01"
                min="0"
                name="feePortion"
                value={feePortion}
                onChange={(e) => setFeePortion(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} name="paymentMethod">
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online_banking">Online Banking</SelectItem>
                  <SelectItem value="auto_debit">Auto Debit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
              <Input
                id="referenceNumber"
                type="text"
                name="referenceNumber"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction reference"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details"
              />
            </div>

            {/* Validation Warning */}
            {Math.abs(remaining) > 0.01 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Amounts don't match. Difference:{" "}
                  {formatCurrency(Math.abs(remaining), currencyCode, locale)}
                </p>
              </div>
            )}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
