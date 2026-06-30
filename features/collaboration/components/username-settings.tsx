"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { AtSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getMyUsername,
  setUsername as setUsernameAction,
} from "@/features/collaboration/actions";

export function UsernameSettings() {
  const [open, setOpen] = useState(false);
  const [username, setUsernameState] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setLoading(true);
      const u = await getMyUsername();
      setUsernameState(u || "");
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const res = await setUsernameAction(username);
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Username saved");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <SidebarMenuButton tooltip="Account">
          <AtSign className="h-4 w-4" />
          <span>Account</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your username</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Collaborators use your username to invite you to projects.
        </p>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-md border bg-background px-2 focus-within:ring-1 focus-within:ring-ring">
            <span className="text-sm text-muted-foreground">@</span>
            <input
              value={username}
              onChange={(e) => setUsernameState(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="username"
              disabled={loading}
              className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
            />
          </div>
          <Button
            onClick={save}
            disabled={saving || loading || !username.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          3–20 characters: letters, numbers, or underscore.
        </p>
      </DialogContent>
    </Dialog>
  );
}
