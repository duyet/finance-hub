/**
 * Household Members Card Component
 *
 * Displays list of household members with role management
 */

import type { HouseholdMember } from "~/lib/services/household.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { UserPlus, Shield, User, Eye, Trash2 } from "lucide-react";

interface HouseholdMembersCardProps {
  members: HouseholdMember[];
  canManage: boolean;
  onInviteMember: () => void;
  onRemoveMember: (memberId: string) => void;
  onChangeRole: (memberId: string, role: string) => void;
}

export function HouseholdMembersCard({
  members,
  canManage,
  onInviteMember,
  onRemoveMember,
  onChangeRole,
}: HouseholdMembersCardProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "member":
        return <User className="w-4 h-4" />;
      case "viewer":
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-600";
      case "admin":
        return "bg-blue-600";
      case "member":
        return "bg-green-600";
      case "viewer":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Members ({members.length})
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={onInviteMember}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No members yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {member.userName || member.userEmail}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleBadgeVariant(member.role) as any}>
                        {member.role}
                      </Badge>
                      <Badge variant="outline">{member.permissions}</Badge>
                      <span className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {canManage && member.role !== "owner" && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => onChangeRole(member.id, e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemoveMember(member.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Role descriptions */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Permissions:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div><strong>Owner:</strong> Full control, cannot be removed</div>
            <div><strong>Admin:</strong> Manage members, shared resources</div>
            <div><strong>Member:</strong> View and edit shared data</div>
            <div><strong>Viewer:</strong> Read-only access</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
