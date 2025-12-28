/**
 * Report Generation Page
 * UI for generating PDF reports
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Form, useNavigation, useActionData } from "react-router";
import { useState } from "react";
import { FileText, Calendar, Download, Loader2 } from "lucide-react";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/components/ui/use-toast";
import { generateAndDownloadReport, type ReportRequest, type ReportOptions } from "../lib/services/pdf";
import type { ReportType } from "../lib/db/reports.server";

interface LoaderData {
  accounts: Array<{ id: string; name: string; type: string; currency: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
}

interface ActionData {
  success?: boolean;
  data?: unknown;
  options?: ReportOptions;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const [accountsResult, categoriesResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, type, currency FROM financial_accounts
         WHERE user_id = ? AND is_archived = 0
         ORDER BY name`
      )
      .bind(user.id)
      .all(),
    db
      .prepare(
        `SELECT id, name, type FROM categories
         WHERE user_id = ?
         ORDER BY type, name`
      )
      .bind(user.id)
      .all(),
  ]);

  return {
    accounts: accountsResult.results || [],
    categories: categoriesResult.results || [],
  };
}

export default function ReportGeneratePage() {
  const { accounts, categories } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const { toast } = useToast();

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [categoryType, setCategoryType] = useState<"INCOME" | "EXPENSE" | "">("");
  const [currency, setCurrency] = useState<string>("VND");

  const isGenerating = navigation.state === "submitting";
  const isSuccess = actionData?.success === true;

  // Generate years for selection (current year - 5 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Generate months for selection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1);
    return {
      value: date.toISOString().substring(0, 7),
      label: date.toLocaleDateString("en-US", { year: "numeric", month: "long" }),
    };
  });

  // Handle report generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a report type",
      });
      return;
    }

    try {
      const formData = new FormData();

      if (reportType === "monthly") {
        formData.append("reportType", "monthly");
        formData.append("startDate", `${selectedMonth}-01`);
        formData.append("endDate", `${selectedMonth}-31`);
      } else if (reportType === "annual") {
        formData.append("reportType", "annual");
        formData.append("startDate", `${selectedYear}-01-01`);
        formData.append("endDate", `${selectedYear}-12-31`);
      } else if (reportType === "category") {
        formData.append("reportType", "category");
        formData.append("startDate", startDate);
        formData.append("endDate", endDate);
        if (categoryType) {
          formData.append("categoryType", categoryType);
        }
      } else if (reportType === "account") {
        if (!selectedAccountId) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please select an account",
          });
          return;
        }
        formData.append("reportType", "account");
        formData.append("accountId", selectedAccountId);
        formData.append("startDate", startDate);
        formData.append("endDate", endDate);
      }

      formData.append("currency", currency);

      const response = await fetch("/action.generate-report", {
        method: "POST",
        body: formData,
      });

      const result = await response.json() as ActionData;

      if (!result.success) {
        throw new Error(result.error || "Failed to generate report");
      }

      // Generate and download PDF
      const reportRequest: ReportRequest = {
        type: reportType,
        data: result.data as ReportRequest['data'],
        options: result.options,
      };

      await generateAndDownloadReport(reportRequest);

      toast({
        title: "Success",
        description: "Report generated and downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Generate Reports</h1>
        </div>
        <p className="text-muted-foreground">
          Create PDF reports for your financial data
        </p>
      </div>

      <Form method="post" onSubmit={handleGenerate} className="space-y-6">
        {/* Report Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
            <CardDescription>
              Select the type of report you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "monthly", label: "Monthly Report", description: "Monthly finance summary" },
                { value: "annual", label: "Annual Report", description: "Yearly finance summary" },
                { value: "category", label: "Category Breakdown", description: "Spending by category" },
                { value: "account", label: "Account Statement", description: "Account transactions" },
              ].map((type) => (
                <div
                  key={type.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    reportType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setReportType(type.value as ReportType)}
                >
                  <div className="font-medium mb-1">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Range Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Period Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportType === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="month">Select Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === "annual" && (
              <div className="space-y-2">
                <Label htmlFor="year">Select Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select a year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(reportType === "category" || reportType === "account") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Options */}
        {reportType === "account" && (
          <Card>
            <CardHeader>
              <CardTitle>Account Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="account">Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger id="account">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === "category" && (
          <Card>
            <CardHeader>
              <CardTitle>Category Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all"
                      checked={categoryType === ""}
                      onCheckedChange={() => setCategoryType("")}
                    />
                    <Label htmlFor="all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="income"
                      checked={categoryType === "INCOME"}
                      onCheckedChange={() => setCategoryType("INCOME")}
                    />
                    <Label htmlFor="income">Income</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expense"
                      checked={categoryType === "EXPENSE"}
                      onCheckedChange={() => setCategoryType("EXPENSE")}
                    />
                    <Label htmlFor="expense">Expenses</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currency Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Report Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">Vietnamese Dong (VND)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Report
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}
