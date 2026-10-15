"use client";
import { useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { COLORS, TURN_INTO, labelOf, type Block, type BlockType, type Color, type InlineStyle } from "@/lib/notion/blocks";
import { GLYPH, cap } from "./menus";

export type Sel = { id: string; a: number; b: number; x: number; y: number };
/** Floating formatting toolbar shown over a text selection: Turn into, B/I/U/S/code, link, color, comment. */
export function Toolbar({ sel, block, onStyle, onLink, onColor, onTurnInto, onComment, onClose }: {
  sel: Sel; block: Block; onStyle: (s: InlineStyle) => void; onLink: (href: string) => void; onColor: (c: Color | null, bg: boolean) => void; onTurnInto: (t: BlockType) => void; onComment?: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null); useDismiss(ref, onClose);
  const [sub, setSub] = useState<"turn" | "link" | "color" | null>(null); const [href, setHref] = useState("");
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  const B = ({ k, label, children, cls }: { k: InlineStyle; label: string; children: React.ReactNode; cls?: string }) => <button type="button" className={cls} aria-label={label} title={label} onMouseDown={stop} onClick={() => onStyle(k)}>{children}</button>;
  const textual = !["code", "equation"].includes(block.type);
  return <div ref={ref} className="ntn-tb" role="toolbar" aria-label="Format" data-testid="format-toolbar" style={{ left: sel.x, top: sel.y }} onMouseDown={e => e.stopPropagation()}>
    <div className="ntn-tb__row">
      {textual && <button type="button" className="ntn-tb__turn" aria-haspopup="menu" aria-expanded={sub === "turn"} onMouseDown={stop} onClick={() => setSub(s => s === "turn" ? null : "turn")}>{labelOf(block.type)} <i>⌄</i></button>}
      {textual && <span className="ntn-tb__sep" />}
      <B k="bold" label="Bold" cls="b"><b>B</b></B><B k="italic" label="Italic"><i>i</i></B><B k="underline" label="Underline"><u>U</u></B><B k="strike" label="Strikethrough"><s>S</s></B><B k="code" label="Code"><code>&lt;&gt;</code></B>
      <button type="button" aria-label="Link" title="Link ⌘K" aria-expanded={sub === "link"} onMouseDown={stop} onClick={() => setSub(s => s === "link" ? null : "link")}>🔗︎ Link</button>
      <span className="ntn-tb__sep" />
      <button type="button" aria-label="Text color" title="Text color" aria-haspopup="menu" aria-expanded={sub === "color"} onMouseDown={stop} onClick={() => setSub(s => s === "color" ? null : "color")}><span className="ntn-sw" style={block.color ? { color: `var(--nt-${block.color})` } : undefined}>A</span> <i>⌄</i></button>
      {onComment && <><span className="ntn-tb__sep" /><button type="button" aria-label="Comment" title="Comment ⌘⇧M" onMouseDown={stop} onClick={onComment}>💬 Comment</button></>}
    </div>
    {sub === "turn" && <div className="ntn-menu ntn-tb__menu" role="menu">{TURN_INTO.map(t => <button key={t} role="menuitemradio" aria-checked={block.type === t} onMouseDown={stop} onClick={() => onTurnInto(t)}><span><em className="ntn-slash__glyph">{GLYPH[t]}</em>{labelOf(t)}</span>{block.type === t && <i>✓</i>}</button>)}</div>}
    {sub === "link" && <form className="ntn-tb__link" onSubmit={e => { e.preventDefault(); if (href.trim()) onLink(/^https?:\/\//.test(href) ? href.trim() : `https://${href.trim()}`); }}>
      <input autoFocus aria-label="Link URL" placeholder="Paste link or search pages…" value={href} onChange={e => setHref(e.target.value)} onKeyDown={e => e.key === "Escape" && setSub(null)} /><button type="submit">Apply</button></form>}
    {sub === "color" && <div className="ntn-menu ntn-tb__menu" role="menu"><div className="ntn-slash__h">Color</div>
      <button role="menuitem" onMouseDown={stop} onClick={() => onColor(null, false)}><span><em aria-hidden className="ntn-sw">A</em>Default</span></button>
      {COLORS.map(c => <button key={c} role="menuitem" onMouseDown={stop} onClick={() => onColor(c, false)}><span><em aria-hidden className="ntn-sw" style={{ color: `var(--nt-${c})` }}>A</em>{cap(c)}</span></button>)}
      <div className="ntn-slash__h">Background</div>
      {COLORS.map(c => <button key={c} role="menuitem" onMouseDown={stop} onClick={() => onColor(c, true)}><span><em aria-hidden className="ntn-sw" style={{ background: `var(--nt-${c}-bg)` }}>A</em>{cap(c)} background</span></button>)}</div>}
  </div>;
}
