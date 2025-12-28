import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { Form, redirect, useNavigate } from "react-router";
import { validateSession } from "../lib/auth/session.server";
import { invalidateSession } from "../lib/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await validateSession(request);

  if (!session) {
    // Not logged in, redirect to login
    return redirect("/auth/login");
  }

  return { user: session.user };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await validateSession(request);

  if (!session) {
    // Not logged in, just redirect to login
    return redirect("/auth/login");
  }

  // Invalidate the session
  const headers = await invalidateSession(request, session.sessionId);

  // Redirect to home with headers to clear cookie
  const url = new URL(request.url);
  const redirectUrl = new URL("/", url.origin);

  const response = Response.redirect(redirectUrl, 302);
  headers.forEach((value, key) => {
    response.headers.append(key, value);
  });
  return response;
}

export default function LogoutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign Out
            </h1>
            <p className="text-gray-600">
              Are you sure you want to sign out of your account?
            </p>
          </div>

          <div className="space-y-4">
            <Form method="post">
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Yes, Sign Out
              </button>
            </Form>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
