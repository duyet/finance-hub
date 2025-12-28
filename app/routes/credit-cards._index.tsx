/**
 * Credit Cards List Page
 *
 * Displays all credit cards with current balance, utilization, and payment status.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useNavigate, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { getCardsWithCycleInfo, creditCardDb } from "~/lib/db/credit-cards.server";
import { CreditCardGrid } from "~/components/credit-cards/CreditCardGrid";
import { CreditCardForm, type CreditCardFormData } from "~/components/credit-cards/CreditCardForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useState } from "react";
import { useI18n } from "~/lib/i18n/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  const cards = await getCardsWithCycleInfo(request, user.id);

  return ({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    cards,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const data: CreditCardFormData = {
      name: formData.get("name") as string,
      institution_name: formData.get("institution_name") as string,
      account_number_last4: formData.get("account_number_last4") as string,
      currency: formData.get("currency") as string,
      statement_day: parseInt(formData.get("statement_day") as string),
      payment_due_day_offset: parseInt(formData.get("payment_due_day_offset") as string),
      credit_limit: parseFloat(formData.get("credit_limit") as string),
      apr: formData.get("apr") ? parseFloat(formData.get("apr") as string) : undefined,
      annual_fee: formData.get("annual_fee") ? parseFloat(formData.get("annual_fee") as string) : 0,
      color_theme: formData.get("color_theme") as string,
    };

    await creditCardDb.create(db, user.id, data);
    return redirect("/credit-cards");
  }

  if (intent === "delete") {
    const cardId = formData.get("cardId") as string;
    await creditCardDb.archive(db, cardId, user.id);
    return redirect("/credit-cards");
  }

  return ({ success: false });
}

export default function CreditCardsIndexPage() {
  const { cards } = useLoaderData<typeof loader>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-indigo-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{t("creditCards.title")}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{t("creditCards.myCards")}</h2>
          <p className="mt-2 text-gray-600">{t("creditCards.description")}</p>
        </div>

        {/* Credit Cards Grid */}
        <CreditCardGrid cards={cards} onAddCard={() => setIsAddDialogOpen(true)} />

        {/* Add Card Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("creditCards.addCard")}</DialogTitle>
            </DialogHeader>
            <Form method="post" onSubmit={() => setIsAddDialogOpen(false)}>
              <input type="hidden" name="intent" value="create" />
              <CreditCardForm
                onSubmit={(data) => {
                  // Form submission will be handled by the Form component
                  const form = document.querySelector("form") as HTMLFormElement;
                  const formData = new FormData(form);

                  Object.entries(data).forEach(([key, value]) => {
                    formData.append(key, String(value));
                  });

                  form.submit();
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
