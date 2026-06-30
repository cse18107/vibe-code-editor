import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Github, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Sparkles,
    title: "AI autocomplete",
    desc: "Context-aware completion and an in-editor assistant — powered by OpenAI, Gemini, or local models.",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    desc: "Invite your team and edit together live, with shared cursors, presence, and instant sync.",
  },
  {
    icon: Github,
    title: "Import from GitHub",
    desc: "Connect your account, pick a repo and branch, and start editing in seconds.",
  },
  {
    icon: Zap,
    title: "Instant preview",
    desc: "Run frontend and backend projects in the browser with WebContainers. No setup.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-28 text-center sm:pt-36">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Now with real-time collaboration
        </div>

        <h1
          className="mx-auto max-w-4xl text-balance text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl md:text-7xl"
          style={{ lineHeight: 1.05 }}
        >
          The web IDE for vibe coders
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-zinc-600 dark:text-zinc-400">
          Write, run, and ship code straight from your browser. AI assistance,
          instant previews, GitHub import, and live collaboration — with zero
          setup.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-11 rounded-full bg-zinc-900 px-6 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start coding
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-full px-6"
            >
              <Github className="mr-1.5 h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white p-7 transition-colors hover:bg-zinc-50 dark:bg-black dark:hover:bg-zinc-950"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
