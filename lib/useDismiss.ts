"use client";
import { useEffect, type RefObject } from "react";
/** Close a popover on Escape or on a pointer press outside `ref` (Notion: one popover at a time, Escape/click-away closes). */
export function useDismiss(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const down = (e: PointerEvent) => { const el = ref.current; if (el && !el.contains(e.target as Node)) onClose(); };
    document.addEventListener("keydown", key, true); document.addEventListener("pointerdown", down, true);
    return () => { document.removeEventListener("keydown", key, true); document.removeEventListener("pointerdown", down, true); };
  }, [ref, onClose, active]);
}
