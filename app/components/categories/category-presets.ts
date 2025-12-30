/**
 * Category Presets
 *
 * Shared constants for category form components
 * Extracted to avoid duplication across multiple form components
 */

/**
 * Color themes for categories
 */
export const COLOR_THEMES = [
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "lime", label: "Lime", class: "bg-lime-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "brown", label: "Brown", class: "bg-amber-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
  { value: "slate", label: "Slate", class: "bg-slate-500" },
] as const;

/**
 * Color theme type
 */
export type ColorThemeValue = typeof COLOR_THEMES[number]["value"];

/**
 * Icon preset for common categories
 */
export interface IconPreset {
  icon: string;
  label: string;
  category: "income" | "expense";
}

/**
 * Icon presets for common categories (array format)
 */
export const ICON_PRESETS_ARRAY: IconPreset[] = [
  { icon: "💰", label: "Salary", category: "income" },
  { icon: "🎁", label: "Bonus", category: "income" },
  { icon: "📈", label: "Investment", category: "income" },
  { icon: "💼", label: "Freelance", category: "income" },
  { icon: "🎀", label: "Gift", category: "income" },
  { icon: "↩️", label: "Refund", category: "income" },
  { icon: "🍔", label: "Food", category: "expense" },
  { icon: "🛒", label: "Groceries", category: "expense" },
  { icon: "🍽️", label: "Restaurant", category: "expense" },
  { icon: "☕", label: "Coffee", category: "expense" },
  { icon: "🚗", label: "Transport", category: "expense" },
  { icon: "⛽", label: "Gas", category: "expense" },
  { icon: "🅿️", label: "Parking", category: "expense" },
  { icon: "🛍️", label: "Shopping", category: "expense" },
  { icon: "👕", label: "Clothing", category: "expense" },
  { icon: "📱", label: "Electronics", category: "expense" },
  { icon: "💡", label: "Utilities", category: "expense" },
  { icon: "🏠", label: "Rent", category: "expense" },
  { icon: "🛡️", label: "Insurance", category: "expense" },
  { icon: "🎬", label: "Entertainment", category: "expense" },
  { icon: "🎮", label: "Games", category: "expense" },
  { icon: "🎵", label: "Music", category: "expense" },
  { icon: "🏥", label: "Health", category: "expense" },
  { icon: "💊", label: "Pharmacy", category: "expense" },
  { icon: "📚", label: "Education", category: "expense" },
  { icon: "✈️", label: "Travel", category: "expense" },
  { icon: "🐕", label: "Pets", category: "expense" },
  { icon: "💪", label: "Fitness", category: "expense" },
];

/**
 * Icon presets for common categories (record format for backward compatibility)
 */
export const ICON_PRESETS: Record<string, Omit<IconPreset, "category">> = {
  salary: { icon: "💰", label: "Salary" },
  bonus: { icon: "🎁", label: "Bonus" },
  investment: { icon: "📈", label: "Investment" },
  freelance: { icon: "💼", label: "Freelance" },
  gift: { icon: "🎀", label: "Gift" },
  refund: { icon: "↩️", label: "Refund" },
  food: { icon: "🍔", label: "Food" },
  groceries: { icon: "🛒", label: "Groceries" },
  restaurant: { icon: "🍽️", label: "Restaurant" },
  coffee: { icon: "☕", label: "Coffee" },
  transport: { icon: "🚗", label: "Transport" },
  gas: { icon: "⛽", label: "Gas" },
  parking: { icon: "🅿️", label: "Parking" },
  shopping: { icon: "🛍️", label: "Shopping" },
  clothing: { icon: "👕", label: "Clothing" },
  electronics: { icon: "📱", label: "Electronics" },
  utilities: { icon: "💡", label: "Utilities" },
  rent: { icon: "🏠", label: "Rent" },
  insurance: { icon: "🛡️", label: "Insurance" },
  entertainment: { icon: "🎬", label: "Entertainment" },
  games: { icon: "🎮", label: "Games" },
  music: { icon: "🎵", label: "Music" },
  health: { icon: "🏥", label: "Health" },
  pharmacy: { icon: "💊", label: "Pharmacy" },
  education: { icon: "📚", label: "Education" },
  travel: { icon: "✈️", label: "Travel" },
  pets: { icon: "🐕", label: "Pets" },
  fitness: { icon: "💪", label: "Fitness" },
};
