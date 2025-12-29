/**
 * Automation Settings Page
 *
 * Manage automation rules for custom transaction processing
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "react-router";
import { requireUser } from "~/lib/services/auth.server";
import { getDb } from "~/lib/db";
import {
  getAutomationRules,
  getAutomationStats,
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  type AutomationRuleWithDetails,
  type AutomationStats,
} from "~/lib/services/automation.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { AutomationStatsCard } from "~/components/automation";
import { AutomationRulesCard } from "~/components/automation";
import { CreateRuleDialog } from "~/components/automation";
import { Bot } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();

  const [rules, stats] = await Promise.all([
    getAutomationRules(db, user.id),
    getAutomationStats(db, user.id),
  ]);

  return json({ rules, stats });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create-rule") {
    const ruleData = JSON.parse(formData.get("rule") as string);
    const ruleId = await createAutomationRule(db, user.id, ruleData);
    return json({ success: true, ruleId });
  }

  if (intent === "toggle-rule") {
    const ruleId = formData.get("ruleId") as string;
    await toggleAutomationRule(db, ruleId);
    return json({ success: true });
  }

  if (intent === "delete-rule") {
    const ruleId = formData.get("ruleId") as string;
    await deleteAutomationRule(db, ruleId);
    return json({ success: true });
  }

  return json({ success: false });
}

export default function AutomationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Bot className="w-8 h-8" />
              Automation Rules
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create custom automation rules with condition-action logic
            </p>
          </div>

          <AutomationPageContent />
        </div>
      </main>
    </div>
  );
}

function AutomationPageContent() {
  const { rules, stats } = JSON.parse(
    document.getElementById("__loader_data")?.textContent || "{}"
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRuleWithDetails | undefined>();

  const handleSaveRule = async (rule: Omit<AutomationRuleWithDetails, "id" | "userId" | "createdAt" | "updatedAt" | "lastTriggeredAt" | "triggerCount">) => {
    const formData = new FormData();
    formData.set("intent", "create-rule");
    formData.set("rule", JSON.stringify(rule));

    const response = await fetch("/settings/automation", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      window.location.reload();
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    const formData = new FormData();
    formData.set("intent", "toggle-rule");
    formData.set("ruleId", ruleId);

    await fetch("/settings/automation", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    const formData = new FormData();
    formData.set("intent", "delete-rule");
    formData.set("ruleId", ruleId);

    await fetch("/settings/automation", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <AutomationStatsCard stats={stats} />

      <AutomationRulesCard
        rules={rules}
        onToggle={handleToggleRule}
        onDelete={handleDeleteRule}
        onEdit={(ruleId) => {
          const rule = rules.find((r) => r.id === ruleId);
          if (rule) {
            setEditingRule(rule);
            setShowCreateDialog(true);
          }
        }}
        onCreate={() => {
          setEditingRule(undefined);
          setShowCreateDialog(true);
        }}
      />

      <CreateRuleDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingRule(undefined);
        }}
        onSave={handleSaveRule}
        editRule={editingRule}
      />

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How Automation Rules Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">1. Define Triggers</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose when rules run: when transactions are created, updated, categorized,
              or on a schedule.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">2. Set Conditions</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define IF conditions like "description contains Netflix" or "amount {'>'} 100".
              Multiple conditions must all match.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">3. Specify Actions</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define THEN actions like "categorize as Entertainment", "add tag 'streaming'",
              or "send notification".
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Rules execute in priority order (highest first). Stop processing
            after the first matching rule to prevent conflicts, or let multiple rules apply
            sequential changes.
          </p>
        </div>
      </div>
    </div>
  );
}
