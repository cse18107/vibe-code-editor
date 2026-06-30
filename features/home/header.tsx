import Link from "next/link";
import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Logo } from "@/components/logo";
import UserButton from "../auth/components/user-button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/70 bg-white/70 backdrop-blur-md dark:border-zinc-800/70 dark:bg-black/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">
            VibeCode
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-8 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Dashboard
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            GitHub
          </a>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
