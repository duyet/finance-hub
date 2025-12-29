/**
 * Household Invites Card Component
 *
 * Displays pending invitations with copy link and cancel actions
 */

import type { HouseholdInvite } from "~/lib/services/household.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Mail, Copy, Trash2, Check } from "lucide-react";

interface HouseholdInvitesCardProps {
  invites: HouseholdInvite[];
  onCancelInvite: (inviteId: string) => void;
}

export function HouseholdInvitesCard({ invites, onCancelInvite }: HouseholdInvitesCardProps) {
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/household/join?token=${token}`;
    navigator.clipboard.writeText(link);
  };

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Expires soon";
    if (hours < 24) return `Expires in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Expires in ${days}d`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Pending Invites ({invites.length})
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage invitations to your household
        </p>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Mail className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending invitations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {invite.email}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {invite.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>Invited by {invite.invitedByName || "Unknown"}</span>
                    <span>{formatExpiry(invite.expiresAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invite.token)}
                    title="Copy invite link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => onCancelInvite(invite.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                    title="Cancel invite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How to invite */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>How to invite:</strong> Create an invite, then share the link with the person.
            They'll join your household when they click the link and sign in.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
