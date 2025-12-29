/**
 * Edit Goal Route
 *
 * View and edit an existing financial goal.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, redirect, Form, useNavigate } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { goalsCrud } from "~/lib/db/financial-goals.server";
import { getCategories } from "~/lib/db/categories.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { GoalForm, GoalCard } from "~/components/goals";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { UpdateGoalInput } from "~/lib/db/financial-goals.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const [goal, categories] = await Promise.all([
    goalsCrud.getGoalById(db, params.id!, user.id),
    getCategories(db, user.id),
  ]);

  if (!goal) {
    throw new Response("Goal not found", { status: 404 });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    goal,
    categories,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    await goalsCrud.deleteGoal(db, params.id!, user.id);
    return redirect("/goals");
  }

  if (intent === "pause") {
    await goalsCrud.updateGoal(db, params.id!, user.id, { status: "paused" });
    return redirect(`/goals/${params.id}`);
  }

  if (intent === "resume") {
    await goalsCrud.updateGoal(db, params.id!, user.id, { status: "active" });
    return redirect(`/goals/${params.id}`);
  }

  if (intent === "update") {
    const data: UpdateGoalInput = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      currentAmount: formData.get("currentAmount")
        ? parseFloat(formData.get("currentAmount") as string)
        : undefined,
      goalType: formData.get("goalType") as "savings" | "debt_payoff" | "expense_limit",
      targetDate: formData.get("targetDate") as string || null,
      priority: formData.get("priority") ? parseInt(formData.get("priority") as string) : undefined,
      categoryId: formData.get("categoryId") as string || null,
      autoTrack: formData.get("autoTrack") === "true",
      status: formData.get("status") as "active" | "completed" | "paused" | "cancelled" | undefined,
    };

    await goalsCrud.updateGoal(db, params.id!, user.id, data);
    return redirect(`/goals/${params.id}`);
  }

  return null;
}

export default function EditGoalPage() {
  const { user, goal, categories } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Edit Goal</h1>
            <p className="mt-2 text-gray-600">{goal.name}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Goal Details</h2>
              <GoalForm goal={goal} categories={categories} />
            </div>

            {/* Preview */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
              <GoalCard goal={goal} />

              {/* Danger Zone */}
              {goal.status !== "completed" && (
                <div className="mt-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3">
                    Danger Zone
                  </h3>
                  <Form method="post" onSubmit={(e) => {
                    if (!confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
                      e.preventDefault();
                    }
                  }}>
                    <input type="hidden" name="intent" value="delete" />
                    <Button type="submit" variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Goal
                    </Button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
