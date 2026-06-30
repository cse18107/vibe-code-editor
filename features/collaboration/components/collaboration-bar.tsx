"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AtSign, Check, X, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  getMyUsername,
  setUsername as setUsernameAction,
  listMyInvitations,
  respondInvitation,
} from "@/features/collaboration/actions";

interface Invitation {
  id: string;
  playground: { id: string; title: string };
  inviter: { name: string | null; username: string | null; image: string | null };
}

export function CollaborationBar() {
  const router = useRouter();
  const [username, setUsernameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [u, inv] = await Promise.all([getMyUsername(), listMyInvitations()]);
    setUsernameState(u);
    setInvitations(inv as Invitation[]);
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveUsername = async () => {
    setSaving(true);
    const res = await setUsernameAction(draft);
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Username set");
      setUsernameState(res.username ?? draft);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    const res = await respondInvitation(id, accept);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    toast.success(accept ? "Invitation accepted" : "Invitation declined");
    if (accept) router.refresh();
  };

  if (!loaded) return null;

  return (
    <div className="w-full space-y-3 mb-2">
      {/* Username setup prompt */}
      {!username && (
        <div className="rounded-lg border bg-muted/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AtSign className="h-4 w-4 text-muted-foreground" />
            <span>
              Pick a username so others can invite you to collaborate.
            </span>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveUsername()}
              placeholder="username"
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={saveUsername} disabled={saving || !draft.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Pending invitations
          </div>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate">
                <strong>{inv.inviter.name || inv.inviter.username || "Someone"}</strong>{" "}
                invited you to <strong>{inv.playground.title}</strong>
              </span>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => respond(inv.id, true)}
                >
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => respond(inv.id, false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
