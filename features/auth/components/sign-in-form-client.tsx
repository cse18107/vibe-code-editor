import React from "react";
import { Button } from "@/components/ui/button";
import { Chrome, Github } from "lucide-react";
import { signIn } from "@/auth";

async function handleGoogleSignIn() {
  "use server";
  await signIn("google");
}

async function handleGithubSignIn() {
  "use server";
  await signIn("github");
}

const SignInFormClient = () => {
  return (
    <div className="space-y-3">
      <form action={handleGoogleSignIn}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full justify-center rounded-lg"
        >
          <Chrome className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
      </form>

      <form action={handleGithubSignIn}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full justify-center rounded-lg"
        >
          <Github className="mr-2 h-4 w-4" />
          Continue with GitHub
        </Button>
      </form>

      <p className="pt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
};

export default SignInFormClient;
