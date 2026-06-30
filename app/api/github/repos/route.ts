import { getGithubAccessToken, listUserRepos } from "@/lib/github";

export async function GET() {
  const token = await getGithubAccessToken();
  if (!token) {
    return Response.json(
      { error: "GitHub not connected", connected: false },
      { status: 401 }
    );
  }

  try {
    const repos = await listUserRepos(token);
    return Response.json({ connected: true, repos });
  } catch (error) {
    console.error("GitHub repos error:", error);
    return Response.json(
      { error: "Failed to fetch repositories" },
      { status: 502 }
    );
  }
}
