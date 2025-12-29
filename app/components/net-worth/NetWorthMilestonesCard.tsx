/**
 * Net Worth Milestones Card Component
 *
 * Display net worth goals and milestones
 */

import type { NetWorthMilestone } from "~/lib/services/net-worth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Target, Trophy, Plus, Check } from "lucide-react";

interface NetWorthMilestonesCardProps {
  milestones: NetWorthMilestone[];
  currentNetWorth: number;
  currency?: string;
  onCreate?: () => void;
  onToggle?: (milestoneId: string, isAchieved: boolean) => void;
  onDelete?: (milestoneId: string) => void;
}

export function NetWorthMilestonesCard({
  milestones,
  currentNetWorth,
  currency = "VND",
  onCreate,
  onToggle,
  onDelete,
}: NetWorthMilestonesCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const achievedMilestones = milestones.filter((m) => m.isAchieved);
  const pendingMilestones = milestones.filter((m) => !m.isAchieved);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Milestones
          </span>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No milestones yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Set net worth goals to track your progress
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Achieved Milestones */}
            {achievedMilestones.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-600 mb-2">Achieved</p>
                <div className="space-y-2">
                  {achievedMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <Check className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{milestone.title}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {formatCurrency(milestone.targetNetWorth)}
                        </p>
                        {milestone.achievedDate && (
                          <p className="text-xs text-gray-500">
                            Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Milestones */}
            {pendingMilestones.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">In Progress</p>
                <div className="space-y-2">
                  {pendingMilestones.map((milestone) => {
                    const progress = Math.min(100, (currentNetWorth / milestone.targetNetWorth) * 100);

                    return (
                      <div
                        key={milestone.id}
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{milestone.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Target: {formatCurrency(milestone.targetNetWorth)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-600">{progress.toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
