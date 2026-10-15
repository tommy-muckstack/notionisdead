"use client";
import { useRef } from "react";
import { useDismiss } from "@/lib/useDismiss";
/** Trigger + popover wrapper: Escape or a pointer press outside closes it; pressing the trigger again toggles (QA #16). */
export function Popwrap({ open, onClose, className, children }: { open: boolean; onClose: () => void; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); useDismiss(ref, onClose, open);
  return <div ref={ref} className={"ntn-popwrap" + (className ? " " + className : "")}>{children}</div>;
}
