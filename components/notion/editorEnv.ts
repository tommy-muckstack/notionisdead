"use client";
import { createContext, useContext } from "react";
import type { Block } from "@/lib/notion/blocks";
export type PageRef = { id: string; title: string; icon: string };
/** What the editor needs from the workspace around it (pages for mentions/links, the current user, sub-page creation…). */
export type EditorEnv = {
  resolve: (title: string) => string | null;
  onPage: (id: string) => void;
  pages: PageRef[];
  me: string;
  /** Page block: create a sub-page of the page being edited; returns its id (null = unsupported here). */
  createSubpage?: (title: string) => PageRef | null;
  /** Block menu "Move to": append the block to another page. */
  moveBlockToPage?: (b: Block, pageId: string) => void;
  /** ArrowUp on the first block / Backspace on an empty first block. */
  onFocusTitle?: () => void;
  /** Toolbar / block menu "Comment" (wired by the comments feature). */
  onComment?: (blockId: string) => void;
  /** Open comment threads per block id (badge) and how to show them. */
  comments?: Record<string, number>; onShowComments?: (blockId: string) => void;
  notify?: (msg: string) => void;
  /** Locked page: render everything, edit nothing. */
  readOnly?: boolean;
};
export const EditorCtx = createContext<EditorEnv>({ resolve: () => null, onPage: () => {}, pages: [], me: "You" });
export const useEnv = () => useContext(EditorCtx);
