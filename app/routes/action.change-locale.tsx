import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { handleLocaleChange } from "../lib/i18n/request";

/**
 * Action handler for changing locale
 *
 * Expects a form POST with "locale" field set to "en" or "vi"
 * Sets a cookie and redirects back to the referring page
 *
 * @example
 * ```tsx
 * <Form method="post" action="/action/change-locale">
 *   <select name="locale">
 *     <option value="en">English</option>
 *     <option value="vi">Tiếng Việt</option>
 *   </select>
 *   <button type="submit">Change Language</button>
 * </Form>
 * ```
 */
export async function action({ request }: ActionFunctionArgs) {
  const { locale, cookieHeader } = await handleLocaleChange(request);

  // Get the referring URL to redirect back
  const referer = request.headers.get("Referer");
  const url = referer ? new URL(referer) : new URL(request.url);

  // Create redirect response with locale cookie
  return redirect(url.pathname + url.search, {
    headers: {
      "Set-Cookie": cookieHeader,
    },
  });
}

/**
 * Redirect GET requests to avoid direct access
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const referer = request.headers.get("Referer");
  const redirectTo = referer ? new URL(referer).pathname : "/";

  return redirect(redirectTo);
}
