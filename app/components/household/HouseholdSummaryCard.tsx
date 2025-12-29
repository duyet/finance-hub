/**
 * Household Summary Card Component
 *
 * Displays household overview with stats and quick actions
 */

import type { Household, HouseholdStats } from "~/lib/services/household.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Users, Wallet, Target, Plus, LogOut } from "lucide-react";

interface HouseholdSummaryCardProps {
  household: Household;
  stats: HouseholdStats;
  onCreateHousehold: () => void;
  onLeaveHousehold: () => void;
}

export function HouseholdSummaryCard({
  household,
  stats,
  onCreateHousehold,
  onLeaveHousehold,
}: HouseholdSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {household.name}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLeaveHousehold}>
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Shared finances with household members
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Members */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Members</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalMembers}
            </div>
          </div>

          {/* Accounts */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Accounts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.sharedAccounts}
            </div>
          </div>

          {/* Budgets */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Budgets</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.sharedBudgets}
            </div>
          </div>

          {/* Goals */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Goals</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.sharedGoals}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Created {new Date(household.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

interface NoHouseholdCardProps {
  onCreateHousehold: () => void;
  pendingInvites: Array<{ householdName: string; role: string }>;
  onAcceptInvite: (token: string) => void;
}

export function NoHouseholdCard({
  onCreateHousehold,
  pendingInvites,
  onAcceptInvite,
}: NoHouseholdCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Household Sharing
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Share finances with family members or roommates
        </p>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You're not part of a household yet. Create one to start sharing finances with others.
          </p>
          <Button onClick={onCreateHousehold}>
            <Plus className="w-4 h-4 mr-2" />
            Create Household
          </Button>
        </div>

        {pendingInvites.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Pending Invites
            </h4>
            <div className="space-y-2">
              {pendingInvites.map((invite, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {invite.householdName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Role: {invite.role}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onAcceptInvite("")}>
                    Accept
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
