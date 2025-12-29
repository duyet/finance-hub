/**
 * Automation Rules Card Component
 *
 * Displays list of automation rules with toggle and delete actions
 */

import type { AutomationRuleWithDetails } from "~/lib/services/automation.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Bot, Power, Trash2, Plus, Edit } from "lucide-react";

interface AutomationRulesCardProps {
  rules: AutomationRuleWithDetails[];
  onToggle: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
  onEdit: (ruleId: string) => void;
  onCreate: () => void;
}

export function AutomationRulesCard({
  rules,
  onToggle,
  onDelete,
  onEdit,
  onCreate,
}: AutomationRulesCardProps) {
  const getTriggerColor = (triggerType: string) => {
    switch (triggerType) {
      case "transaction_created":
        return "bg-green-600";
      case "transaction_updated":
        return "bg-blue-600";
      case "category_changed":
        return "bg-purple-600";
      case "amount_changed":
        return "bg-orange-600";
      case "scheduled":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    switch (triggerType) {
      case "transaction_created":
        return "On Create";
      case "transaction_updated":
        return "On Update";
      case "category_changed":
        return "Category Changed";
      case "amount_changed":
        return "Amount Changed";
      case "scheduled":
        return "Scheduled";
      default:
        return triggerType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Automation Rules ({rules.length})
          </div>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create custom automation with condition-action logic
        </p>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-4">No automation rules yet.</p>
            <Button variant="outline" onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  rule.isActive
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {rule.name}
                      </h4>
                      {rule.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      <Badge className={getTriggerColor(rule.triggerType)}>
                        {getTriggerLabel(rule.triggerType)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Priority: {rule.priority}
                      </span>
                    </div>

                    {rule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {rule.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>{rule.conditions.length} conditions</span>
                      <span>•</span>
                      <span>{rule.actions.length} actions</span>
                      <span>•</span>
                      <span>Triggered {rule.triggerCount} times</span>
                      {rule.lastTriggeredAt && (
                        <>
                          <span>•</span>
                          <span>Last: {new Date(rule.lastTriggeredAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => onEdit(rule.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Edit rule"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(rule.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title={rule.isActive ? "Disable" : "Enable"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(rule.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Conditions Preview */}
                {rule.conditions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      If {rule.conditions.map((c) => `${c.field} ${c.operator}`).join(" and ")}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Then {rule.actions.map((a) => a.actionType).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
