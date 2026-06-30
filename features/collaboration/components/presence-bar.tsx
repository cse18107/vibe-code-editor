"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function PersonAvatar({
  name,
  color,
  file,
  you,
}: {
  name?: string;
  color?: string;
  file?: string | null;
  you?: boolean;
}) {
  const label = name || "User";
  const initials = label.slice(0, 1).toUpperCase();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-background -ml-1.5 first:ml-0"
          style={{ backgroundColor: color || "#6b7280" }}
        >
          {initials}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">
            {label}
            {you ? " (you)" : ""}
          </div>
          <div className="text-muted-foreground">
            {file ? `Editing ${file.split("/").pop()}` : "Idle"}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Stacked avatars of everyone in the room, with their current file in a tooltip. */
export function PresenceBar() {
  const others = useOthers();
  const self = useSelf();

  if (!self && others.length === 0) return null;

  return (
    <div className="flex items-center pl-1.5">
      {self && (
        <PersonAvatar
          name={self.info?.name}
          color={self.info?.color}
          file={self.presence?.file}
          you
        />
      )}
      {others.map((other) => (
        <PersonAvatar
          key={other.connectionId}
          name={other.info?.name}
          color={other.info?.color}
          file={other.presence?.file}
        />
      ))}
    </div>
  );
}
