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
      { path: "credit-cards", file: "routes/credit-cards._index.tsx" },
      { path: "credit-cards/:id", file: "routes/credit-cards.$id.tsx" },
      { path: "loans", file: "routes/loans._index.tsx" },
      { path: "loans/:id", file: "routes/loans.$id.tsx" },
      { path: "import/csv", file: "routes/import.csv.tsx" },
      { path: "import/receipt", file: "routes/import.receipt.tsx" },
      { path: "receipts", file: "routes/receipts._index.tsx" },
      { path: "settings/bank-sync", file: "routes/settings.bank-sync.tsx" },
      { path: "reports/generate", file: "routes/reports.generate.tsx" },
      { path: "reports/history", file: "routes/reports.history.tsx" },
    ],
  },
] satisfies RouteConfig;
