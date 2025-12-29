/**
 * Create Rule Dialog Component
 *
 * Dialog for creating/editing automation rules
 */

import { useState } from "react";
import type { AutomationRuleWithDetails, TriggerType, ConditionField, ConditionOperator, ActionType } from "~/lib/services/automation.server";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface CreateRuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Omit<AutomationRuleWithDetails, "id" | "userId" | "createdAt" | "updatedAt" | "lastTriggeredAt" | "triggerCount">) => void;
  editRule?: AutomationRuleWithDetails;
}

export function CreateRuleDialog({ open, onClose, onSave, editRule }: CreateRuleDialogProps) {
  const [name, setName] = useState(editRule?.name || "");
  const [description, setDescription] = useState(editRule?.description || "");
  const [triggerType, setTriggerType] = useState<TriggerType>(editRule?.triggerType || "transaction_created");
  const [priority, setPriority] = useState(editRule?.priority || 0);
  const [conditions, setConditions] = useState(
    editRule?.conditions || [{ field: "description", operator: "contains", value: "", valueType: "string", conditionOrder: 0, ruleId: "", id: "" }]
  );
  const [actions, setActions] = useState(
    editRule?.actions || [{ actionType: "categorize", actionConfig: "{}", actionOrder: 0, ruleId: "", id: "" }]
  );

  const handleSave = () => {
    const rule: Omit<AutomationRuleWithDetails, "id" | "userId" | "createdAt" | "updatedAt" | "lastTriggeredAt" | "triggerCount"> = {
      name,
      description,
      isActive: true,
      priority,
      triggerType,
      conditions: conditions.map((c, i) => ({ ...c, conditionOrder: i, ruleId: "", id: "" })),
      actions: actions.map((a, i) => ({ ...a, actionOrder: i, ruleId: "", id: "" })),
    };

    onSave(rule);
    handleClose();
  };

  const handleClose = () => {
    if (!editRule) {
      setName("");
      setDescription("");
      setTriggerType("transaction_created");
      setPriority(0);
      setConditions([{ field: "description", operator: "contains", value: "", valueType: "string", conditionOrder: 0, ruleId: "", id: "" }]);
      setActions([{ actionType: "categorize", actionConfig: "{}", actionOrder: 0, ruleId: "", id: "" }]);
    }
    onClose();
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "description", operator: "contains", value: "", valueType: "string", conditionOrder: conditions.length, ruleId: "", id: "" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index).map((c, i) => ({ ...c, conditionOrder: i })));
  };

  const updateCondition = (index: number, updates: Partial<typeof conditions[0]>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const addAction = () => {
    setActions([...actions, { actionType: "categorize", actionConfig: "{}", actionOrder: actions.length, ruleId: "", id: "" }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index).map((a, i) => ({ ...a, actionOrder: i })));
  };

  const updateAction = (index: number, updates: Partial<typeof actions[0]>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRule ? "Edit Automation Rule" : "Create Automation Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="e.g., Auto-categorize Netflix expenses"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="What does this rule do?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Trigger</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="transaction_created">When transaction is created</option>
                  <option value="transaction_updated">When transaction is updated</option>
                  <option value="category_changed">When category changes</option>
                  <option value="amount_changed">When amount changes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Conditions (IF)</label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="w-4 h-4 mr-1" />
                Add Condition
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value as ConditionField })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="description">Description</option>
                    <option value="amount">Amount</option>
                    <option value="category">Category</option>
                    <option value="account_id">Account</option>
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="contains">contains</option>
                    <option value="not_contains">does not contain</option>
                    <option value="equals">equals</option>
                    <option value="not_equals">does not equal</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                    <option value="in">in</option>
                    <option value="not_in">not in</option>
                  </select>

                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    placeholder="Value"
                  />

                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Actions (THEN)</label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="w-4 h-4 mr-1" />
                Add Action
              </Button>
            </div>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <select
                    value={action.actionType}
                    onChange={(e) => updateAction(index, { actionType: e.target.value as ActionType })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="categorize">Categorize as...</option>
                    <option value="add_tag">Add tag...</option>
                    <option value="set_flag">Set flag...</option>
                    <option value="send_notification">Send notification...</option>
                    <option value="add_note">Add note...</option>
                    <option value="round_amount">Round amount...</option>
                    <option value="skip_budget">Skip budget</option>
                  </select>

                  <input
                    type="text"
                    value={typeof action.actionConfig === "string" ? action.actionConfig : JSON.stringify(action.actionConfig)}
                    onChange={(e) => updateAction(index, { actionConfig: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    placeholder="Config (JSON)"
                  />

                  <button
                    type="button"
                    onClick={() => removeAction(index)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || conditions.length === 0 || actions.length === 0}>
            {editRule ? "Update" : "Create"} Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
