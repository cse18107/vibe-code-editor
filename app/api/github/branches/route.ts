import { type NextRequest } from "next/server";
import { getGithubAccessToken, listRepoBranches } from "@/lib/github";

export async function GET(request: NextRequest) {
  const token = await getGithubAccessToken();
  if (!token) {
    return Response.json(
      { error: "GitHub not connected", connected: false },
      { status: 401 }
    );
  }

  const repo = request.nextUrl.searchParams.get("repo"); // "owner/name"
  if (!repo) {
    return Response.json({ error: "Missing repo parameter" }, { status: 400 });
  }

  try {
    const branches = await listRepoBranches(token, repo);
    return Response.json({ branches });
  } catch (error) {
    console.error("GitHub branches error:", error);
    return Response.json(
      { error: "Failed to fetch branches" },
      { status: 502 }
    );
  }
}
