/**
 * Theme Provider
 *
 * Provides theme context with dark mode support.
 * Handles localStorage persistence and system preference detection.
 */

 
 
 
 

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 * Get the system theme preference
 */
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply theme to document
 */
function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "finance-hub-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => {
    // Initialize effective theme on mount
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem(storageKey) as Theme | null;
    if (stored) {
      if (stored === "system") {
        return getSystemTheme();
      }
      return stored;
    }
    return getSystemTheme();
  });

  // Update effective theme when theme changes
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      const systemTheme = getSystemTheme();
      setEffectiveTheme(systemTheme);
      applyTheme(systemTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light";
        setEffectiveTheme(newTheme);
        applyTheme(newTheme);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      setEffectiveTheme(theme);
      applyTheme(theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
