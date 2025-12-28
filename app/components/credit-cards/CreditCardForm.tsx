/**
 * CreditCardForm Component
 *
 * Form for adding or editing a credit card.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useI18n } from "~/lib/i18n/client";
import { CreditCard, Building2 } from "lucide-react";

interface CreditCardFormProps {
  onSubmit: (data: CreditCardFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<CreditCardFormData>;
  isLoading?: boolean;
}

export interface CreditCardFormData {
  name: string;
  institution_name: string;
  account_number_last4: string;
  currency: string;
  statement_day: number;
  payment_due_day_offset: number;
  credit_limit: number;
  apr?: number;
  annual_fee?: number;
  color_theme?: string;
}

const COLOR_THEMES = [
  { value: "blue", label: "Blue", class: "bg-gradient-to-br from-blue-500 to-blue-700" },
  { value: "green", label: "Green", class: "bg-gradient-to-br from-green-500 to-green-700" },
  { value: "purple", label: "Purple", class: "bg-gradient-to-br from-purple-500 to-purple-700" },
  { value: "red", label: "Red", class: "bg-gradient-to-br from-red-500 to-red-700" },
  { value: "orange", label: "Orange", class: "bg-gradient-to-br from-orange-500 to-orange-700" },
  { value: "pink", label: "Pink", class: "bg-gradient-to-br from-pink-500 to-pink-700" },
  { value: "indigo", label: "Indigo", class: "bg-gradient-to-br from-indigo-500 to-indigo-700" },
  { value: "teal", label: "Teal", class: "bg-gradient-to-br from-teal-500 to-teal-700" },
];

export function CreditCardForm({ onSubmit, onCancel, initialData, isLoading }: CreditCardFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<CreditCardFormData>({
    name: initialData?.name || "",
    institution_name: initialData?.institution_name || "",
    account_number_last4: initialData?.account_number_last4 || "",
    currency: initialData?.currency || "VND",
    statement_day: initialData?.statement_day || 25,
    payment_due_day_offset: initialData?.payment_due_day_offset || 20,
    credit_limit: initialData?.credit_limit || 0,
    apr: initialData?.apr,
    annual_fee: initialData?.annual_fee || 0,
    color_theme: initialData?.color_theme || "blue",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreditCardFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreditCardFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("creditCards.validation.nameRequired");
    }
    if (!formData.institution_name.trim()) {
      newErrors.institution_name = t("creditCards.validation.institutionRequired");
    }
    if (!formData.account_number_last4.trim() || formData.account_number_last4.length !== 4) {
      newErrors.account_number_last4 = t("creditCards.validation.last4Required");
    }
    if (formData.statement_day < 1 || formData.statement_day > 31) {
      newErrors.statement_day = t("creditCards.validation.statementDayInvalid");
    }
    if (formData.payment_due_day_offset < 1 || formData.payment_due_day_offset > 60) {
      newErrors.payment_due_day_offset = t("creditCards.validation.dueDayOffsetInvalid");
    }
    if (formData.credit_limit <= 0) {
      newErrors.credit_limit = t("creditCards.validation.creditLimitRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof CreditCardFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {initialData?.name ? t("creditCards.editCard") : t("creditCards.addCard")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t("creditCards.cardInformation")}</h3>

            <div className="space-y-2">
              <Label htmlFor="name">{t("creditCards.cardName")} *</Label>
              <Input
                id="name"
                placeholder={t("creditCards.cardNamePlaceholder")}
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">{t("creditCards.institution")} *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="institution"
                  placeholder={t("creditCards.institutionPlaceholder")}
                  value={formData.institution_name}
                  onChange={(e) => handleChange("institution_name", e.target.value)}
                  className={`pl-10 ${errors.institution_name ? "border-red-500" : ""}`}
                />
              </div>
              {errors.institution_name && <p className="text-sm text-red-600">{errors.institution_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="last4">{t("creditCards.last4")} *</Label>
                <Input
                  id="last4"
                  placeholder="••••"
                  maxLength={4}
                  value={formData.account_number_last4}
                  onChange={(e) => handleChange("account_number_last4", e.target.value.replace(/\D/g, ""))}
                  className={errors.account_number_last4 ? "border-red-500" : ""}
                />
                {errors.account_number_last4 && <p className="text-sm text-red-600">{errors.account_number_last4}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t("creditCards.currency")}</Label>
                <Select value={formData.currency} onValueChange={(value) => handleChange("currency", value)}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("creditCards.colorTheme")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_THEMES.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleChange("color_theme", color.value)}
                    className={`h-12 rounded-lg ${color.class} ${
                      formData.color_theme === color.value ? "ring-2 ring-offset-2 ring-gray-900" : ""
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Billing Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900">{t("creditCards.billingConfiguration")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statement_day">{t("creditCards.statementDay")} *</Label>
                <Input
                  id="statement_day"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.statement_day}
                  onChange={(e) => handleChange("statement_day", parseInt(e.target.value) || 0)}
                  className={errors.statement_day ? "border-red-500" : ""}
                />
                {errors.statement_day && <p className="text-sm text-red-600">{errors.statement_day}</p>}
                <p className="text-xs text-gray-500">{t("creditCards.statementDayHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_offset">{t("creditCards.paymentDueDays")} *</Label>
                <Input
                  id="due_offset"
                  type="number"
                  min={1}
                  max={60}
                  value={formData.payment_due_day_offset}
                  onChange={(e) => handleChange("payment_due_day_offset", parseInt(e.target.value) || 0)}
                  className={errors.payment_due_day_offset ? "border-red-500" : ""}
                />
                {errors.payment_due_day_offset && <p className="text-sm text-red-600">{errors.payment_due_day_offset}</p>}
                <p className="text-xs text-gray-500">{t("creditCards.paymentDueDaysHint")}</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900">{t("creditCards.financialDetails")}</h3>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">{t("creditCards.creditLimit")} *</Label>
              <Input
                id="credit_limit"
                type="number"
                min={0}
                step="1000"
                value={formData.credit_limit}
                onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)}
                className={errors.credit_limit ? "border-red-500" : ""}
              />
              {errors.credit_limit && <p className="text-sm text-red-600">{errors.credit_limit}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apr">{t("creditCards.apr")}</Label>
                <Input
                  id="apr"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.apr || ""}
                  onChange={(e) => handleChange("apr", parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual_fee">{t("creditCards.annualFee")}</Label>
                <Input
                  id="annual_fee"
                  type="number"
                  min={0}
                  step="100"
                  value={formData.annual_fee}
                  onChange={(e) => handleChange("annual_fee", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? t("common.saving") : initialData?.name ? t("actions.update") : t("actions.add")}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                {t("actions.cancel")}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
