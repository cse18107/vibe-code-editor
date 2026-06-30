"use client";

import { ReactNode } from "react";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

/**
 * Wraps the playground in a Liveblocks room (one room per playground).
 * Access is authorized server-side by /api/liveblocks-auth.
 */
export function CollabRoom({
  playgroundId,
  children,
}: {
  playgroundId: string;
  children: ReactNode;
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={`playground:${playgroundId}`}
        initialPresence={{ file: null }}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
