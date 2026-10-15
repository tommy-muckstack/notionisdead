"use client";
import { useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { COLORS, MENU_GROUPS, TURN_INTO, filterMenu, labelOf, type Block, type BlockType, type Color, type MenuItem } from "@/lib/notion/blocks";
import { useEnv, type PageRef } from "./editorEnv";

export const GLYPH: Partial<Record<BlockType, string>> = { p: "Aa", h1: "H1", h2: "H2", h3: "H3", h4: "H4", bullet: "•", number: "1.", todo: "☑", toggle: "▸", quote: "❝", code: "</>", callout: "💡", table: "▦", board: "▥", divider: "—", page: "📄", link: "↗", image: "🖼", video: "▶", audio: "♪", file: "📎", bookmark: "🔖", columns: "▯▯", equation: "∑", toc: "☰" };

/** Grouped like Notion: Basic blocks, Media, Database, Advanced blocks (headers only for groups that still have matches). */
export function SlashMenu({ q, index, onPick, onHover }: { q: string; index: number; onPick: (m: MenuItem) => void; onHover: (i: number) => void }) {
  const items = filterMenu(q); let n = -1;
  return <div className="ntn-slash" role="listbox" aria-label="Insert block" data-testid="slash-menu">
    {items.length ? MENU_GROUPS.map(g => { const gi = items.filter(m => m.group === g); if (!gi.length) return null;
      return <div key={g} className="ntn-slash__group"><div className="ntn-slash__h">{q.trim() ? (g === "Basic blocks" ? "Suggested" : g) : g}</div>
        {gi.map(m => { n++; const k = n; return <button key={m.group + m.label} role="option" aria-selected={k === index} className={k === index ? "on" : ""} onMouseEnter={() => onHover(k)} onMouseDown={e => { e.preventDefault(); onPick(m); }}>
          <span className="ntn-slash__glyph">{GLYPH[m.type] ?? "—"}</span><span><b>{m.label}</b><small>{m.hint}</small></span></button>; })}</div>; })
      : <div className="ntn-slash__none">No results</div>}
  </div>;
}

export type MentionItem = { kind: "person" | "page" | "date"; label: string; value: string; icon: string };
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function mentionItems(q: string, pages: PageRef[], me: string): MentionItem[] {
  const s = q.trim().toLowerCase(); const out: MentionItem[] = [];
  if (!s || me.toLowerCase().includes(s)) out.push({ kind: "person", label: me, value: me, icon: me[0]?.toUpperCase() ?? "?" });
  for (const p of pages.filter(p => !s || (p.title || "Untitled").toLowerCase().includes(s)).slice(0, 6)) out.push({ kind: "page", label: p.title || "Untitled", value: p.title || "Untitled", icon: p.icon });
  const today = new Date(), tom = new Date(today.getTime() + 864e5), yes = new Date(today.getTime() - 864e5);
  const dates: [string, Date][] = [["Today", today], ["Tomorrow", tom], ["Yesterday", yes]];
  for (const [l, d] of dates) if (!s || l.toLowerCase().startsWith(s)) out.push({ kind: "date", label: l, value: iso(d), icon: "📅" });
  const typed = s ? new Date(q.trim()) : null; if (typed && !isNaN(+typed) && /\d/.test(s)) out.push({ kind: "date", label: typed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), value: iso(typed), icon: "📅" });
  return out;
}
export function MentionMenu({ q, index, onPick, onHover }: { q: string; index: number; onPick: (m: MentionItem) => void; onHover: (i: number) => void }) {
  const env = useEnv(); const items = mentionItems(q, env.pages, env.me); const groups: [string, MentionItem["kind"]][] = [["People", "person"], ["Pages", "page"], ["Dates", "date"]]; let n = -1;
  return <div className="ntn-slash ntn-mention" role="listbox" aria-label="Mention" data-testid="mention-menu">
    {items.length ? groups.map(([h, k]) => { const gi = items.filter(i => i.kind === k); if (!gi.length) return null;
      return <div key={h} className="ntn-slash__group"><div className="ntn-slash__h">{h}</div>{gi.map(m => { n++; const i = n; return <button key={k + m.value} role="option" aria-selected={i === index} className={i === index ? "on" : ""} onMouseEnter={() => onHover(i)} onMouseDown={e => { e.preventDefault(); onPick(m); }}>
        <span className={"ntn-slash__glyph" + (k === "person" ? " av" : "")}>{m.icon}</span><span><b>{m.label}</b>{k === "date" && <small>{m.value}</small>}</span></button>; })}</div>; })
      : <div className="ntn-slash__none">No results</div>}
  </div>;
}

