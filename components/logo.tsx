import { cn } from "@/lib/utils";

/**
 * Minimal VibeCode mark: a rounded square with a `>_` terminal prompt.
 * Themeable — the square uses the foreground color, the prompt the background,
 * so it looks crisp in both light and dark mode.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-zinc-900 dark:fill-white"
      />
      <path
        d="M11 10.5 L16.5 16 L11 21.5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-white dark:stroke-zinc-900"
      />
      <path
        d="M18.5 21.5 H23.5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-white dark:stroke-zinc-900"
      />
    </svg>
  );
}
