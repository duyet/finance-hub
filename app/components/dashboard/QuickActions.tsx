/**
 * QuickActions Component
 *
 * Quick action buttons for common dashboard tasks
 * Add Transaction, Import CSV
 */

import { Button } from "~/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Link } from "react-router";

export function QuickActions() {
  const actions = [
    {
      label: "Add Transaction",
      icon: Plus,
      href: "/transactions",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Import CSV",
      icon: Upload,
      href: "/transactions/import",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto p-4 justify-start hover:bg-gray-50"
            asChild
          >
            <Link to={action.href}>
              <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center mr-3`}>
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
