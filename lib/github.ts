import { db } from "@/lib/db";
import { currentUser } from "@/features/auth/actions";

const GITHUB_API = "https://api.github.com";

/**
 * Get the logged-in user's stored GitHub access token (from the linked GitHub
 * account). Returns null if the user hasn't connected GitHub.
 */
export async function getGithubAccessToken(): Promise<string | null> {
  const user = await currentUser();
  if (!user?.id) return null;

  const account = await db.account.findFirst({
    where: { userId: user.id, provider: "github" },
  });

  return account?.accessToken ?? null;
}

/** Thrown when the user has no GitHub connection. */
export class GithubNotConnectedError extends Error {
  constructor() {
    super("GitHub account not connected");
    this.name = "GithubNotConnectedError";
  }
}

/** Authenticated fetch against the GitHub REST API. */
export async function githubFetch(
  token: string,
  path: string,
  init?: RequestInit
) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  owner: string;
  description: string | null;
  updatedAt: string;
}

/** List repositories the user owns or can write to, most-recently-updated first. */
export async function listUserRepos(token: string): Promise<GithubRepo[]> {
  const res = await githubFetch(
    token,
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
  );
  if (!res.ok) {
    throw new Error(`GitHub repos request failed: ${res.status}`);
  }
  const repos = (await res.json()) as any[];
  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    owner: r.owner?.login,
    description: r.description,
    updatedAt: r.updated_at,
  }));
}

/** List branch names for a repo (owner/name). */
export async function listRepoBranches(
  token: string,
  fullName: string
): Promise<string[]> {
  const res = await githubFetch(
    token,
    `/repos/${fullName}/branches?per_page=100`
  );
  if (!res.ok) {
    throw new Error(`GitHub branches request failed: ${res.status}`);
  }
  const branches = (await res.json()) as any[];
  return branches.map((b) => b.name);
}
