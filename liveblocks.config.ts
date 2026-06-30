// Liveblocks type augmentation for presence + user metadata.
// (No runtime imports here, so this file is safe before packages are installed.)

declare global {
  interface Liveblocks {
    // Per-user live presence shared with the room.
    Presence: {
      // Which file the user currently has open (relative path), or null.
      file: string | null;
    };
    // Static info attached at auth time (from /api/liveblocks-auth).
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar?: string;
      };
    };
  }
}

export {};