/** Block handle menu: Turn into, Color, Copy link to block, Duplicate, Move to, Comment, Delete. Escape / click-away closes. */
export function BlockMenu({ block, onClose, onTurnInto, onColor, onDuplicate, onDelete, onMove, onComment }: {
  block: Block; onClose: () => void; onTurnInto: (t: BlockType) => void; onColor: (c: Color | null, bg: boolean) => void; onDuplicate: () => void; onDelete: () => void; onMove: (pageId: string) => void; onComment?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null); useDismiss(ref, onClose); const env = useEnv();
  const [sub, setSub] = useState<"turn" | "color" | "move" | null>(null); const [q, setQ] = useState("");
  const copy = () => { const u = new URL(location.href); u.hash = block.id; navigator.clipboard?.writeText(u.toString()); env.notify?.("Copied link to block"); onClose(); };
  const textual = !["divider", "table", "board", "columns", "toc", "image", "video", "audio", "file", "bookmark", "page", "link", "equation"].includes(block.type);
  return <div ref={ref} className="ntn-menu ntn-bmenu" role="menu" data-testid="block-menu" onKeyDown={e => e.key === "Escape" && onClose()}>
    <div className="ntn-bmenu__col">
      {textual && <button role="menuitem" aria-haspopup="menu" aria-expanded={sub === "turn"} className={sub === "turn" ? "on" : ""} onMouseEnter={() => setSub("turn")} onClick={() => setSub("turn")}><span>↻ Turn into</span><i>{labelOf(block.type)} ›</i></button>}
      {textual && <button role="menuitem" aria-haspopup="menu" aria-expanded={sub === "color"} className={sub === "color" ? "on" : ""} onMouseEnter={() => setSub("color")} onClick={() => setSub("color")}><span>◐ Color</span><i>{block.bg ? `${block.bg} background` : block.color ?? "Default"} ›</i></button>}
      <button role="menuitem" onMouseEnter={() => setSub(null)} onClick={copy}><span>🔗︎ Copy link to block</span></button>
      <button role="menuitem" onMouseEnter={() => setSub(null)} onClick={() => { onDuplicate(); onClose(); }}><span>⧉ Duplicate</span><i>⌘D</i></button>
      <button role="menuitem" aria-haspopup="menu" aria-expanded={sub === "move"} className={sub === "move" ? "on" : ""} onMouseEnter={() => setSub("move")} onClick={() => setSub("move")}><span>→ Move to</span><i>›</i></button>
      {onComment && <button role="menuitem" onMouseEnter={() => setSub(null)} onClick={() => { onComment(); onClose(); }}><span>💬 Comment</span><i>⌘⇧M</i></button>}
      <div className="ntn-menu__sep" /><button role="menuitem" className="is-danger" onMouseEnter={() => setSub(null)} onClick={() => { onDelete(); onClose(); }}><span>🗑 Delete</span><i>Del</i></button>
    </div>
    {sub === "turn" && <div className="ntn-bmenu__col ntn-submenu" role="menu" aria-label="Turn into">{TURN_INTO.map(t => <button key={t} role="menuitemradio" aria-checked={block.type === t} onClick={() => { onTurnInto(t); onClose(); }}><span><em className="ntn-slash__glyph">{GLYPH[t]}</em>{labelOf(t)}</span>{block.type === t && <i>✓</i>}</button>)}</div>}
    {sub === "color" && <div className="ntn-bmenu__col ntn-submenu" role="menu" aria-label="Color"><div className="ntn-slash__h">Color</div>
      <button role="menuitemradio" aria-checked={!block.color} onClick={() => { onColor(null, false); onClose(); }}><span><em aria-hidden className="ntn-sw">A</em>Default</span></button>
      {COLORS.map(c => <button key={c} role="menuitemradio" aria-checked={block.color === c} onClick={() => { onColor(c, false); onClose(); }}><span><em aria-hidden className="ntn-sw" style={{ color: `var(--nt-${c})` }}>A</em>{cap(c)}</span>{block.color === c && <i>✓</i>}</button>)}
      <div className="ntn-slash__h">Background</div>
      <button role="menuitemradio" aria-checked={!block.bg} onClick={() => { onColor(null, true); onClose(); }}><span><em aria-hidden className="ntn-sw">A</em>Default background</span></button>
      {COLORS.map(c => <button key={c} role="menuitemradio" aria-checked={block.bg === c} onClick={() => { onColor(c, true); onClose(); }}><span><em aria-hidden className="ntn-sw" style={{ background: `var(--nt-${c}-bg)` }}>A</em>{cap(c)} background</span>{block.bg === c && <i>✓</i>}</button>)}</div>}
    {sub === "move" && <div className="ntn-bmenu__col ntn-submenu" role="menu" aria-label="Move to"><input autoFocus className="ntn-bmenu__q" placeholder="Move to…" aria-label="Move to page" value={q} onChange={e => setQ(e.target.value)} />
      {env.pages.filter(p => !q || (p.title || "Untitled").toLowerCase().includes(q.toLowerCase())).slice(0, 12).map(p => <button key={p.id} role="menuitem" onClick={() => { onMove(p.id); onClose(); }}><span>{p.icon} {p.title || "Untitled"}</span></button>)}
      {!env.pages.length && <div className="ntn-slash__none">No other pages</div>}</div>}
  </div>;
}
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
