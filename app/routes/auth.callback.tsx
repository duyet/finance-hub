import type { LoaderFunctionArgs } from "react-router";
import { parseCookies } from "oslo/cookie";
import {
  validateGitHubCallback,
  validateGoogleCallback,
  getOrCreateGitHubUser,
  getOrCreateGoogleUser,
} from "../lib/auth/auth.server";
import { createSession } from "../lib/auth/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const provider = params.provider;
  const url = new URL(request.url);

  if (provider !== "github" && provider !== "google") {
    throw new Response("Invalid OAuth provider", { status: 400 });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    throw new Response("Missing required OAuth parameters", { status: 400 });
  }

  try {
    // Get the stored state from cookies
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const stateCookieName = `${provider}_oauth_state`;
    const savedState = cookies.get(stateCookieName);

    if (!savedState) {
      throw new Response("Invalid state: Missing state cookie", { status: 400 });
    }

    if (state !== savedState) {
      throw new Response("Invalid state: CSRF token mismatch", { status: 400 });
    }

    // Clear the state cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `${stateCookieName}=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
    );

    // Validate OAuth callback and get user data
    let user;
    if (provider === "github") {
      const githubUser = await validateGitHubCallback(code, state, savedState);
      user = await getOrCreateGitHubUser(request, githubUser);
    } else {
      // Google needs codeVerifier
      const codeVerifierCookieName = "google_oauth_code_verifier";
      const codeVerifier = cookies.get(codeVerifierCookieName);

      if (!codeVerifier) {
        throw new Response("Invalid state: Missing code verifier", { status: 400 });
      }

      const googleUser = await validateGoogleCallback(code, codeVerifier, state, savedState);
      user = await getOrCreateGoogleUser(request, googleUser);

      // Clear code verifier cookie
      headers.append(
        "Set-Cookie",
        `${codeVerifierCookieName}=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
      );
    }

    // Create session
    const { headers: sessionHeaders } = await createSession(request, user.id);

    // Merge headers
    sessionHeaders.forEach((value, key) => {
      headers.append(key, value);
    });

    // Get redirect URL from cookies or use default
    const redirectCookie = cookies.get("oauth_redirect");
    const redirectUrl = redirectCookie
      ? decodeURIComponent(redirectCookie)
      : "/dashboard";

    // Clear redirect cookie
    headers.append(
      "Set-Cookie",
      `oauth_redirect=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
    );

    // Redirect to the original destination or dashboard
    const response = Response.redirect(new URL(redirectUrl, url.origin), 302);
    // Copy headers to the response
    headers.forEach((value, key) => {
      response.headers.append(key, value);
    });
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);

    // Redirect to login with error
    const errorUrl = new URL("/auth/login", url.origin);
    errorUrl.searchParams.set("error", "oauth_failed");

    return Response.redirect(errorUrl, 302);
  }
}

export default function OAuthCallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
