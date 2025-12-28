/**
 * Report History Page
 * Display previously generated reports
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { FileText, Calendar, Download, Trash2 } from "lucide-react";
import { requireAuth } from "../lib/auth/session.server";
import { getReportHistory, deleteReportRecord, type ReportHistoryRecord } from "../lib/db/reports.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface LoaderData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  reports: ReportHistoryRecord[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  const reports = await getReportHistory(request, user.id, {
    limit: 50,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    reports,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const reportId = formData.get("reportId") as string;
    if (reportId) {
      await deleteReportRecord(request, user.id, reportId);
    }
  }

  return null;
}

export default function ReportHistoryPage() {
  const { reports } = useLoaderData<LoaderData>();

  const getReportTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      monthly: "Monthly Report",
      annual: "Annual Report",
      category: "Category Breakdown",
      account: "Account Statement",
    };
    return labels[type] || type;
  };

  const getReportPeriod = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleString("default", { month: "short" });
    const endMonth = end.toLocaleString("default", { month: "short" });
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear === endYear && startMonth === endMonth) {
      return `${startMonth} ${startYear}`;
    }

    if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${startYear}`;
    }

    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  };

  const getReportTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      monthly: "default",
      annual: "secondary",
      category: "outline",
      account: "outline",
    };
    return variants[type] || "secondary";
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Report History</h1>
          </div>
          <Link to="/reports/generate">
            <Button>Generate New Report</Button>
          </Link>
        </div>
        <p className="text-muted-foreground">
          View and download your previously generated reports
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Reports Yet</CardTitle>
            <CardDescription>
              You haven't generated any reports yet. Start by creating your first report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Generate your first finance report to see it here
              </p>
              <Link to="/reports/generate">
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {report.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {getReportPeriod(report.startDate, report.endDate)}
                    </CardDescription>
                  </div>
                  <Badge variant={getReportTypeBadgeVariant(report.reportType)}>
                    {getReportTypeLabel(report.reportType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Generated: {new Date(report.generatedAt).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    {report.fileUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={report.fileUrl} download>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    )}
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="reportId" value={report.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
