/**
 * New Goal Route
 *
 * Create a new financial goal.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, redirect, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { goalsCrud } from "~/lib/db/financial-goals.server";
import { getCategories } from "~/lib/db/categories.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { GoalForm } from "~/components/goals";
import type { CreateGoalInput } from "~/lib/db/financial-goals.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const categories = await getCategories(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    categories,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();

  const data: CreateGoalInput = {
    name: formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    targetAmount: parseFloat(formData.get("targetAmount") as string),
    currentAmount: formData.get("currentAmount")
      ? parseFloat(formData.get("currentAmount") as string)
      : 0,
    goalType: formData.get("goalType") as "savings" | "debt_payoff" | "expense_limit",
    targetDate: formData.get("targetDate") as string || null,
    priority: formData.get("priority") ? parseInt(formData.get("priority") as string) : 5,
    categoryId: formData.get("categoryId") as string || null,
    autoTrack: formData.get("autoTrack") === "true",
  };

  await goalsCrud.createGoal(db, user.id, data);

  return redirect("/goals");
}

export default function NewGoalPage() {
  const { user, categories } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Financial Goal</h1>
            <p className="mt-2 text-gray-600">
              Set a target to save for, pay off debt, or limit spending
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <GoalForm categories={categories} />
          </div>
        </div>
      </main>
    </div>
  );
}
