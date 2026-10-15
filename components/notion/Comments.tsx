"use client";
import { useEffect, useRef, useState } from "react";
import { mentionText, plainText, type Block } from "@/lib/notion/blocks";
import type { Page, Thread } from "@/lib/notion/pages";
import { InlineText } from "./Editor";
import { MentionMenu, mentionItems, type MentionItem } from "./menus";
import { useEnv } from "./editorEnv";

const ago = (iso: string) => { const d = (Date.now() - +new Date(iso)) / 1000; if (d < 60) return "just now"; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`; if (d < 7 * 86400) return `${Math.floor(d / 86400)}d ago`; return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
export const Avatar = ({ name }: { name: string }) => <span className="ns-av" aria-hidden>{(name || "?")[0].toUpperCase()}</span>;

/** Comment composer with @ mentions (people, pages, dates). Enter sends, Shift+Enter breaks a line, Escape cancels. */
export function CommentBox({ placeholder = "Add a comment…", autoFocus, onSend, onCancel, initial = "" }: { placeholder?: string; autoFocus?: boolean; onSend: (text: string) => void; onCancel?: () => void; initial?: string }) {
  const env = useEnv(); const [v, setV] = useState(initial); const [m, setM] = useState<{ at: number; q: string; i: number } | null>(null); const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const change = (text: string, caret: number) => { setV(text); const h = text.slice(0, caret).match(/(?:^|[\s(])@([\w ]{0,24})$/); setM(h ? { at: caret - h[0].length + (h[0].startsWith("@") ? 0 : 1), q: h[1], i: 0 } : null); };
  const pick = (it: MentionItem) => { if (!m) return; const tok = mentionText(it.kind, it.value); const caret = m.at + 1 + m.q.length; const text = v.slice(0, m.at) + tok + " " + v.slice(caret); setV(text); setM(null); requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(m.at + tok.length + 1, m.at + tok.length + 1); } }); };
  const send = () => { const t = v.trim(); if (!t) return; onSend(t); setV(""); setM(null); };
  return <div className="ntn-cbox" data-testid="comment-box">
    <textarea ref={ref} rows={1} aria-label="Comment" placeholder={placeholder} value={v} onChange={e => change(e.target.value, e.target.selectionStart)} onKeyDown={e => {
      if (m) { const items = mentionItems(m.q, env.pages, env.me); if (e.key === "ArrowDown") { e.preventDefault(); setM({ ...m, i: Math.min(m.i + 1, items.length - 1) }); return; } if (e.key === "ArrowUp") { e.preventDefault(); setM({ ...m, i: Math.max(0, m.i - 1) }); return; } if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (items[m.i]) pick(items[m.i]); return; } if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setM(null); return; } }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } else if (e.key === "Escape") { e.stopPropagation(); onCancel?.(); } }} />
    {m && <MentionMenu q={m.q} index={m.i} onPick={pick} onHover={i => setM({ ...m, i })} />}
    <div className="ntn-cbox__acts">{onCancel && <button type="button" onClick={onCancel}>Cancel</button>}<button type="button" className="go" disabled={!v.trim()} aria-label="Send comment" onClick={send}>↑</button></div>
  </div>;
}

export type ThreadActions = { reply: (threadId: string, text: string) => void; resolve: (threadId: string, resolved: boolean) => void; remove: (threadId: string) => void; edit: (threadId: string, commentId: string, text: string) => void };
export function ThreadView({ t, page, acts, focus, onJump }: { t: Thread; page: Page; acts: ThreadActions; focus?: boolean; onJump?: (blockId: string) => void }) {
  const env = useEnv(); const [editing, setEditing] = useState<string | null>(null); const block: Block | undefined = t.blockId ? page.blocks.find(b => b.id === t.blockId) : undefined; const [replying, setReplying] = useState(false);
  return <article className={"ntn-thread" + (t.resolved ? " is-resolved" : "") + (focus ? " is-focus" : "")} data-testid="thread" data-resolved={t.resolved}>
    {t.blockId && <button type="button" className="ntn-thread__ctx" onClick={() => onJump?.(t.blockId!)} title="Go to block">{block ? plainText(block).slice(0, 80) || `(${block.type})` : "(block was removed)"}</button>}
    {t.messages.map(m => <div key={m.id} className="ntn-cmt"><Avatar name={m.author} /><div><div className="ntn-cmt__h"><b>{m.author}</b><small>{ago(m.at)}</small>
      {m.author === env.me && <span className="ntn-cmt__acts"><button type="button" aria-label="Edit comment" onClick={() => setEditing(editing === m.id ? null : m.id)}>✎</button></span>}</div>
      {editing === m.id ? <CommentBox initial={m.text} autoFocus placeholder="Edit…" onSend={txt => { acts.edit(t.id, m.id, txt); setEditing(null); }} onCancel={() => setEditing(null)} /> : <p><InlineText text={m.text} resolve={env.resolve} onPage={env.onPage} /></p>}</div></div>)}
    <div className="ntn-thread__ft">
      {replying ? <CommentBox autoFocus placeholder="Reply…" onSend={txt => { acts.reply(t.id, txt); setReplying(false); }} onCancel={() => setReplying(false)} /> : <button type="button" className="lnk" onClick={() => setReplying(true)}>Reply</button>}
      <span className="sp" />
      {t.resolved ? <button type="button" aria-label="Reopen thread" title="Reopen" onClick={() => acts.resolve(t.id, false)}>↩ Reopen</button> : <button type="button" aria-label="Resolve thread" title="Resolve" onClick={() => acts.resolve(t.id, true)}>✓</button>}
      <button type="button" aria-label="Delete thread" title="Delete" onClick={() => acts.remove(t.id)}>🗑</button>
    </div>
  </article>;
}

/** Right-hand comments pane: Open / Resolved filter, every thread on the page, newest first. */
export function CommentsPane({ page, acts, onClose, onAdd, focusThread, draftBlock, onCancelDraft, onJump }: { page: Page; acts: ThreadActions; onClose: () => void; onAdd: (blockId: string | null, text: string) => void; focusThread?: string | null; draftBlock?: string | null; onCancelDraft: () => void; onJump: (blockId: string) => void }) {
  const [tab, setTab] = useState<"open" | "resolved">("open"); const threads = [...(page.threads ?? [])].reverse().filter(t => (tab === "open" ? !t.resolved : t.resolved)); const draft = draftBlock ? page.blocks.find(b => b.id === draftBlock) : undefined;
  useEffect(() => { if (focusThread) { const t = (page.threads ?? []).find(x => x.id === focusThread); if (t?.resolved) setTab("resolved"); document.getElementById("th-" + focusThread)?.scrollIntoView({ block: "center" }); } }, [focusThread]); // eslint-disable-line
  return <aside className="ntn-cpane" aria-label="Comments" data-testid="comments-pane">
    <header><b>Comments</b><div className="tabs"><button type="button" className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>Open</button><button type="button" className={tab === "resolved" ? "on" : ""} onClick={() => setTab("resolved")}>Resolved</button></div><button type="button" className="x" aria-label="Close comments" onClick={onClose}>✕</button></header>
    <div className="body">
      {draftBlock !== undefined && draftBlock !== null && <div className="ntn-thread is-draft" data-testid="comment-draft"><div className="ntn-thread__ctx">{draft ? plainText(draft).slice(0, 80) || `(${draft.type})` : ""}</div><CommentBox autoFocus onSend={t => onAdd(draftBlock, t)} onCancel={onCancelDraft} /></div>}
      {threads.map(t => <div key={t.id} id={"th-" + t.id}><ThreadView t={t} page={page} acts={acts} focus={focusThread === t.id} onJump={onJump} /></div>)}
      {!threads.length && draftBlock == null && <p className="ntn-cpane__empty">{tab === "open" ? "No open comments. Select text, or hover a block and press ⌘⇧M, to start one." : "No resolved comments."}</p>}
    </div>
  </aside>;
}
