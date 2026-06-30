import { Liveblocks } from "@liveblocks/node";
import { currentUser } from "@/features/auth/actions";
import { hasPlaygroundAccess } from "@/features/collaboration/actions";
import { db } from "@/lib/db";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Deterministic color per user id (for cursor/avatar coloring).
function colorFromId(id: string): string {
  const palette = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { room } = await request.json();
  if (typeof room !== "string" || !room.startsWith("playground:")) {
    return new Response("Bad request", { status: 400 });
  }

  const playgroundId = room.slice("playground:".length);

  // Only owners/collaborators may join the room.
  const allowed = await hasPlaygroundAccess(playgroundId);
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  // Prefer the collaboration username for cursor labels.
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const displayName =
    dbUser?.username || user.name || user.email || "User";

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: displayName,
      color: colorFromId(user.id),
      avatar: user.image || undefined,
    },
  });
  session.allow(room, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
