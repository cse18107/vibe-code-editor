import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default{
    providers:[
        GitHub({
            clientId:process.env.AUTH_GITHUB_ID,
            clientSecret:process.env.AUTH_GITHUB_SECRET,
            // 'repo' grants read/write to repositories (needed to list, import,
            // and push). 'read:user'/'user:email' for profile + email.
            authorization: {
                params: { scope: "read:user user:email repo" },
            },
            // Link GitHub to an existing account with the same (verified) email,
            // so a Google user can connect GitHub for repo access.
            allowDangerousEmailAccountLinking: true,
        }),
        Google({
            clientId:process.env.AUTH_GOOGLE_ID,
            clientSecret:process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        })
    ]
} satisfies NextAuthConfig