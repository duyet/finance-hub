/**
 * Calendar Service
 *
 * Handles calendar subscriptions and iCalendar (RFC 5545) export
 * for syncing financial reminders to external calendars
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export type CalendarType = "google" | "outlook" | "apple" | "other";

export type EventType = "bill_reminder" | "goal_reminder" | "recurring_transaction" | "debt_payment" | "custom_reminder";

export interface CalendarSubscription {
  id: string;
  userId: string;
  name: string;
  calendarType: CalendarType | null;
  subscriptionUrl: string | null;
  secretToken: string;
  includeBillReminders: boolean;
  includeGoalReminders: boolean;
  includeRecurringTransactions: boolean;
  includeDebtPayments: boolean;
  includeCustomReminders: boolean;
  daysAhead: number;
  isActive: boolean;
  lastAccessedAt: string | null;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface CalendarEvent {
  id: string;
  subscriptionId: string;
  eventType: EventType;
  sourceId: string;
  eventTitle: string;
  eventDescription: string | null;
  eventStart: string;
  eventEnd: string;
  allDay: boolean;
  location: string | null;
  icalUid: string;
  icalSequence: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface ICalEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  sequence?: number;
}

export interface CreateSubscriptionInput {
  userId: string;
  name: string;
  calendarType?: CalendarType;
  includeBillReminders?: boolean;
  includeGoalReminders?: boolean;
  includeRecurringTransactions?: boolean;
  includeDebtPayments?: boolean;
  includeCustomReminders?: boolean;
  daysAhead?: number;
}

// ============================================================================
// Calendar Subscriptions
// ============================================================================

/**
 * Get all calendar subscriptions for a user
 */
export async function getCalendarSubscriptions(
  db: D1Database,
  userId: string,
  options: { includeInactive?: boolean } = {}
): Promise<CalendarSubscription[]> {
  const { includeInactive = false } = options;

  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (!includeInactive) {
    conditions.push("is_active = 1");
  }

  const result = await db
    .prepare(`SELECT * FROM calendar_subscriptions WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`)
    .bind(...params)
    .all();

  return (result.results || []).map(mapRowToSubscription);
}

/**
 * Get calendar subscription by ID
 */
export async function getCalendarSubscriptionById(
  db: D1Database,
  subscriptionId: string,
  userId: string
): Promise<CalendarSubscription | null> {
  const result = await db
    .prepare(`SELECT * FROM calendar_subscriptions WHERE id = ? AND user_id = ?`)
    .bind(subscriptionId, userId)
    .first();

  return result ? mapRowToSubscription(result) : null;
}

/**
 * Get calendar subscription by secret token
 */
export async function getCalendarSubscriptionByToken(
  db: D1Database,
  secretToken: string
): Promise<CalendarSubscription | null> {
  const result = await db
    .prepare(`SELECT * FROM calendar_subscriptions WHERE secret_token = ? AND is_active = 1`)
    .bind(secretToken)
    .first();

  if (result) {
    // Update last accessed
    await db
      .prepare(`UPDATE calendar_subscriptions SET last_accessed_at = datetime('now'), access_count = access_count + 1 WHERE id = ?`)
      .bind(result.id)
      .run();
  }

  return result ? mapRowToSubscription(result) : null;
}

/**
 * Create calendar subscription
 */
export async function createCalendarSubscription(
  db: D1Database,
  input: CreateSubscriptionInput
): Promise<CalendarSubscription> {
  const id = crypto.randomUUID();
  const secretToken = generateSecretToken();

  await db
    .prepare(
      `INSERT INTO calendar_subscriptions (
        id, user_id, name, calendar_type, secret_token,
        include_bill_reminders, include_goal_reminders, include_recurring_transactions,
        include_debt_payments, include_custom_reminders, days_ahead
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.name,
      input.calendarType || null,
      secretToken,
      input.includeBillReminders !== false ? 1 : 0,
      input.includeGoalReminders !== false ? 1 : 0,
      input.includeRecurringTransactions !== false ? 1 : 0,
      input.includeDebtPayments !== false ? 1 : 0,
      input.includeCustomReminders !== false ? 1 : 0,
      input.daysAhead ?? 7
    )
    .run();

  return getCalendarSubscriptionById(db, id, input.userId) as Promise<CalendarSubscription>;
}

/**
 * Update calendar subscription
 */
export async function updateCalendarSubscription(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  updates: Partial<Omit<CreateSubscriptionInput, "userId">>
): Promise<CalendarSubscription | null> {
  const existing = await getCalendarSubscriptionById(db, subscriptionId, userId);
  if (!existing) return null;

  const updatesArray: Array<string | number> = [];
  const setClauses: string[] = [];

  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    updatesArray.push(updates.name);
  }
  if (updates.calendarType !== undefined) {
    setClauses.push("calendar_type = ?");
    updatesArray.push(updates.calendarType);
  }
  if (updates.includeBillReminders !== undefined) {
    setClauses.push("include_bill_reminders = ?");
    updatesArray.push(updates.includeBillReminders ? 1 : 0);
  }
  if (updates.includeGoalReminders !== undefined) {
    setClauses.push("include_goal_reminders = ?");
    updatesArray.push(updates.includeGoalReminders ? 1 : 0);
  }
  if (updates.includeRecurringTransactions !== undefined) {
    setClauses.push("include_recurring_transactions = ?");
    updatesArray.push(updates.includeRecurringTransactions ? 1 : 0);
  }
  if (updates.includeDebtPayments !== undefined) {
    setClauses.push("include_debt_payments = ?");
    updatesArray.push(updates.includeDebtPayments ? 1 : 0);
  }
  if (updates.includeCustomReminders !== undefined) {
    setClauses.push("include_custom_reminders = ?");
    updatesArray.push(updates.includeCustomReminders ? 1 : 0);
  }
  if (updates.daysAhead !== undefined) {
    setClauses.push("days_ahead = ?");
    updatesArray.push(updates.daysAhead);
  }

  setClauses.push("updated_at = datetime('now')");

  if (setClauses.length > 0) {
    updatesArray.push(subscriptionId);
    await db
      .prepare(`UPDATE calendar_subscriptions SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...updatesArray)
      .run();
  }

  return getCalendarSubscriptionById(db, subscriptionId, userId);
}

