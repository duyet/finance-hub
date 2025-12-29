/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar with mobile responsiveness
 * Supports collapsible menu on mobile devices
 */

import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Landmark,
  Settings,
  Menu,
  User,
  LogOut,
  Link2,
  Receipt,
  Target,
  Bell,
  TrendingUp,
  FileText,
  Calendar,
  Trophy,
  DollarSign,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { NotificationBell } from "~/components/notifications";
import type { NotificationStats } from "~/lib/services/notifications.server";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
  },
  {
    label: "Investments",
    href: "/investments",
    icon: TrendingUp,
  },
  {
    label: "Taxes",
    href: "/taxes",
    icon: FileText,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Receipts",
    href: "/receipts",
    icon: Receipt,
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: Landmark,
  },
  {
    label: "Credit Cards",
    href: "/credit-cards",
    icon: CreditCard,
  },
  {
    label: "Loans",
    href: "/loans",
    icon: Landmark,
  },
  {
    label: "Bank Sync",
    href: "/settings/bank-sync",
    icon: Link2,
  },
  {
    label: "Calendar Sync",
    href: "/settings/calendar",
    icon: Calendar,
  },
  {
    label: "Net Worth",
    href: "/settings/net-worth",
    icon: Trophy,
  },
  {
    label: "Cash Flow",
    href: "/settings/cash-flow",
    icon: DollarSign,
  },
  {
    label: "Spending Insights",
    href: "/settings/spending-insights",
    icon: Target,
  },
  {
    label: "Anomaly Detection",
    href: "/settings/anomaly-detection",
    icon: AlertTriangle,
  },
  {
    label: "Smart Categorization",
    href: "/settings/smart-categorization",
    icon: Sparkles,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  notificationStats?: NotificationStats;
}

export function Sidebar({ user, notificationStats }: SidebarProps) {
  // Default stats if not provided
  const stats: NotificationStats = notificationStats || {
    total: 0,
    unread: 0,
    unreadActionRequired: 0,
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <Icon className={cn("w-5 h-5", active ? "text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <div className="lg:hidden fixed top-4 left-4 z-50">
            <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-md"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </SheetTrigger>

        <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-gray-950">
          {/* Mobile Sidebar Content */}
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200 dark:border-gray-800">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Finance Hub</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <NavLinks onClose={() => setMobileOpen(false)} />
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <Separator className="mb-4" />
              <div className="flex items-center gap-3 mb-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <NotificationBell stats={stats} />
                <ThemeToggle />
              </div>
              <SheetClose asChild>
                <Link
                  to="/auth/logout"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Link>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Finance Hub</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <NavLinks />
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Separator className="mb-4" />
          <div className="flex items-center gap-3 mb-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.email}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
            <NotificationBell stats={stats} />
            <ThemeToggle />
          </div>
          <Link
            to="/auth/logout"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
