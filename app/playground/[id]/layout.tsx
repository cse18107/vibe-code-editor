"use client";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import React, { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 200;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 320;

/** Thin draggable bar sitting on the file explorer's right edge. */
function ResizeHandle({
  width,
  onStart,
}: {
  width: number;
  onStart: () => void;
}) {
  const { state, isMobile } = useSidebar();
  // Only show when the sidebar is expanded on desktop.
  if (isMobile || state !== "expanded") return null;

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      title="Drag to resize"
      className="fixed top-0 z-50 hidden h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 md:block"
      style={{ left: width - 3 }}
    />
  );
}

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  // Restore saved width.
  useEffect(() => {
    const saved = Number(localStorage.getItem("explorer-width"));
    if (saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
  }, []);

  const startDrag = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("explorer-width", String(width));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${width}px`,
        } as React.CSSProperties
      }
    >
      {children}
      <ResizeHandle width={width} onStart={startDrag} />
    </SidebarProvider>
  );
}