/**
 * Delete calendar subscription
 */
export async function deleteCalendarSubscription(
  db: D1Database,
  subscriptionId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM calendar_subscriptions WHERE id = ? AND user_id = ?`)
    .bind(subscriptionId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Regenerate subscription token
 */
export async function regenerateSubscriptionToken(
  db: D1Database,
  subscriptionId: string,
  userId: string
): Promise<CalendarSubscription | null> {
  const newToken = generateSecretToken();

  await db
    .prepare(`UPDATE calendar_subscriptions SET secret_token = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .bind(newToken, subscriptionId, userId)
    .run();

  return getCalendarSubscriptionById(db, subscriptionId, userId);
}

// ============================================================================
// iCalendar Generation
// ============================================================================

/**
 * Generate iCalendar (ICS) file content
 */
export function generateICalCalendar(events: ICalEvent[], calendarName: string): string {
  const lines: string[] = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Finance Hub//Calendar//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeICal(calendarName)}`);
  lines.push(`X-WR-TIMEZONE:UTC`);
  lines.push(`X-WR-CALDESC:${escapeICal("Financial reminders and payment due dates")}`);

  for (const event of events) {
    lines.push(...generateICalEvent(event));
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Generate iCalendar event
 */
function generateICalEvent(event: ICalEvent): string[] {
  const lines: string[] = [];

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${formatICalDate(new Date())}`);

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.start, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(event.end, true)}`);
  } else {
    lines.push(`DTSTART:${formatICalDate(event.start)}`);
    lines.push(`DTEND:${formatICalDate(event.end)}`);
  }

  lines.push(`SUMMARY:${escapeICal(event.title)}`);
  lines.push(`DESCRIPTION:${escapeICal(event.description)}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeICal(event.location)}`);
  }

  if (event.sequence !== undefined) {
    lines.push(`SEQUENCE:${event.sequence}`);
  }

  lines.push("TRANSP:TRANSPARENT");
  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");

  return lines;
}

/**
 * Format date for iCalendar (YYYYMMDDTHHmmssZ)
 */
function formatICalDate(date: Date, dateOnly = false): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (dateOnly) {
    return `${year}${month}${day}`;
  }

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in iCalendar text
 */
function escapeICal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .substring(0, 1000); // Limit length
}

/**
 * Generate secret token
 */
function generateSecretToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToSubscription(row: Record<string, unknown>): CalendarSubscription {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    calendarType: row.calendar_type ? (row.calendar_type as CalendarType) : null,
    subscriptionUrl: row.subscription_url ? String(row.subscription_url) : null,
    secretToken: String(row.secret_token),
    includeBillReminders: Boolean(row.include_bill_reminders),
    includeGoalReminders: Boolean(row.include_goal_reminders),
    includeRecurringTransactions: Boolean(row.include_recurring_transactions),
    includeDebtPayments: Boolean(row.include_debt_payments),
    includeCustomReminders: Boolean(row.include_custom_reminders),
    daysAhead: Number(row.days_ahead),
    isActive: Boolean(row.is_active),
    lastAccessedAt: row.last_accessed_at ? String(row.last_accessed_at) : null,
    accessCount: Number(row.access_count),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id),
    subscriptionId: String(row.subscription_id),
    eventType: row.event_type as EventType,
    sourceId: String(row.source_id),
    eventTitle: String(row.event_title),
    eventDescription: row.event_description ? String(row.event_description) : null,
    eventStart: String(row.event_start),
    eventEnd: String(row.event_end),
    allDay: Boolean(row.all_day),
    location: row.location ? String(row.location) : null,
    icalUid: String(row.ical_uid),
    icalSequence: Number(row.ical_sequence),
    syncedAt: String(row.synced_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}
