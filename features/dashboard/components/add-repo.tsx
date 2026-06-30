"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Github, Loader2, Lock, Search } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  owner: string;
  description: string | null;
}

const AddRepo = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.status === 401) {
        setConnected(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load repos");
      setConnected(true);
      setRepos(data.repos || []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // reset + load when opening
      setSelectedRepo(null);
      setBranches([]);
      setBranch("");
      setQuery("");
      loadRepos();
    }
  };

  const selectRepo = async (repo: Repo) => {
    setSelectedRepo(repo);
    setBranches([]);
    setBranch("");
    try {
      const res = await fetch(
        `/api/github/branches?repo=${encodeURIComponent(repo.fullName)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load branches");
      setBranches(data.branches || []);
      setBranch(repo.defaultBranch || data.branches?.[0] || "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleImport = async () => {
    if (!selectedRepo || !branch) return;
    setImporting(true);
    try {
      const res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo.fullName, branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      toast.success("Repository imported");
      setOpen(false);
      router.push(`/playground/${data.playgroundId}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="group flex cursor-pointer flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
          <div className="flex flex-row items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:group-hover:bg-white dark:group-hover:text-zinc-900">
              <Github size={20} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold tracking-tight">
                Open GitHub Repository
              </h2>
              <p className="mt-0.5 max-w-[220px] text-sm text-zinc-500 dark:text-zinc-400">
                Work with your repositories in our editor
              </p>
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" /> Import a GitHub Repository
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        )}

        {/* Not connected */}
        {!loading && connected === false && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Github className="h-10 w-10" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Connect your GitHub account to browse and import your repositories.
            </p>
            <Button
              onClick={() => {
                window.location.href = "/api/github/connect";
              }}
            >
              <Github className="h-4 w-4 mr-2" /> Connect GitHub
            </Button>
          </div>
        )}

        {/* Connected: repo list */}
        {!loading && connected && !selectedRepo && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories…"
                className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y rounded-md border">
              {filtered.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  No repositories found.
                </p>
              )}
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => selectRepo(repo)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{repo.fullName}</span>
                      {repo.private && (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Repo selected: branch + import */}
        {!loading && connected && selectedRepo && (
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Repository: </span>
              <span className="font-medium">{selectedRepo.fullName}</span>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {branches.length === 0 && <option value="">Loading…</option>}
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedRepo(null)}
                disabled={importing}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={!branch || importing}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddRepo;
