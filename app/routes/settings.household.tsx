/**
 * Household Settings Page
 *
 * Manage household sharing, members, and invitations
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "react-router";
import { requireUser } from "~/lib/services/auth.server";
import { getDb } from "~/lib/db";
import {
  getUserHousehold,
  getHouseholdMembers,
  getPendingInvites,
  getHouseholdStats,
  createHousehold,
  createInvite,
  leaveHousehold,
  updateMemberRole,
  removeMember,
  cancelInvite,
  getUserInvites,
  acceptInvite,
  type Household,
  type HouseholdMember,
  type HouseholdInvite,
  type HouseholdStats,
} from "~/lib/services/household.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { HouseholdSummaryCard, NoHouseholdCard } from "~/components/household";
import { HouseholdMembersCard } from "~/components/household";
import { HouseholdInvitesCard } from "~/components/household";
import { Users } from "lucide-react";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();

  const [household, members, invites, stats, userInvites] = await Promise.all([
    getUserHousehold(db, user.id),
    getUserHousehold(db, user.id).then((h) => h ? getHouseholdMembers(db, h.id) : []),
    getUserHousehold(db, user.id).then((h) => h ? getPendingInvites(db, h.id) : []),
    getUserHousehold(db, user.id).then((h) => h ? getHouseholdStats(db, h.id) : { totalMembers: 0, sharedAccounts: 0, sharedBudgets: 0, sharedGoals: 0 }),
    getUserInvites(db, user.email),
  ]);

  return json({
    household,
    members,
    invites,
    stats,
    userInvites,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create-household") {
    const name = formData.get("name") as string;
    const household = await createHousehold(db, user.id, name);
    return redirect("/settings/household");
  }

  if (intent === "leave-household") {
    const householdId = formData.get("householdId") as string;
    await leaveHousehold(db, user.id, householdId);
    return redirect("/settings/household");
  }

  if (intent === "invite-member") {
    const householdId = formData.get("householdId") as string;
    const email = formData.get("email") as string;
    const role = (formData.get("role") as string) || "member";
    await createInvite(db, householdId, email, role as any, user.id);
    return json({ success: true });
  }

  if (intent === "remove-member") {
    const householdId = formData.get("householdId") as string;
    const memberId = formData.get("memberId") as string;
    await removeMember(db, householdId, memberId);
    return json({ success: true });
  }

  if (intent === "update-role") {
    const householdId = formData.get("householdId") as string;
    const memberId = formData.get("memberId") as string;
    const role = formData.get("role") as string;
    const permissions = role === "admin" ? "write" : "read";
    await updateMemberRole(db, householdId, memberId, role as any, permissions as any);
    return json({ success: true });
  }

  if (intent === "cancel-invite") {
    const inviteId = formData.get("inviteId") as string;
    await cancelInvite(db, inviteId);
    return json({ success: true });
  }

  return json({ success: false });
}

export default function HouseholdPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Users className="w-8 h-8" />
              Household Sharing
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Share finances with family members or roommates
            </p>
          </div>

          <HouseholdPageContent />
        </div>
      </main>
    </div>
  );
}

function HouseholdPageContent() {
  const { household, members, invites, stats, userInvites } = JSON.parse(
    document.getElementById("__loader_data")?.textContent || "{}"
  );

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  if (!household) {
    return (
      <NoHouseholdCard
        onCreateHousehold={() => {
          const name = prompt("Enter household name:");
          if (name) {
            const formData = new FormData();
            formData.set("intent", "create-household");
            formData.set("name", name);
            fetch("/settings/household", { method: "POST", body: formData })
              .then(() => window.location.reload());
          }
        }}
        pendingInvites={userInvites.map((i: any) => ({ householdName: i.household_name, role: i.role }))}
        onAcceptInvite={(token) => {
          // TODO: Implement accept invite flow
          alert("Invite acceptance will be implemented");
        }}
      />
    );
  }

  const canManage = members.some((m: HouseholdMember) =>
    m.userId === JSON.parse(document.getElementById("__loader_data")?.textContent || "{}").user?.id &&
    (m.role === "owner" || m.role === "admin")
  );

  return (
    <div className="space-y-6">
      <HouseholdSummaryCard
        household={household}
        stats={stats}
        onCreateHousehold={() => {}}
        onLeaveHousehold={() => {
          if (confirm("Are you sure you want to leave this household?")) {
            const formData = new FormData();
            formData.set("intent", "leave-household");
            formData.set("householdId", household.id);
            fetch("/settings/household", { method: "POST", body: formData })
              .then(() => window.location.reload());
          }
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HouseholdMembersCard
          members={members}
          canManage={canManage}
          onInviteMember={() => {
            const email = prompt("Enter email to invite:");
            if (email) {
              const formData = new FormData();
              formData.set("intent", "invite-member");
              formData.set("householdId", household.id);
              formData.set("email", email);
              formData.set("role", "member");
              fetch("/settings/household", { method: "POST", body: formData })
                .then(() => window.location.reload());
            }
          }}
          onRemoveMember={(memberId) => {
            if (confirm("Remove this member from the household?")) {
              const formData = new FormData();
              formData.set("intent", "remove-member");
              formData.set("householdId", household.id);
              formData.set("memberId", memberId);
              fetch("/settings/household", { method: "POST", body: formData })
                .then(() => window.location.reload());
            }
          }}
          onChangeRole={(memberId, role) => {
            const formData = new FormData();
            formData.set("intent", "update-role");
            formData.set("householdId", household.id);
            formData.set("memberId", memberId);
            formData.set("role", role);
            fetch("/settings/household", { method: "POST", body: formData })
              .then(() => window.location.reload());
          }}
        />

        <HouseholdInvitesCard
          invites={invites}
          onCancelInvite={(inviteId) => {
            const formData = new FormData();
            formData.set("intent", "cancel-invite");
            formData.set("inviteId", inviteId);
            fetch("/settings/household", { method: "POST", body: formData })
              .then(() => window.location.reload());
          }}
        />
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How Household Sharing Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">1. Create or Join</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a new household or accept an invite to join an existing one.
              Each household has members with different permission levels.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">2. Share Resources</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share accounts, budgets, and goals with household members.
              Members can view and edit based on their permission level.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">3. Collaborate</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track shared expenses, plan budgets together, and monitor progress
              toward common financial goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
