/**
 * Automation Rules Engine Service
 *
 * Enables users to create custom automation rules with condition-action logic
 */

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

export type TriggerType =
  | "transaction_created"
  | "transaction_updated"
  | "category_changed"
  | "amount_changed"
  | "scheduled";

export type ConditionField =
  | "amount"
  | "description"
  | "category"
  | "date"
  | "account_id"
  | "transaction_type";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "between"
  | "in"
  | "not_in"
  | "regex";

export type ActionType =
  | "categorize"
  | "add_tag"
  | "remove_tag"
  | "set_flag"
  | "send_notification"
  | "add_note"
  | "split_transaction"
  | "round_amount"
  | "skip_budget";

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  triggerType: TriggerType;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

export interface RuleCondition {
  id: string;
  ruleId: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string; // JSON for complex values
  valueType: "string" | "number" | "boolean" | "json" | "date";
  conditionOrder: number;
}

export interface RuleAction {
  id: string;
  ruleId: string;
  actionType: ActionType;
  actionConfig: string; // JSON configuration
  actionOrder: number;
}

export interface AutomationRuleWithDetails extends AutomationRule {
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  transactionId: string;
  triggeredAt: string;
  success: boolean;
  errorMessage?: string;
  actionsTaken: string[];
}

// ============================================================================
// Rule CRUD Operations
// ============================================================================

/**
 * Create a new automation rule
 */
export async function createAutomationRule(
  db: D1Database,
  userId: string,
  rule: Omit<AutomationRuleWithDetails, "id" | "userId" | "createdAt" | "updatedAt" | "lastTriggeredAt" | "triggerCount">
): Promise<string> {
  const ruleId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO automation_rules (id, user_id, name, description, is_active, priority, trigger_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      ruleId,
      userId,
      rule.name,
      rule.description || null,
      rule.isActive ? 1 : 0,
      rule.priority,
      rule.triggerType,
      now,
      now
    )
    .run();

  // Insert conditions
  for (const condition of rule.conditions) {
    const conditionId = nanoid();
    await db
      .prepare(
        `INSERT INTO rule_conditions (id, rule_id, field, operator, value, value_type, condition_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        conditionId,
        ruleId,
        condition.field,
        condition.operator,
        typeof condition.value === "string" ? condition.value : JSON.stringify(condition.value),
        condition.valueType,
        condition.conditionOrder
      )
      .run();
  }

  // Insert actions
  for (const action of rule.actions) {
    const actionId = nanoid();
    await db
      .prepare(
        `INSERT INTO rule_actions (id, rule_id, action_type, action_config, action_order)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        actionId,
        ruleId,
        action.actionType,
        typeof action.actionConfig === "string" ? action.actionConfig : JSON.stringify(action.actionConfig),
        action.actionOrder
      )
      .run();
  }

  return ruleId;
}

/**
 * Get all automation rules for a user
 */
export async function getAutomationRules(
  db: D1Database,
  userId: string,
  includeInactive: boolean = false
): Promise<AutomationRuleWithDetails[]> {
  const activeFilter = includeInactive ? "" : "AND ar.is_active = 1";

  const rulesResult = await db
    .prepare(
      `SELECT
        ar.id, ar.user_id, ar.name, ar.description, ar.is_active, ar.priority,
        ar.trigger_type, ar.created_at, ar.updated_at, ar.last_triggered_at, ar.trigger_count
       FROM automation_rules ar
       WHERE ar.user_id = ? ${activeFilter}
       ORDER BY ar.priority DESC, ar.created_at ASC`
    )
    .bind(userId)
    .all();

  const rules: AutomationRuleWithDetails[] = [];

  for (const row of rulesResult.results || []) {
    const rule = row as any;

    // Get conditions
    const conditionsResult = await db
      .prepare(
        `SELECT * FROM rule_conditions WHERE rule_id = ? ORDER BY condition_order ASC`
      )
      .bind(rule.id)
      .all();

    // Get actions
    const actionsResult = await db
      .prepare(`SELECT * FROM rule_actions WHERE rule_id = ? ORDER BY action_order ASC`)
      .bind(rule.id)
      .all();

    rules.push({
      id: rule.id,
      userId: rule.user_id,
      name: rule.name,
      description: rule.description,
      isActive: rule.is_active === 1,
      priority: rule.priority,
      triggerType: rule.trigger_type,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      lastTriggeredAt: rule.last_triggered_at,
      triggerCount: rule.trigger_count,
      conditions: (conditionsResult.results || []).map((c: any) => ({
        id: c.id,
        ruleId: c.rule_id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        valueType: c.value_type,
        conditionOrder: c.condition_order,
      })),
      actions: (actionsResult.results || []).map((a: any) => ({
        id: a.id,
        ruleId: a.rule_id,
        actionType: a.action_type,
        actionConfig: a.action_config,
        actionOrder: a.action_order,
      })),
    });
  }

  return rules;
}

