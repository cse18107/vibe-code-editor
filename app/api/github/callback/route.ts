import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/features/auth/actions";
import { db } from "@/lib/db";

// Handles the GitHub OAuth redirect: exchanges the code for an access token and
// attaches it to the current user (upserting the GitHub account record).
export async function GET(request: NextRequest) {
  const dashboard = new URL("/dashboard", request.url);

  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("gh_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    dashboard.searchParams.set("github", "error");
    return NextResponse.redirect(dashboard);
  }

  try {
    // 1) Exchange the code for an access token.
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.AUTH_GITHUB_ID,
          client_secret: process.env.AUTH_GITHUB_SECRET,
          code,
          redirect_uri: `${request.nextUrl.origin}/api/github/callback`,
        }),
      }
    );
    const tokenData = await tokenRes.json();
    const accessToken: string | undefined = tokenData.access_token;
    if (!accessToken) {
      dashboard.searchParams.set("github", "error");
      return NextResponse.redirect(dashboard);
    }

    // 2) Identify the GitHub account (for the unique providerAccountId).
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const ghUser = await ghUserRes.json();
    const providerAccountId = String(ghUser.id);

    // 3) Attach the token to the current user (reassigning if a stale record
    //    exists for this GitHub account).
    await db.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "github",
          providerAccountId,
        },
      },
      update: {
        userId: user.id,
        accessToken,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        type: "oauth",
      },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "github",
        providerAccountId,
        accessToken,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
      },
    });

    dashboard.searchParams.set("github", "connected");
    const res = NextResponse.redirect(dashboard);
    res.cookies.delete("gh_oauth_state");
    return res;
  } catch (error) {
    console.error("GitHub connect callback error:", error);
    dashboard.searchParams.set("github", "error");
    return NextResponse.redirect(dashboard);
  }
}
