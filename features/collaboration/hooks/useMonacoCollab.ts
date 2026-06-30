"use client";

import { useEffect, useRef } from "react";
import { useRoom, useUpdateMyPresence, useSelf } from "@liveblocks/react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";

/**
 * Binds the active file's Monaco model to a shared Yjs text (live editing) and
 * renders other people's cursors with their username + color.
 *
 * `y-monaco` pulls in `monaco-editor`, which references `window` at import time,
 * so it must NOT be imported during SSR. We dynamically import it inside the
 * effect (client-only).
 */
export function useMonacoCollab(editor: unknown, filePath: string | null) {
  const room = useRoom();
  const self = useSelf();
  const updateMyPresence = useUpdateMyPresence();

  const selfRef = useRef(self);
  selfRef.current = self;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = editor as any;
    if (!ed || !filePath || !room) return;
    const model = ed.getModel?.();
    if (!model) return;

    let cancelled = false;
    let binding: { destroy: () => void } | null = null;
    let styleEl: HTMLStyleElement | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let awareness: any = null;
    let onAwarenessChange: (() => void) | null = null;

    (async () => {
      const { MonacoBinding } = await import("y-monaco");
      if (cancelled) return;

      const yProvider = getYjsProviderForRoom(room);
      const yDoc = yProvider.getYDoc();
      const yText = yDoc.getText(`file:${filePath}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      awareness = (yProvider as any).awareness;

      const seedAndBind = () => {
        if (cancelled) return;
        if (yText.length === 0) {
          const local = model.getValue();
          if (local) yText.insert(0, local);
        }
        binding = new MonacoBinding(yText, model, new Set([ed]), awareness);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyProvider = yProvider as any;
      if (anyProvider.synced) seedAndBind();
      else if (typeof anyProvider.once === "function")
        anyProvider.once("synced", seedAndBind);
      else seedAndBind();

      // Publish identity for cursor labels.
      const info = selfRef.current?.info;
      if (info) {
        awareness.setLocalStateField("user", {
          name: info.name,
          color: info.color,
        });
      }

      // Inject per-collaborator cursor color + name label CSS.
      styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      onAwarenessChange = () => {
        const localId = yDoc.clientID;
        let css = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        awareness.getStates().forEach((state: any, clientId: number) => {
          if (clientId === localId) return;
          const u = state?.user;
          if (!u) return;
          const color: string = u.color || "#6b7280";
          const name: string = String(u.name || "User")
            .replace(/'/g, "")
            .slice(0, 24);
          css += `
            .yRemoteSelection-${clientId} { background-color: ${color}33; }
            .yRemoteSelectionHead-${clientId} {
              position: relative;
              border-left: 2px solid ${color};
              box-sizing: border-box;
            }
            .yRemoteSelectionHead-${clientId}::after {
              content: '${name}';
              position: absolute;
              top: -1.4em;
              left: -2px;
              background: ${color};
              color: #fff;
              font-size: 11px;
              line-height: 1.4;
              padding: 0 4px;
              border-radius: 3px;
              white-space: nowrap;
              z-index: 20;
              pointer-events: none;
            }
          `;
        });
        if (styleEl) styleEl.textContent = css;
      };

      onAwarenessChange();
      awareness.on("change", onAwarenessChange);

      updateMyPresence({ file: filePath });
    })();

    return () => {
      cancelled = true;
      if (awareness && onAwarenessChange) {
        awareness.off("change", onAwarenessChange);
      }
      styleEl?.remove();
      binding?.destroy();
    };
  }, [editor, filePath, room, updateMyPresence]);
}
