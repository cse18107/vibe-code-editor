"use server";

import { signIn } from "@/auth";

/**
 * Start the GitHub OAuth flow to connect (or re-connect) the user's GitHub
 * account with repo scope. Returns the user to the dashboard afterward.
 */
export async function connectGithub() {
  await signIn("github", { redirectTo: "/dashboard" });
}
