import { cn } from "~/lib/utils";

/**
 * Category badge props
 */
interface CategoryBadgeProps {
  name: string;
  type?: "INCOME" | "EXPENSE" | null;
  color?: string | null;
  icon?: string | null;
  className?: string;
}

/**
 * Default color themes for categories
 */
const defaultColors = {
  INCOME: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  EXPENSE: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
};

/**
 * Map color names to Tailwind classes
 */
const colorMap: Record<string, string> = {
  red: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
  green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  lime: "bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  brown: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
  slate: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
};

/**
 * Icon map for common categories
 */
const iconMap: Record<string, string> = {
  // Income
  salary: "💰",
  bonus: "🎁",
  investment: "📈",
  freelance: "💼",
  gift: "🎀",
  refund: "↩️",

  // Expenses - Food
  food: "🍔",
  groceries: "🛒",
  restaurant: "🍽️",
  coffee: "☕",

  // Expenses - Transport
  transport: "🚗",
  gas: "⛽",
  parking: "🅿️",
  public_transport: "🚇",

  // Expenses - Shopping
  shopping: "🛍️",
  clothing: "👕",
  electronics: "📱",

  // Expenses - Bills
  utilities: "💡",
  rent: "🏠",
  insurance: "🛡️",

  // Expenses - Entertainment
  entertainment: "🎬",
  games: "🎮",
  music: "🎵",

  // Expenses - Health
  health: "🏥",
  pharmacy: "💊",

  // Expenses - Other
  education: "📚",
  travel: "✈️",
  pets: "🐕",
  fitness: "💪",
};

/**
 * Category badge component
 * Displays category with color, icon, and type indicator
 */
export function CategoryBadge({
  name,
  type,
  color,
  icon,
  className,
}: CategoryBadgeProps) {
  // Determine badge color
  let colorClass = defaultColors.EXPENSE;
  if (color && colorMap[color]) {
    colorClass = colorMap[color];
  } else if (type) {
    colorClass = defaultColors[type];
  }

  // Determine icon
  const categoryIcon = icon || iconMap[name.toLowerCase()] || "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
        colorClass,
        className
      )}
    >
      {categoryIcon && <span className="text-sm">{categoryIcon}</span>}
      <span>{name}</span>
    </span>
  );
}

/**
 * Mini category badge for table cells
 */
interface CategoryBadgeMiniProps {
  name: string | null;
  type?: "INCOME" | "EXPENSE" | null;
  color?: string | null;
}

export function CategoryBadgeMini({
  name,
  type,
  color,
}: CategoryBadgeMiniProps) {
  if (!name) {
    return (
      <span className="text-muted-foreground text-sm italic">Uncategorized</span>
    );
  }

  let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
  if (color && colorMap[color]) {
    colorClass = colorMap[color].replace("text-", "text-").replace("bg-", "bg-");
  } else if (type) {
    colorClass = type === "INCOME"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-orange-50 text-orange-700 border-orange-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        colorClass
      )}
    >
      {name}
    </span>
  );
}
