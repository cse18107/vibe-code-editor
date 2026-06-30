import SignInFormClient from "@/features/auth/components/sign-in-form-client";
import { Logo } from "@/components/logo";
import Link from "next/link";
import React from "react";

const SignInPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <span className="text-lg font-semibold tracking-tight">VibeCode</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to continue to your workspace
          </p>
        </div>
        <SignInFormClient />
      </div>
    </div>
  );
};

export default SignInPage;
