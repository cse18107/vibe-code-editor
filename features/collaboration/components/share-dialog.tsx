"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Loader2, X, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  listMembers,
  inviteByUsername,
  removeMember,
} from "@/features/collaboration/actions";

interface Member {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
}
interface Owner {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

export function ShareDialog({ playgroundId }: { playgroundId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listMembers(playgroundId);
    if ("error" in res) {
      toast.error(res.error);
    } else {
      setIsOwner(res.isOwner);
      setOwner(res.owner);
      setMembers(res.members);
    }
    setLoading(false);
  }, [playgroundId]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) load();
  };

  const handleInvite = async () => {
    if (!username.trim()) return;
    setInviting(true);
    const res = await inviteByUsername(playgroundId, username.trim());
    setInviting(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Invitation sent to ${username.trim()}`);
      setUsername("");
    }
  };

  const handleRemove = async (userId: string, label: string) => {
    const res = await removeMember(playgroundId, userId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Removed ${label}`);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    }
  };

  const initials = (m: { name: string | null; username: string | null }) =>
    (m.name || m.username || "?").slice(0, 1).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="h-4 w-4 mr-1" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share & collaborate</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="Invite by username…"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <Button onClick={handleInvite} disabled={inviting || !username.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            People with access (max 5)
          </p>

          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {owner && (
                <div className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={owner.image} fallback={initials(owner)} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {owner.name || owner.username}
                      </div>
                      {owner.username && (
                        <div className="text-xs text-muted-foreground truncate">
                          @{owner.username}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-amber-500">
                    <Crown className="h-3.5 w-3.5" /> Owner
                  </span>
                </div>
              )}

              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.image} fallback={initials(m)} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.name || m.username}
                      </div>
                      {m.username && (
                        <div className="text-xs text-muted-foreground truncate">
                          @{m.username}
                        </div>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        handleRemove(m.id, m.name || m.username || "user")
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  No collaborators yet.{" "}
                  {isOwner && "Invite someone by their username above."}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Avatar({
  src,
  fallback,
}: {
  src: string | null;
  fallback: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className="h-7 w-7 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
      {fallback}
    </div>
  );
}
