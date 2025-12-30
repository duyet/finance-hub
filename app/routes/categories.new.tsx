/**
 * New Category Page
 *
 * Dedicated page for creating a new category
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect, useLoaderData, useNavigate, useNavigation, Form, useFetcher } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { useToast } from "~/components/ui/use-toast";
import { getDb } from "~/lib/auth/db.server";
import { categoriesCrud } from "~/lib/db/categories.server";
import type { CreateCategoryInput } from "~/lib/db/categories.types";
import { CategoryForm } from "~/components/categories/CategoryForm";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get parent options for both income and expense categories
  const [incomeParents, expenseParents] = await Promise.all([
    categoriesCrud.getParentOptions(db, user.id, "INCOME"),
    categoriesCrud.getParentOptions(db, user.id, "EXPENSE"),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    parentOptions: {
      INCOME: incomeParents,
      EXPENSE: expenseParents,
    },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();

  const data: CreateCategoryInput = {
    name: formData.get("name") as string,
    type: formData.get("type") as "INCOME" | "EXPENSE",
    parentId: (formData.get("parentId") as string) || null,
    budgetLimit: formData.get("budgetLimit")
      ? parseFloat(formData.get("budgetLimit") as string)
      : undefined,
    colorTheme: (formData.get("colorTheme") as string) || null,
    icon: (formData.get("icon") as string) || null,
  };

  // Validate required fields
  if (!data.name?.trim()) {
    return { success: false, error: "Category name is required" };
  }
  if (!data.type) {
    return { success: false, error: "Category type is required" };
  }

  try {
    await categoriesCrud.createCategory(db, user.id, data);
    return redirect("/categories");
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create category" };
  }
}

export default function NewCategoryPage() {
  const { parentOptions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const { toast } = useToast();
  const isSubmitting = navigation.state === "submitting" || fetcher.state === "submitting";

  const handleSubmit = () => {
    toast({ title: "Creating category..." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/categories")}
                className="text-gray-600 hover:text-indigo-600"
                aria-label="Back to categories"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">New Category</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create New Category</h2>
          <p className="mt-2 text-gray-600">
            Set up a new income or expense category with optional budget tracking
          </p>
        </div>

        <Form method="post" onSubmit={handleSubmit}>
          <CategoryForm
            onSubmit={(data) => {
              // Form submission will be handled by the Form component
              const _form = document.querySelector("form") as HTMLFormElement;
              const formData = new FormData();

              Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  formData.append(key, String(value));
                }
              });

              // Submit using fetcher
              fetcher.submit(formData, { method: "post" });
            }}
            onCancel={() => navigate("/categories")}
            parentOptions={[...parentOptions.INCOME, ...parentOptions.EXPENSE]}
            isLoading={isSubmitting}
            mode="create"
          />
        </Form>
      </main>
    </div>
  );
}
