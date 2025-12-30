import { type RouteConfig } from "@react-router/dev/routes";

export default [
  {
    file: "root.tsx",
    id: "app-root",
    children: [
      { index: true, file: "routes/_index.tsx" },
      { path: "auth/login", file: "routes/auth.login.tsx" },
      { path: "auth/callback/:provider", file: "routes/auth.callback.tsx" },
      { path: "auth/logout", file: "routes/auth.logout.tsx" },
      { path: "dashboard", file: "routes/dashboard._index.tsx" },
      { path: "transactions", file: "routes/transactions._index.tsx" },
      { path: "transactions/:id", file: "routes/transactions.$id.tsx" },
      { path: "accounts", file: "routes/accounts._index.tsx" },
      { path: "accounts/:id", file: "routes/accounts.$id.tsx" },
      { path: "accounts/new", file: "routes/accounts.new.tsx" },
      { path: "categories", file: "routes/categories._index.tsx" },
      { path: "categories/new", file: "routes/categories.new.tsx" },
      { path: "import/csv", file: "routes/import.csv.tsx" },
      { path: "action.import-csv", file: "routes/action.import-csv.ts" },
      { path: "api/ai/insights", file: "routes/api.ai.insights.ts" },
    ],
  },
] satisfies RouteConfig;
