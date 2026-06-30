import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/features/auth/actions";

// Starts a dedicated GitHub OAuth flow to obtain a repo-scoped token for the
// currently logged-in user. This is separate from NextAuth login, so it doesn't
// touch account linking / sessions.
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const clientId = process.env.AUTH_GITHUB_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/dashboard?github=misconfigured", request.url)
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/github/callback`;
  const state = crypto.randomUUID();

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo read:user user:email");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