/**
 * Get a single automation rule by ID
 */
export async function getAutomationRule(
  db: D1Database,
  ruleId: string
): Promise<AutomationRuleWithDetails | null> {
  const rules = await getAutomationRulesByRuleId(db, ruleId);
  return rules[0] || null;
}

async function getAutomationRulesByRuleId(
  db: D1Database,
  ruleId: string
): Promise<AutomationRuleWithDetails[]> {
  const ruleResult = await db
    .prepare(`SELECT * FROM automation_rules WHERE id = ?`)
    .bind(ruleId)
    .first();

  if (!ruleResult) return [];

  const rule = ruleResult as any;

  // Get conditions
  const conditionsResult = await db
    .prepare(`SELECT * FROM rule_conditions WHERE rule_id = ? ORDER BY condition_order ASC`)
    .bind(ruleId)
    .all();

  // Get actions
  const actionsResult = await db
    .prepare(`SELECT * FROM rule_actions WHERE rule_id = ? ORDER BY action_order ASC`)
    .bind(ruleId)
    .all();

  return [
    {
      id: rule.id,
      userId: rule.user_id,
      name: rule.name,
      description: rule.description,
      isActive: rule.is_active === 1,
      priority: rule.priority,
      triggerType: rule.trigger_type,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      lastTriggeredAt: rule.last_triggered_at,
      triggerCount: rule.trigger_count,
      conditions: (conditionsResult.results || []).map((c: any) => ({
        id: c.id,
        ruleId: c.rule_id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        valueType: c.value_type,
        conditionOrder: c.condition_order,
      })),
      actions: (actionsResult.results || []).map((a: any) => ({
        id: a.id,
        ruleId: a.rule_id,
        actionType: a.action_type,
        actionConfig: a.action_config,
        actionOrder: a.action_order,
      })),
    },
  ];
}

/**
 * Update automation rule
 */
export async function updateAutomationRule(
  db: D1Database,
  ruleId: string,
  updates: Partial<Omit<AutomationRuleWithDetails, "id" | "userId" | "createdAt" | "updatedAt" | "lastTriggeredAt" | "triggerCount">>
): Promise<void> {
  const now = new Date().toISOString();

  // Update main rule
  if (updates.name !== undefined || updates.description !== undefined || updates.isActive !== undefined || updates.priority !== undefined) {
    await db
      .prepare(
        `UPDATE automation_rules
         SET name = COALESCE(?, name),
             description = COALESCE(?, description),
             is_active = COALESCE(?, is_active),
             priority = COALESCE(?, priority),
             updated_at = ?
         WHERE id = ?`
      )
      .bind(
        updates.name ?? null,
        updates.description ?? null,
        updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
        updates.priority ?? null,
        now,
        ruleId
      )
      .run();
  }

  // Update conditions if provided
  if (updates.conditions) {
    await db.prepare(`DELETE FROM rule_conditions WHERE rule_id = ?`).bind(ruleId).run();

    for (const condition of updates.conditions) {
      const conditionId = nanoid();
      await db
        .prepare(
          `INSERT INTO rule_conditions (id, rule_id, field, operator, value, value_type, condition_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          conditionId,
          ruleId,
          condition.field,
          condition.operator,
          typeof condition.value === "string" ? condition.value : JSON.stringify(condition.value),
          condition.valueType,
          condition.conditionOrder
        )
        .run();
    }
  }

  // Update actions if provided
  if (updates.actions) {
    await db.prepare(`DELETE FROM rule_actions WHERE rule_id = ?`).bind(ruleId).run();

    for (const action of updates.actions) {
      const actionId = nanoid();
      await db
        .prepare(
          `INSERT INTO rule_actions (id, rule_id, action_type, action_config, action_order)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          actionId,
          ruleId,
          action.actionType,
          typeof action.actionConfig === "string" ? action.actionConfig : JSON.stringify(action.actionConfig),
          action.actionOrder
        )
        .run();
    }
  }
}

/**
 * Delete automation rule
 */
