/**
 * StatementList Component
 *
 * Displays a list of credit card statements with filtering and sorting options.
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { StatementCard } from "./StatementCard";
import { useI18n } from "~/lib/i18n/client";
import type { StatementWithStatus } from "~/lib/db/credit-cards.server";
import { FileText, AlertCircle } from "lucide-react";

interface StatementListProps {
  statements: StatementWithStatus[];
  cardName: string;
  currency: string;
  onViewTransactions?: (statementId: string) => void;
  onDownloadPdf?: (statementId: string) => void;
}

export function StatementList({
  statements,
  cardName,
  currency,
  onViewTransactions,
  onDownloadPdf,
}: StatementListProps) {
  const { t } = useI18n();

  // Group statements by status
  const unpaidStatements = statements.filter((s) => s.payment_status === "UNPAID");
  const partialStatements = statements.filter((s) => s.payment_status === "PARTIAL");
  const paidStatements = statements.filter((s) => s.payment_status === "PAID");
  const overdueStatements = statements.filter((s) => s.is_overdue);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("creditCards.statementHistory")}
          </CardTitle>
          {overdueStatements.length > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">{overdueStatements.length} {t("creditCards.overdue")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              {t("creditCards.allStatements")} ({statements.length})
            </TabsTrigger>
            <TabsTrigger value="unpaid">
              {t("creditCards.unpaid")} ({unpaidStatements.length + partialStatements.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              {t("creditCards.overdue")} ({overdueStatements.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              {t("creditCards.paid")} ({paidStatements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {statements.length === 0 ? (
              <EmptyState message={t("creditCards.noStatements")} />
            ) : (
              statements.map((statement) => (
                <StatementCard
                  key={statement.id}
                  statement={statement}
                  cardName={cardName}
                  currency={currency}
                  onViewTransactions={onViewTransactions}
                  onDownloadPdf={onDownloadPdf}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="unpaid" className="space-y-4 mt-4">
            {unpaidStatements.length + partialStatements.length === 0 ? (
              <EmptyState message={t("creditCards.noUnpaidStatements")} />
            ) : (
              [...unpaidStatements, ...partialStatements].map((statement) => (
                <StatementCard
                  key={statement.id}
                  statement={statement}
                  cardName={cardName}
                  currency={currency}
                  onViewTransactions={onViewTransactions}
                  onDownloadPdf={onDownloadPdf}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4 mt-4">
            {overdueStatements.length === 0 ? (
              <EmptyState message={t("creditCards.noOverdueStatements")} />
            ) : (
              overdueStatements.map((statement) => (
                <StatementCard
                  key={statement.id}
                  statement={statement}
                  cardName={cardName}
                  currency={currency}
                  onViewTransactions={onViewTransactions}
                  onDownloadPdf={onDownloadPdf}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-4">
            {paidStatements.length === 0 ? (
              <EmptyState message={t("creditCards.noPaidStatements")} />
            ) : (
              paidStatements.map((statement) => (
                <StatementCard
                  key={statement.id}
                  statement={statement}
                  cardName={cardName}
                  currency={currency}
                  onViewTransactions={onViewTransactions}
                  onDownloadPdf={onDownloadPdf}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
