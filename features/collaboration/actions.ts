"use server";

import { currentUser } from "@/features/auth/actions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Total people allowed in a room, INCLUDING the owner.
const MAX_COLLABORATORS = 5;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/** Set/claim a unique username for the current user. */
export async function setUsername(rawUsername: string) {
  const user = await currentUser();
  if (!user?.id) return { error: "Not authenticated" };

  const username = rawUsername.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return {
      error: "Username must be 3–20 characters: letters, numbers, or underscore.",
    };
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing && existing.id !== user.id) {
    return { error: "That username is already taken." };
  }

  await db.user.update({ where: { id: user.id }, data: { username } });
  revalidatePath("/dashboard");
  return { success: true, username };
}

export async function getMyUsername() {
  const user = await currentUser();
  if (!user?.id) return null;
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  return dbUser?.username ?? null;
}

/** Owner invites a user (by username) to collaborate. */
export async function inviteByUsername(playgroundId: string, rawUsername: string) {
  const user = await currentUser();
  if (!user?.id) return { error: "Not authenticated" };

  const playground = await db.playground.findUnique({ where: { id: playgroundId } });
  if (!playground) return { error: "Playground not found" };
  if (playground.userId !== user.id) {
    return { error: "Only the owner can invite collaborators." };
  }

  const username = rawUsername.trim().toLowerCase();
  const invitee = await db.user.findUnique({ where: { username } });
  if (!invitee) return { error: `No user found with username “${username}”.` };
  if (invitee.id === user.id) return { error: "You can't invite yourself." };

  const existingMember = await db.playgroundMember.findUnique({
    where: { playgroundId_userId: { playgroundId, userId: invitee.id } },
  });
  if (existingMember) return { error: "That user is already a collaborator." };

  // Capacity: owner + current members must stay under the cap.
  const memberCount = await db.playgroundMember.count({ where: { playgroundId } });
  if (memberCount + 1 >= MAX_COLLABORATORS) {
    return {
      error: `This project already has the maximum of ${MAX_COLLABORATORS} collaborators.`,
    };
  }

  const existingInvite = await db.invitation.findUnique({
    where: { playgroundId_inviteeId: { playgroundId, inviteeId: invitee.id } },
  });
  if (existingInvite) {
    if (existingInvite.status === "PENDING") {
      return { error: "An invitation is already pending for that user." };
    }
    await db.invitation.update({
      where: { id: existingInvite.id },
      data: { status: "PENDING", inviterId: user.id },
    });
    return { success: true };
  }

  await db.invitation.create({
    data: { playgroundId, inviterId: user.id, inviteeId: invitee.id },
  });
  return { success: true };
}

/** Pending invitations for the current user. */
export async function listMyInvitations() {
  const user = await currentUser();
  if (!user?.id) return [];
  return db.invitation.findMany({
    where: { inviteeId: user.id, status: "PENDING" },
    include: {
      playground: { select: { id: true, title: true } },
      inviter: { select: { name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function respondInvitation(invitationId: string, accept: boolean) {
  const user = await currentUser();
  if (!user?.id) return { error: "Not authenticated" };

  const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.inviteeId !== user.id) {
    return { error: "Invitation not found." };
  }
  if (invitation.status !== "PENDING") {
    return { error: "This invitation was already handled." };
  }

  if (accept) {
    const memberCount = await db.playgroundMember.count({
      where: { playgroundId: invitation.playgroundId },
    });
    if (memberCount + 1 >= MAX_COLLABORATORS) {
      return { error: "This project is already full." };
    }
    await db.playgroundMember.create({
      data: {
        playgroundId: invitation.playgroundId,
        userId: user.id,
        role: "EDITOR",
      },
    });
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    });
  } else {
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: "DECLINED" },
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/** Owner + collaborators of a playground (for the Share dialog). */
export async function listMembers(playgroundId: string) {
  const user = await currentUser();
  if (!user?.id) return { error: "Not authenticated" as const };

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
  });
  if (!playground) return { error: "Not found" as const };

  const isOwner = playground.userId === user.id;
  const membership = await db.playgroundMember.findUnique({
    where: { playgroundId_userId: { playgroundId, userId: user.id } },
  });
  if (!isOwner && !membership) return { error: "No access" as const };

  const members = await db.playgroundMember.findMany({
    where: { playgroundId },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    isOwner,
    owner: playground.user,
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      image: m.user.image,
      role: m.role,
    })),
  };
}

export async function removeMember(playgroundId: string, userId: string) {
  const user = await currentUser();
  if (!user?.id) return { error: "Not authenticated" };

  const playground = await db.playground.findUnique({ where: { id: playgroundId } });
  if (!playground) return { error: "Not found" };
  if (playground.userId !== user.id) {
    return { error: "Only the owner can remove collaborators." };
  }

  await db.playgroundMember.deleteMany({ where: { playgroundId, userId } });
  await db.invitation.deleteMany({ where: { playgroundId, inviteeId: userId } });
  revalidatePath("/dashboard");
  return { success: true };
}

/** Playgrounds the current user collaborates on (does not own). */
export async function getSharedPlaygrounds() {
  const user = await currentUser();
  if (!user?.id) return [];
  const memberships = await db.playgroundMember.findMany({
    where: { userId: user.id },
    include: {
      playground: {
        include: {
          user: true,
          Starmark: { where: { userId: user.id }, select: { isMarked: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => m.playground);
}

/** True if the current user owns or collaborates on the playground. */
export async function hasPlaygroundAccess(playgroundId: string) {
  const user = await currentUser();
  if (!user?.id) return false;
  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    select: { userId: true },
  });
  if (!playground) return false;
  if (playground.userId === user.id) return true;
  const membership = await db.playgroundMember.findUnique({
    where: { playgroundId_userId: { playgroundId, userId: user.id } },
  });
  return !!membership;
}