export async function deleteAutomationRule(db: D1Database, ruleId: string): Promise<void> {
  await db.prepare(`DELETE FROM automation_rules WHERE id = ?`).bind(ruleId).run();
}

/**
 * Toggle rule active state
 */
export async function toggleAutomationRule(db: D1Database, ruleId: string): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE automation_rules SET is_active = NOT is_active WHERE id = ? RETURNING is_active`)
    .bind(ruleId)
    .first();

  return (result?.is_active as number) === 1;
}

// ============================================================================
// Rule Evaluation & Execution
// ============================================================================

/**
 * Evaluate a single condition against a transaction
 */
function evaluateCondition(
  condition: RuleCondition,
  transaction: any
): boolean {
  const fieldValue = getFieldValue(transaction, condition.field);
  const conditionValue = parseConditionValue(condition.value, condition.valueType);

  switch (condition.operator) {
    case "equals":
      return fieldValue === conditionValue;
    case "not_equals":
      return fieldValue !== conditionValue;
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(conditionValue as string);
    case "not_contains":
      return typeof fieldValue === "string" && !fieldValue.includes(conditionValue as string);
    case "starts_with":
      return typeof fieldValue === "string" && fieldValue.startsWith(conditionValue as string);
    case "ends_with":
      return typeof fieldValue === "string" && fieldValue.endsWith(conditionValue as string);
    case "greater_than":
      return typeof fieldValue === "number" && fieldValue > (conditionValue as number);
    case "less_than":
      return typeof fieldValue === "number" && fieldValue < (conditionValue as number);
    case "between": {
      const [min, max] = conditionValue as [number, number];
      return typeof fieldValue === "number" && fieldValue >= min && fieldValue <= max;
    }
    case "in": {
      const values = conditionValue as any[];
      return values.includes(fieldValue);
    }
    case "not_in": {
      const values = conditionValue as any[];
      return !values.includes(fieldValue);
    }
    case "regex": {
      if (typeof fieldValue !== "string") return false;
      try {
        const regex = new RegExp(conditionValue as string);
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/**
 * Get field value from transaction
 */
function getFieldValue(transaction: any, field: ConditionField): any {
  switch (field) {
    case "amount":
      return Math.abs(transaction.amount);
    case "description":
      return transaction.description || "";
    case "category":
      return transaction.category_id || "";
    case "date":
      return transaction.transaction_date;
    case "account_id":
      return transaction.account_id;
    case "transaction_type":
      return transaction.transaction_type;
    default:
      return null;
  }
}

/**
 * Parse condition value from JSON
 */
function parseConditionValue(value: string, valueType: string): any {
  switch (valueType) {
    case "number":
      return parseFloat(value);
    case "boolean":
      return value === "true";
    case "json":
      return JSON.parse(value);
    case "date":
      return new Date(value);
    default:
      return value;
  }
}

/**
 * Check if all conditions match
 */
function evaluateConditions(conditions: RuleCondition[], transaction: any): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((condition) => evaluateCondition(condition, transaction));
}

/**
 * Execute rule actions
 */
async function executeActions(
  db: D1Database,
  actions: RuleAction[],
  transactionId: string
): Promise<string[]> {
  const actionsTaken: string[] = [];

  for (const action of actions) {
    const config = JSON.parse(action.actionConfig);

    try {
      switch (action.actionType) {
        case "categorize": {
          const categoryId = config.categoryId;
          await db
            .prepare(`UPDATE transactions SET category_id = ? WHERE id = ?`)
            .bind(categoryId, transactionId)
            .run();
          actionsTaken.push(`categorized_as_${categoryId}`);
          break;
        }

        case "add_tag": {
          const tag = config.tag;
          // Tags would need a tags table - for now just log
          actionsTaken.push(`added_tag_${tag}`);
          break;
        }

        case "set_flag": {
          const flag = config.flag;
          // Flags would need a flags table - for now just log
          actionsTaken.push(`set_flag_${flag}`);
          break;
        }

        case "send_notification": {
          const message = config.message;
          // Would integrate with notification service
          actionsTaken.push(`sent_notification:${message}`);
          break;
        }

        case "add_note": {
          const note = config.note;
          // Notes would need a notes table - for now just log
          actionsTaken.push(`added_note:${note}`);
          break;
        }

        case "round_amount": {
          const { direction = "nearest" } = config;
          const txResult = await db
            .prepare(`SELECT amount FROM transactions WHERE id = ?`)
            .bind(transactionId)
            .first();

          if (txResult) {
            const amount = txResult.amount as number;
            let rounded: number;

            if (direction === "up") {
              rounded = Math.ceil(amount);
            } else if (direction === "down") {
              rounded = Math.floor(amount);
            } else {
              rounded = Math.round(amount);
            }

            await db
              .prepare(`UPDATE transactions SET amount = ? WHERE id = ?`)
              .bind(rounded, transactionId)
              .run();
            actionsTaken.push(`rounded_${direction}_${amount}_to_${rounded}`);
          }
          break;
        }

        case "skip_budget": {
          // Would set a flag to exclude from budget calculations
          actionsTaken.push("skip_budget");
          break;
        }
      }
    } catch (error) {
      actionsTaken.push(`error:${action.actionType}:${error}`);
    }
  }

  return actionsTaken;
}

/**
 * Process transaction through automation rules
 */
export async function processTransactionRules(
  db: D1Database,
  userId: string,
  transactionId: string,
  triggerType: "transaction_created" | "transaction_updated" | "category_changed" | "amount_changed"
): Promise<RuleExecution[]> {
  // Get transaction details
  const transaction = await db
    .prepare(`SELECT * FROM transactions WHERE id = ?`)
    .bind(transactionId)
    .first();

  if (!transaction) return [];

  // Get active rules for this trigger type
  const rulesResult = await db
    .prepare(
      `SELECT ar.* FROM automation_rules ar
       WHERE ar.user_id = ? AND ar.is_active = 1 AND ar.trigger_type = ?
       ORDER BY ar.priority DESC`
    )
    .bind(userId, triggerType)
    .all();

  const executions: RuleExecution[] = [];

  for (const ruleRow of rulesResult.results || []) {
    const rule = ruleRow as any;

    // Get conditions and actions
    const { conditions, actions } = await getAutomationRulesByRuleId(rule.id).then((r) => r[0]);

    // Check if conditions match
    if (!evaluateConditions(conditions, transaction)) {
      continue;
    }

    // Execute actions
    const actionsTaken = await executeActions(db, actions, transactionId);

    // Log execution
    const executionId = nanoid();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO rule_executions (id, rule_id, transaction_id, triggered_at, success, actions_taken)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(executionId, rule.id, transactionId, now, 1, JSON.stringify(actionsTaken))
      .run();

    // Update rule stats
    await db
      .prepare(
        `UPDATE automation_rules
         SET last_triggered_at = ?, trigger_count = trigger_count + 1
         WHERE id = ?`
      )
      .bind(now, rule.id)
      .run();

    executions.push({
      id: executionId,
      ruleId: rule.id,
      transactionId,
      triggeredAt: now,
      success: true,
      actionsTaken,
    });

    // Stop after first matching rule (configurable behavior)
    // break;
  }

  return executions;
}

/**
 * Get rule execution history
 */
export async function getRuleExecutions(
  db: D1Database,
  ruleId: string,
  limit: number = 50
): Promise<RuleExecution[]> {
  const result = await db
    .prepare(
      `SELECT * FROM rule_executions
       WHERE rule_id = ?
       ORDER BY triggered_at DESC
       LIMIT ?`
    )
    .bind(ruleId, limit)
    .all();

  return (result.results || []).map((row: any) => ({
    id: row.id,
    ruleId: row.rule_id,
    transactionId: row.transaction_id,
    triggeredAt: row.triggered_at,
    success: row.success === 1,
    errorMessage: row.error_message,
    actionsTaken: JSON.parse(row.actions_taken || "[]"),
  }));
}

/**
 * Get automation stats
 */
export async function getAutomationStats(db: D1Database, userId: string): Promise<{
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  executionsThisWeek: number;
}> {
  const [totalResult, activeResult, executionsResult, weeklyResult] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM automation_rules WHERE user_id = ?`).bind(userId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM automation_rules WHERE user_id = ? AND is_active = 1`).bind(userId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM rule_executions re JOIN automation_rules ar ON re.rule_id = ar.id WHERE ar.user_id = ?`).bind(userId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM rule_executions re JOIN automation_rules ar ON re.rule_id = ar.id WHERE ar.user_id = ? AND re.triggered_at >= datetime('now', '-7 days')`).bind(userId).first(),
  ]);

  return {
    totalRules: (totalResult?.count as number) || 0,
    activeRules: (activeResult?.count as number) || 0,
    totalExecutions: (executionsResult?.count as number) || 0,
    executionsThisWeek: (weeklyResult?.count as number) || 0,
  };
}
