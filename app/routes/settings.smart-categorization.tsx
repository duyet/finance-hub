/**
 * Smart Categorization Settings Page
 *
 * Configure and manage automatic transaction categorization using ML patterns
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "react-router";
import { requireUser } from "~/lib/services/auth.server";
import { getDb } from "~/lib/db";
import {
  getCategorizationStats,
  autoCategorizeTransactions,
  getCategoryPatterns,
  deleteCategoryPattern,
  togglePatternActivity,
} from "~/lib/services/smart-categorization.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { SmartCategorizationStatsCard } from "~/components/smart-categorization";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Trash2, Power, Plus, Settings } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();

  const [stats, patterns] = await Promise.all([
    getCategorizationStats(db, user.id),
    getCategoryPatterns(db, user.id),
  ]);

  return json({ stats, patterns });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();
  const formData = await request.formData();

  const intent = formData.get("intent") as string;

  if (intent === "auto-categorize") {
    const count = await autoCategorizeTransactions(db, user.id);
    return json({ success: true, count });
  }

  if (intent === "delete-pattern") {
    const patternId = formData.get("patternId") as string;
    await deleteCategoryPattern(db, user.id, patternId);
    return json({ success: true });
  }

  if (intent === "toggle-pattern") {
    const patternId = formData.get("patternId") as string;
    const isActive = formData.get("isActive") === "true";
    await togglePatternActivity(db, user.id, patternId, isActive);
    return json({ success: true });
  }

  return json({ success: false });
}

export default function SmartCategorizationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Smart Categorization
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Automatically categorize transactions using machine learning patterns
            </p>
          </div>

          <SmartCategorizationPageContent />
        </div>
      </main>
    </div>
  );
}

function SmartCategorizationPageContent() {
  const { stats, patterns } = JSON.parse(
    document.getElementById("__loader_data")?.textContent || "{}"
  );

  const handleAutoCategorize = async () => {
    const formData = new FormData();
    formData.set("intent", "auto-categorize");

    const response = await fetch("/settings/smart-categorization", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    return result.count;
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <SmartCategorizationStatsCard
        stats={stats}
        onAutoCategorize={handleAutoCategorize}
      />

      {/* Category Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Category Patterns ({patterns.length})</span>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Pattern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No categorization patterns yet.</p>
              <p className="text-sm mt-1">
                Patterns will be automatically created as you categorize transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern: any) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {pattern.pattern}
                      </code>
                      <Badge variant="secondary">{pattern.patternType}</Badge>
                      {pattern.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Confidence: {pattern.confidence}%</span>
                      <span>Matches: {pattern.matchCount}</span>
                      {pattern.lastMatched && (
                        <span>Last: {new Date(pattern.lastMatched).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title={pattern.isActive ? "Disable" : "Enable"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Smart Categorization Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              1. Pattern Matching
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The system matches transaction descriptions against known patterns using
              contains, exact match, regex, or fuzzy matching.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              2. Historical Learning
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              When you manually categorize similar transactions 3+ times, the system
              automatically creates a pattern for future matches.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              3. Heuristic Rules
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Amount-based rules (round amounts → ATM withdrawals) and keyword matching
              from category settings provide smart suggestions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              4. Confidence Threshold
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transactions are only auto-categorized when confidence is 80% or higher,
              ensuring accuracy and preventing mis-categorizations.
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> The more you categorize transactions manually, the
              smarter the system becomes. Regular categorization trains the AI to
              automatically handle similar transactions in the future.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
