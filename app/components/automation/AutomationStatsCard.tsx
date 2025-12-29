/**
 * Automation Stats Card Component
 *
 * Displays automation rules statistics
 */

import type { AutomationStats } from "~/lib/services/automation.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Bot, Zap, TrendingUp, Activity } from "lucide-react";

interface AutomationStatsCardProps {
  stats: AutomationStats;
}

export function AutomationStatsCard({ stats }: AutomationStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Automation Overview
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your custom automation rules and their activity
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Rules */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Rules</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalRules}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.activeRules} active
            </div>
          </div>

          {/* Active Rules */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.activeRules}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalRules > 0 ? `${Math.round((stats.activeRules / stats.totalRules) * 100)}%` : "0%"} of total
            </div>
          </div>

          {/* Total Executions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Executions</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalExecutions}
            </div>
            <div className="text-xs text-gray-500 mt-1">all time</div>
          </div>

          {/* This Week */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.executionsThisWeek}
            </div>
            <div className="text-xs text-gray-500 mt-1">past 7 days</div>
          </div>
        </div>

        {/* Empty State */}
        {stats.totalRules === 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Get started:</strong> Create your first automation rule to automatically categorize
              transactions, add tags, or send notifications based on conditions you define.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
