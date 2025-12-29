/**
 * Tax Preferences Panel Component
 *
 * Configuration panel for tax calculation settings and preferences
 */

import type { TaxPreference } from "~/lib/services/taxes.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Settings } from "lucide-react";

interface TaxPreferencesPanelProps {
  preferences: TaxPreference;
  onUpdate?: (preferences: Partial<TaxPreference>) => void;
}

export function TaxPreferencesPanel({ preferences, onUpdate }: TaxPreferencesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tax Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tax Jurisdiction */}
        <div>
          <Label htmlFor="jurisdiction">Tax Jurisdiction</Label>
          <Input
            id="jurisdiction"
            value={preferences.taxJurisdiction}
            disabled={!onUpdate}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Country/region for tax calculations (determines rules and rates)
          </p>
        </div>

        {/* Default Tax Year */}
        <div>
          <Label htmlFor="taxYear">Default Tax Year</Label>
          <Input
            id="taxYear"
            type="number"
            value={preferences.defaultTaxYear}
            disabled={!onUpdate}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Default tax year for reports and calculations
          </p>
        </div>

        {/* Short-Term Threshold Days */}
        <div>
          <Label htmlFor="threshold">Short-Term Threshold (Days)</Label>
          <Input
            id="threshold"
            type="number"
            value={preferences.shortTermThresholdDays}
            disabled={!onUpdate}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Days held before gains qualify as long-term (default: 365 for US)
          </p>
        </div>

        {/* Wash Sale Detection */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="washSale">Enable Wash Sale Detection</Label>
            <p className="text-xs text-gray-500 mt-1">
              Track purchases within ±30 days of loss sales
            </p>
          </div>
          <Switch
            id="washSale"
            checked={preferences.enableWashSaleDetection}
            onCheckedChange={(checked) =>
              onUpdate?.({ enableWashSaleDetection: checked ? 1 : 0 })
            }
            disabled={!onUpdate}
          />
        </div>

        {/* Wash Sale Window Days */}
        {preferences.enableWashSaleDetection && (
          <div>
            <Label htmlFor="washWindow">Wash Sale Window (Days)</Label>
            <Input
              id="washWindow"
              type="number"
              value={preferences.washSaleWindowDays}
              disabled={!onUpdate}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Days before/after sale to check for replacement purchases (default: 30)
            </p>
          </div>
        )}

        {/* Auto Harvest Losses */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="autoHarvest">Auto-Harvest Losses</Label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically identify harvesting opportunities
            </p>
          </div>
          <Switch
            id="autoHarvest"
            checked={preferences.autoHarvestLosses}
            onCheckedChange={(checked) => onUpdate?.({ autoHarvestLosses: checked ? 1 : 0 })}
            disabled={!onUpdate}
          />
        </div>

        {/* Harvest Threshold Percent */}
        {preferences.autoHarvestLosses && (
          <div>
            <Label htmlFor="harvestThreshold">Harvest Threshold (%)</Label>
            <Input
              id="harvestThreshold"
              type="number"
              step="0.1"
              value={preferences.harvestThresholdPercent}
              disabled={!onUpdate}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum loss percentage to identify opportunity (default: 5%)
            </p>
          </div>
        )}

        {/* Minimum Harvest Amount */}
        {preferences.autoHarvestLosses && (
          <div>
            <Label htmlFor="minHarvest">Minimum Harvest Amount</Label>
            <Input
              id="minHarvest"
              type="number"
              value={preferences.minHarvestAmount}
              disabled={!onUpdate}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum loss amount to identify opportunity (default: 1000 VND)
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">About These Settings</p>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• <strong>Short-Term Threshold</strong>: In the US, holdings &lt;365 days are taxed at income rates</li>
            <li>• <strong>Wash Sale Rule</strong>: Loss disallowed if substantially identical security bought ±30 days</li>
            <li>• <strong>Tax Loss Harvesting</strong>: Selling losers to offset gains, up to $3k annual deduction</li>
            <li>• <strong>Consult a Tax Professional</strong>: These settings don't replace professional tax advice</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
