"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DatabaseBlock } from "./Database";
import { MediaBlock } from "./MediaBlock";
import { Toolbar, type Sel } from "./Toolbar";
import { BlockMenu, MentionMenu, SlashMenu, mentionItems, type MentionItem } from "./menus";
import { useEnv } from "./editorEnv";
import { MEDIA, WRAP, applyShortcut, cloneBlock, colorRange, filterMenu, fmtDate, headings, inlineTokens, isIsoDate, linkRange, markdownToBlocks, mentionText, mergeUp, mk, moveBlock, newDb, numbering, reorder, splitBlock, turnInto, wrapRange, type Block, type BlockType, type Color, type InlineStyle, type MenuItem } from "@/lib/notion/blocks";

/** Rendered inline markdown. Every token carries data-s (raw offset of its first displayed char) so selections map back to the source. */
export function InlineText({ text, resolve, onPage, placeholder }: { text: string; resolve: (title: string) => string | null; onPage: (id: string) => void; placeholder?: string }) {
  if (!text) return <span className="ntn-ph" data-s={0}>{placeholder || "​"}</span>;
  return <>{inlineTokens(text).map((t, i) => t.t === "bold" ? <strong key={i} data-s={t.s}>{t.text}</strong> : t.t === "italic" ? <em key={i} data-s={t.s}>{t.text}</em> : t.t === "strike" ? <s key={i} data-s={t.s}>{t.text}</s> : t.t === "underline" ? <u key={i} data-s={t.s}>{t.text}</u> : t.t === "code" ? <code key={i} data-s={t.s}>{t.text}</code>
    : t.t === "color" ? <span key={i} data-s={t.s} style={{ color: `var(--nt-${t.color})` }}>{t.text}</span> : t.t === "mark" ? <mark key={i} data-s={t.s} style={{ background: `var(--nt-${t.color}-bg)` }}>{t.text}</mark>
    : t.t === "link" ? <a key={i} data-s={t.s} href={t.href} target="_blank" rel="noreferrer noopener" onClick={e => e.stopPropagation()}>{t.text}</a>
    : t.t === "mention" ? <span key={i} data-s={t.s} className={"ntn-chip " + (isIsoDate(t.text) ? "is-date" : "is-person")}>{isIsoDate(t.text) ? `@${fmtDate(t.text)}` : `@${t.text}`}</span>
    : t.t === "page" ? (() => { const id = resolve(t.text); return <a key={i} data-s={t.s} href="#" className={"ntn-pagelink" + (id ? "" : " is-missing")} onClick={e => { e.preventDefault(); e.stopPropagation(); if (id) onPage(id); }}>{id ? "📄 " : ""}{t.text}</a>; })()
    : <span key={i} data-s={t.s}>{t.text}</span>)}</>;
}
/** DOM position inside a rendered view → raw text offset. */
function rawOffset(view: HTMLElement, node: Node, offset: number): number | null {
  if (!view.contains(node)) return null;
  const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest<HTMLElement>("[data-s]");
  if (!el) { if (node === view) { const kids = Array.from(view.querySelectorAll<HTMLElement>("[data-s]")); const k = kids[Math.min(offset, kids.length) - 1]; return k ? Number(k.dataset.s) + (k.textContent?.length ?? 0) : 0; } return null; }
  const s = Number(el.dataset.s); if (el.classList.contains("ntn-ph")) return 0;
  // chips display more than their raw text; clamp to the raw span
  const raw = el.textContent ?? ""; const shown = node.nodeType === Node.TEXT_NODE ? offset : raw.length; const extra = el.classList.contains("ntn-chip") || el.classList.contains("ntn-pagelink") ? raw.length - rawLen(el) : 0;
  return s + Math.max(0, Math.min(rawLen(el), shown - extra));
}
const rawLen = (el: HTMLElement) => { if (el.classList.contains("ntn-chip")) return (el.textContent ?? "").replace(/^@/, "").length; if (el.classList.contains("ntn-pagelink")) return (el.textContent ?? "").replace(/^📄 /, "").length; return (el.textContent ?? "").length; };

type Pending = { id: string; caret: number; end?: number } | null;
type Props = { blocks: Block[]; onChange: (b: Block[]) => void; autoFocusFirst?: boolean; focusFirst?: number; nested?: boolean; pageBlocks?: Block[]; hint?: string };
export function Editor({ blocks, onChange, autoFocusFirst, focusFirst = 0, nested, pageBlocks, hint }: Props) {
  const env = useEnv(); const { resolve, onPage } = env; const ro = !!env.readOnly;
  const [focus, setFocus] = useState<string | null>(null); const [pending, setPending] = useState<Pending>(null);
  const [slash, setSlash] = useState<{ id: string; at: number; q: string; i: number } | null>(null);
  const [mention, setMention] = useState<{ id: string; at: number; q: string; i: number } | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null); const [sel, setSel] = useState<Sel | null>(null);
  const [drag, setDrag] = useState<string | null>(null); const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const nums = useMemo(() => numbering(blocks), [blocks]); const refs = useRef(new Map<string, HTMLTextAreaElement | HTMLElement>()); const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (autoFocusFirst && blocks[0] && blocks.length === 1 && !blocks[0].text) setPending({ id: blocks[0].id, caret: 0 }); }, [autoFocusFirst]); // eslint-disable-line
  // Enter / ArrowDown in the page title → first block (create one if the page is empty)
  useLayoutEffect(() => { if (!focusFirst) return; const b = blocks[0]; if (b && !["divider", "table", "board", "columns", "toc", ...MEDIA].includes(b.type)) setPending({ id: b.id, caret: 0 }); else { const p = mk("p"); onChange([p, ...blocks]); setPending({ id: p.id, caret: 0 }); } }, [focusFirst]); // eslint-disable-line
  useLayoutEffect(() => { if (!pending) return; const el = refs.current.get(pending.id); if (!el) { if (focus !== pending.id) setFocus(pending.id); return; } (el as HTMLElement).focus(); if (el instanceof HTMLTextAreaElement) el.setSelectionRange(pending.caret, pending.end ?? pending.caret); setFocus(pending.id); setPending(null); });
  useEffect(() => { if (sel && !blocks.some(b => b.id === sel.id)) setSel(null); }, [blocks, sel]);

  const replace = useCallback((id: string, ...next: Block[]) => { const i = blocks.findIndex(b => b.id === id); onChange([...blocks.slice(0, i), ...next, ...blocks.slice(i + 1)]); }, [blocks, onChange]);
  const set = (id: string, patch: Partial<Block>) => onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  const idx = (id: string) => blocks.findIndex(b => b.id === id);
  const focusAt = (i: number, end: boolean) => { const b = blocks[i]; if (b) setPending({ id: b.id, caret: end ? b.text.length : 0 }); };
  const insertAfter = (i: number, ...ins: Block[]) => { onChange([...blocks.slice(0, i + 1), ...ins, ...blocks.slice(i + 1)]); const last = ins[ins.length - 1]; if (last) setPending({ id: last.id, caret: 0 }); };
  const remove = (id: string) => { const i = idx(id); onChange(blocks.length > 1 ? blocks.filter(x => x.id !== id) : [mk("p")]); if (i > 0) focusAt(i - 1, true); };

  const change = (b: Block, text: string, caret: number) => {
    const next = { ...b, text }; const sc = applyShortcut(next);
    if (sc && /^(#{1,4} |[-*+] |\d+\. |\[( |x)?\] |> |" |```\w*$|---$|\*\*\*$|\$\$$)/.test(text)) { replace(b.id, sc); setSlash(null); setMention(null); setPending({ id: b.id, caret: 0 }); return; }
    const head = text.slice(0, caret);
    { const m = (b.type as string) !== "code" && head.match(/(?:^|\s)\/([\w ]*)$/); if (m) setSlash(s => ({ id: b.id, at: caret - m[0].length + (m[0].startsWith("/") ? 0 : 1), q: m[1], i: s?.id === b.id && s.q === m[1] ? s.i : 0 })); else setSlash(null); }
    { const m = (b.type as string) !== "code" && head.match(/(?:^|[\s(])@([\w ]{0,24})$/); if (m) setMention(s => ({ id: b.id, at: caret - m[0].length + (m[0].startsWith("@") ? 0 : 1), q: m[1], i: s?.id === b.id && s.q === m[1] ? s.i : 0 })); else setMention(null); }
    setSel(null); onChange(blocks.map(x => x.id === b.id ? next : x));
  };
  /** Slash menu pick: an otherwise-empty block converts in place; a block with other text keeps it and gets the new block below. */
  const choose = (id: string, m: MenuItem) => {
    const b = blocks.find(x => x.id === id)!; const s = slash?.id === id ? slash : null; setSlash(null);
    const rest = s ? (b.text.slice(0, s.at) + b.text.slice(s.at + 1 + s.q.length)).replace(/\s+$/, "") : b.text; const i = idx(id); const type = m.type;
    const fresh = (t: BlockType): Block[] => t === "divider" ? [mk("divider"), mk("p")] : t === "table" || t === "board" ? [mk(t, "", { db: newDb() }), mk("p")]
      : t === "toggle" ? [mk("toggle", "", { open: true, kids: [mk("p")] })] : t === "columns" ? [mk("columns", "", { cols: [[mk("p")], [mk("p")]] }), mk("p")]
      : t === "toc" ? [mk("toc"), mk("p")] : t === "page" ? [mk("page", "Untitled")] : t === "link" ? [mk("link", "")] : MEDIA.includes(t) ? [mk(t, "")] : [mk(t, "", t === "todo" ? { checked: false } : {})];
    const ins = m.layout ? [mk(m.layout === "board" ? "board" : "table", "", { db: newDb(m.layout) }), mk("p")] : fresh(type);
    if (type === "page") { const ref = env.createSubpage?.("Untitled"); if (!ref) { env.notify?.("Sub-pages aren't available here."); return; } ins[0] = { ...ins[0], pageId: ref.id, text: ref.title || "Untitled" }; }
    const focusTarget = type === "toggle" ? ins[0] : ins[ins.length - 1];
    if (rest === "") { onChange([...blocks.slice(0, i), ...ins.map((x, k) => k === 0 ? { ...x, id: b.id, color: b.color, bg: b.bg } : x), ...blocks.slice(i + 1)]); setPending({ id: focusTarget === ins[0] ? b.id : focusTarget.id, caret: 0 }); }
    else { onChange([...blocks.slice(0, i), { ...b, text: rest }, ...ins, ...blocks.slice(i + 1)]); setPending({ id: focusTarget.id, caret: 0 }); }
    if (type === "page" && ins[0].pageId) setTimeout(() => onPage(ins[0].pageId!), 0);
  };
  const pickMention = (b: Block, m: MentionItem) => { const s = mention!; setMention(null); const tok = mentionText(m.kind, m.value); const caret = s.at + 1 + s.q.length; const text = b.text.slice(0, s.at) + tok + " " + b.text.slice(caret); set(b.id, { text }); setPending({ id: b.id, caret: s.at + tok.length + 1 }); };
  const insertMarkdown = (b: Block, md: string) => {
    const ins = markdownToBlocks(md); if (!ins.length) return; const i = idx(b.id);
    const next = b.text === "" ? [...blocks.slice(0, i), ...ins, ...blocks.slice(i + 1)] : [...blocks.slice(0, i + 1), ...ins, ...blocks.slice(i + 1)]; onChange(next); setPending({ id: ins[ins.length - 1].id, caret: ins[ins.length - 1].text.length });
  };

  // ---- selection toolbar ----
  const place = (r: DOMRect) => { const rr = root.current!.getBoundingClientRect(); return { x: Math.max(0, Math.min(r.left - rr.left, rr.width - 420)), y: r.top - rr.top - 44 }; };
  const selFromTextarea = (b: Block, el: HTMLTextAreaElement) => { const { selectionStart: a, selectionEnd: e } = el; if (a === e) { setSel(s => (s?.id === b.id ? null : s)); return; } const r = el.getBoundingClientRect(); setSel({ id: b.id, a, b: e, ...place(new DOMRect(r.left + 8, r.top, 0, 0)) }); };
  const selFromView = (b: Block, view: HTMLElement) => {
    const s = window.getSelection(); if (!s || s.rangeCount === 0 || s.isCollapsed) return false;
    const a = rawOffset(view, s.anchorNode!, s.anchorOffset), e = rawOffset(view, s.focusNode!, s.focusOffset); if (a === null || e === null || a === e) return false;
    setSel({ id: b.id, a: Math.min(a, e), b: Math.max(a, e), ...place(s.getRangeAt(0).getBoundingClientRect()) }); return true;
  };
  const style = (b: Block, k: InlineStyle) => { if (!sel) return; const r = wrapRange(b.text, sel.a, sel.b, WRAP[k]); set(b.id, { text: r.text }); setSel(null); setPending({ id: b.id, caret: r.a, end: r.b }); };
  const link = (b: Block, href: string) => { if (!sel) return; set(b.id, { text: linkRange(b.text, sel.a, sel.b, href) }); setSel(null); };
  const color = (b: Block, c: Color | null, bg: boolean) => { if (!sel) return; set(b.id, { text: colorRange(b.text, sel.a, sel.b, c, bg) }); setSel(null); };

  const keydown = (e: React.KeyboardEvent<HTMLTextAreaElement>, b: Block) => {
    const el = e.currentTarget; const i = idx(b.id); const mod = e.metaKey || e.ctrlKey; const caret = el.selectionStart; const collapsed = el.selectionStart === el.selectionEnd;
    if (slash && slash.id === b.id) {
      const items = filterMenu(slash.q);
      if (e.key === "ArrowDown") { e.preventDefault(); setSlash({ ...slash, i: Math.min(slash.i + 1, items.length - 1) }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlash({ ...slash, i: Math.max(0, slash.i - 1) }); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (items[slash.i]) choose(b.id, items[slash.i]); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSlash(null); return; }
    }
    if (mention && mention.id === b.id) {
      const items = mentionItems(mention.q, env.pages, env.me);
      if (e.key === "ArrowDown") { e.preventDefault(); setMention({ ...mention, i: Math.min(mention.i + 1, items.length - 1) }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMention({ ...mention, i: Math.max(0, mention.i - 1) }); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (items[mention.i]) pickMention(b, items[mention.i]); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setMention(null); return; }
    }
    if (e.key === "Escape") { if (sel) { setSel(null); e.stopPropagation(); } el.blur(); return; }
    if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); onChange(moveBlock(blocks, b.id, e.key === "ArrowUp" ? -1 : 1)); setPending({ id: b.id, caret }); return; }
    if (mod && e.key.toLowerCase() === "d" && !e.shiftKey) { e.preventDefault(); insertAfter(i, cloneBlock(b)); return; }
    if (mod && !collapsed && !e.shiftKey && ["b", "i", "u", "e", "k"].includes(e.key.toLowerCase())) {
      e.preventDefault(); e.stopPropagation(); const k = e.key.toLowerCase(); const { selectionStart: s, selectionEnd: en } = el;
      if (k === "k") { setSel({ id: b.id, a: s, b: en, ...place(el.getBoundingClientRect()) }); return; }
      const r = wrapRange(b.text, s, en, WRAP[k === "b" ? "bold" : k === "i" ? "italic" : k === "u" ? "underline" : "code"]); set(b.id, { text: r.text }); setPending({ id: b.id, caret: r.a, end: r.b }); return;
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === "s" && !collapsed) { e.preventDefault(); const r = wrapRange(b.text, el.selectionStart, el.selectionEnd, WRAP.strike); set(b.id, { text: r.text }); setPending({ id: b.id, caret: r.a, end: r.b }); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "m" && env.onComment) { e.preventDefault(); env.onComment(b.id); return; }
    if (e.key === "Enter" && (b.type === "code" || b.type === "equation")) { if (mod) { e.preventDefault(); insertAfter(i, mk("p")); } return; }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault(); setSel(null);
      if (b.type === "toggle" && b.open && b.text) { insertAfter(i, mk("p")); return; }
      const parts = splitBlock(b, caret); replace(b.id, ...parts); const target = parts[parts.length - 1]; setPending({ id: target.id, caret: 0 }); return;
    }
    if (e.key === "Backspace" && collapsed && caret === 0) {
      e.preventDefault();
      if (b.type !== "p") { replace(b.id, { ...b, type: "p", checked: undefined, kids: undefined, open: undefined }); setPending({ id: b.id, caret: 0 }); return; }
      if (i > 0) { const prev = blocks[i - 1]; if (["divider", "toc", "columns", "table", "board", "page", "link", "equation", ...MEDIA].includes(prev.type)) { if (b.text === "") { onChange(blocks.filter(x => x.id !== b.id)); refs.current.get(prev.id)?.focus(); } else { onChange(blocks.filter(x => x.id !== prev.id)); setPending({ id: b.id, caret: 0 }); } } else { const m = mergeUp(prev, b); onChange([...blocks.slice(0, i - 1), m, ...blocks.slice(i + 1)]); setPending({ id: m.id, caret: prev.text.length }); } }
      else if (b.text === "" && !nested) env.onFocusTitle?.();
      return;
    }
    if (e.key === "ArrowUp" && collapsed && !el.value.slice(0, caret).includes("\n")) { if (i > 0) { e.preventDefault(); focusAt(i - 1, true); } else if (!nested && env.onFocusTitle) { e.preventDefault(); env.onFocusTitle(); } return; }
    if (e.key === "ArrowDown" && collapsed && !el.value.slice(caret).includes("\n") && i < blocks.length - 1) { e.preventDefault(); focusAt(i + 1, false); return; }
  };

  const grow = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = "0px"; el.style.height = el.scrollHeight + "px"; } };
  const placeholder = (b: Block, i: number) => i === 0 && blocks.length === 1 && b.type === "p" ? (hint ?? "Type '/' for commands") : ({ h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", h4: "Heading 4", p: "Type '/' for commands", bullet: "List", number: "List", todo: "To-do", toggle: "Toggle", quote: "Empty quote", callout: "Type something…", code: "Write some code…", equation: "E = mc^2" } as Record<string, string>)[b.type] ?? "";
  const prefixEl = (b: Block) => b.type === "bullet" ? <span className="ntn-mark">•</span> : b.type === "number" ? <span className="ntn-mark">{nums[b.id]}.</span> : b.type === "todo" ? <input type="checkbox" className="ntn-check" aria-label="Done" checked={!!b.checked} disabled={ro} onChange={e => set(b.id, { checked: e.target.checked })} />
    : b.type === "toggle" ? <button type="button" className={"ntn-tgl" + (b.open ? " open" : "")} aria-label={b.open ? "Collapse" : "Expand"} aria-expanded={!!b.open} onClick={() => set(b.id, { open: !b.open })}>▶</button> : b.type === "callout" ? <span className="ntn-callout__icon" aria-hidden>💡</span> : null;

  // ---- drag to reorder ----
  const dragProps = (b: Block) => ({
    onDragOver: (e: React.DragEvent) => { if (!drag || drag === b.id) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDrop({ id: b.id, after: e.clientY > r.top + r.height / 2 }); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (!drag || !drop) return; const to = idx(drop.id) + (drop.after ? 1 : 0); onChange(reorder(blocks, drag, to)); setDrag(null); setDrop(null); },
  });
  const dropCls = (b: Block) => drop?.id === b.id ? (drop.after ? " drop-after" : " drop-before") : "";
  const handle = (b: Block, i: number) => ro ? null : <div className="ntn-handle" contentEditable={false}>
    <button type="button" aria-label="Add block below" title="Click to add a block below" onClick={() => insertAfter(i, mk("p"))}>＋</button>
    <button type="button" aria-label="Block menu" title="Drag to move, click to open menu" draggable onDragStart={e => { setDrag(b.id); setSel(null); e.dataTransfer.setData("text/plain", b.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setDrop(null); }} onClick={() => setMenuFor(menuFor === b.id ? null : b.id)} aria-haspopup="menu" aria-expanded={menuFor === b.id}>⋮⋮</button>
    {menuFor === b.id && <BlockMenu block={b} onClose={() => setMenuFor(null)} onTurnInto={t => onChange(turnInto(blocks, b.id, t))} onColor={(c, bg) => set(b.id, bg ? { bg: c ?? undefined } : { color: c ?? undefined })}
      onDuplicate={() => insertAfter(i, cloneBlock(b))} onDelete={() => remove(b.id)} onMove={pid => { if (env.moveBlockToPage) { env.moveBlockToPage(b, pid); onChange(blocks.length > 1 ? blocks.filter(x => x.id !== b.id) : [mk("p")]); env.notify?.("Block moved"); } }} onComment={env.onComment ? () => env.onComment!(b.id) : undefined} />}</div>;
  const badge = (b: Block) => env.comments?.[b.id] ? <button type="button" className="ntn-cbadge" aria-label={`${env.comments[b.id]} comment${env.comments[b.id] > 1 ? "s" : ""}`} onClick={() => env.onShowComments?.(b.id)}>💬 {env.comments[b.id]}</button> : null;
  const colorStyle = (b: Block) => ({ ...(b.color ? { color: `var(--nt-${b.color})` } : {}), ...(b.bg ? { background: `var(--nt-${b.bg}-bg)` } : {}) });
  const selBlock = sel ? blocks.find(b => b.id === sel.id) : undefined;

  return <div className={"ntn-editor" + (nested ? " is-nested" : "")} data-testid={nested ? "nested-editor" : "editor"} ref={root}>
    {blocks.map((b, i) => {
      const isFocus = focus === b.id; const common = { "data-testid": "block", "data-type": b.type, id: b.id, ...dragProps(b) };
      if (b.type === "divider") return <div key={b.id} {...common} className={"ntn-block ntn-block--divider" + dropCls(b)} tabIndex={0} ref={el => { if (el) refs.current.set(b.id, el); }}
        onFocus={() => setFocus(b.id)} onKeyDown={e => { if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); remove(b.id); } else if (e.key === "Enter") { e.preventDefault(); insertAfter(i, mk("p")); } else if (e.key === "ArrowUp") focusAt(i - 1, true); else if (e.key === "ArrowDown") focusAt(i + 1, false); }}>{handle(b, i)}<hr /></div>;
      if (b.type === "table" || b.type === "board") return <div key={b.id} {...common} className={"ntn-block ntn-block--db" + dropCls(b)}>{handle(b, i)}<DatabaseBlock block={b} onChange={patch => set(b.id, patch)} onDelete={() => remove(b.id)} /></div>;
      if (MEDIA.includes(b.type)) return <div key={b.id} {...common} className={`ntn-block ntn-block--media ntn-block--${b.type}` + dropCls(b)} tabIndex={-1} ref={el => { if (el) refs.current.set(b.id, el); }}>{handle(b, i)}<MediaBlock block={b} onChange={p => set(b.id, p)} onDelete={() => remove(b.id)} /></div>;
      if (b.type === "page" || b.type === "link") { const ref = b.pageId ? env.pages.find(p => p.id === b.pageId) : undefined; const id = b.pageId ?? resolve(b.text); const title = ref?.title ?? b.text;
        if (b.type === "link" && !b.pageId && !b.text) return <div key={b.id} {...common} className={"ntn-block ntn-block--link" + dropCls(b)}>{handle(b, i)}<LinkPicker onPick={p => set(b.id, { pageId: p.id, text: p.title || "Untitled" })} onCancel={() => remove(b.id)} /></div>;
        return <div key={b.id} {...common} className={`ntn-block ntn-block--${b.type}` + dropCls(b)} tabIndex={-1} ref={el => { if (el) refs.current.set(b.id, el); }}>{handle(b, i)}
          <a href="#" className={"ntn-pageblock" + (id ? "" : " is-missing")} onClick={e => { e.preventDefault(); if (id) onPage(id); }}>{b.type === "link" && <i>↗</i>}<span>{ref?.icon ?? "📄"}</span><b>{title || "Untitled"}</b></a></div>; }
      if (b.type === "toc") { const hs = headings(pageBlocks ?? blocks); return <div key={b.id} {...common} className={"ntn-block ntn-block--toc" + dropCls(b)} tabIndex={-1} ref={el => { if (el) refs.current.set(b.id, el); }}>{handle(b, i)}
        <nav className="ntn-toc" aria-label="Table of contents">{hs.length ? hs.map(h => <a key={h.id} href={`#${h.id}`} className={`lv-${h.type}`} onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{h.text || "Untitled heading"}</a>) : <span className="ntn-ph">Add headings to create a table of contents.</span>}</nav></div>; }
      if (b.type === "columns") return <div key={b.id} {...common} className={"ntn-block ntn-block--columns" + dropCls(b)}>{handle(b, i)}
        <div className="ntn-cols" style={{ gridTemplateColumns: `repeat(${b.cols?.length ?? 2}, minmax(0,1fr))` }}>{(b.cols ?? []).map((c, k) => <div key={k} className="ntn-col"><Editor nested blocks={c} onChange={nb => set(b.id, { cols: (b.cols ?? []).map((x, j) => j === k ? (nb.length ? nb : [mk("p")]) : x) })} pageBlocks={pageBlocks ?? blocks} /></div>)}</div>
        <button type="button" className="ntn-cols__add" aria-label="Add column" title="Add column" onClick={() => (b.cols?.length ?? 0) < 4 && set(b.id, { cols: [...(b.cols ?? []), [mk("p")]] })}>＋</button></div>;
      const eq = b.type === "equation";
      return <div key={b.id} {...common} className={`ntn-block ntn-block--${b.type}` + (isFocus ? " is-focus" : "") + (b.type === "todo" && b.checked ? " is-done" : "") + dropCls(b)} style={colorStyle(b)}>
        {handle(b, i)}
        {prefixEl(b)}
        <div className="ntn-text">
          {(isFocus || b.type === "code") && !ro ? <textarea ref={el => { if (el) { refs.current.set(b.id, el); grow(el); } else refs.current.delete(b.id); }} rows={1} spellCheck={b.type !== "code" && !eq} aria-label={`Block ${i + 1}`} value={b.text} className="ntn-input" placeholder={placeholder(b, i)}
            onChange={e => change(b, e.target.value, e.target.selectionStart)} onKeyDown={e => keydown(e, b)} onFocus={() => setFocus(b.id)} onBlur={() => setTimeout(() => { if (refs.current.get(b.id) !== document.activeElement) setFocus(f => (f === b.id ? null : f)); }, 0)}
            onSelect={e => { if (document.activeElement === e.currentTarget) selFromTextarea(b, e.currentTarget); }} onMouseUp={e => selFromTextarea(b, e.currentTarget)}
            onPaste={e => { const t = e.clipboardData.getData("text/plain"); if (/\n/.test(t) && b.type !== "code" && !eq) { e.preventDefault(); insertMarkdown(b, t); } }} />
            : <div className="ntn-view" tabIndex={-1} data-testid="view" onMouseDown={e => { if ((e.target as HTMLElement).closest("a,button,input")) return; e.stopPropagation(); }}
              onMouseUp={e => { const view = e.currentTarget; if (ro || (e.target as HTMLElement).closest("a")) return; if (selFromView(b, view)) return; const s = window.getSelection(); const off = s && s.anchorNode ? rawOffset(view, s.anchorNode, s.anchorOffset) : null; setSel(null); setPending({ id: b.id, caret: off ?? b.text.length }); setFocus(b.id); }}>
              {eq ? <span className="ntn-eq" data-s={0}>{b.text || <span className="ntn-ph">Add a TeX equation</span>}</span> : <InlineText text={b.text} resolve={resolve} onPage={onPage} placeholder={i === 0 && blocks.length === 1 ? placeholder(b, i) : undefined} />}</div>}
          {slash?.id === b.id && <SlashMenu q={slash.q} index={slash.i} onPick={m => choose(b.id, m)} onHover={n => setSlash({ ...slash, i: n })} />}
          {mention?.id === b.id && <MentionMenu q={mention.q} index={mention.i} onPick={m => pickMention(b, m)} onHover={n => setMention({ ...mention, i: n })} />}
        </div>
        {badge(b)}
        {b.type === "toggle" && b.open && <div className="ntn-toggle__kids"><Editor nested hint="Empty toggle. Click or drop blocks inside." blocks={b.kids?.length ? b.kids : [mk("p")]} onChange={kids => set(b.id, { kids: kids.length ? kids : [mk("p")] })} pageBlocks={pageBlocks ?? blocks} /></div>}
      </div>;
    })}
    {!nested && !ro && <button type="button" className="ntn-addrow" onClick={() => { const last = blocks[blocks.length - 1]; if (last && last.type === "p" && !last.text) { setPending({ id: last.id, caret: 0 }); return; } const p = mk("p"); onChange([...blocks, p]); setPending({ id: p.id, caret: 0 }); }} aria-label="Click to add a block below"> </button>}
    {sel && selBlock && <Toolbar sel={sel} block={selBlock} onClose={() => setSel(null)} onStyle={k => style(selBlock, k)} onLink={h => link(selBlock, h)} onColor={(c, bg) => color(selBlock, c, bg)} onTurnInto={t => { onChange(turnInto(blocks, selBlock.id, t)); setSel(null); }} onComment={env.onComment ? () => { env.onComment!(selBlock.id); setSel(null); } : undefined} />}
  </div>;
}
function LinkPicker({ onPick, onCancel }: { onPick: (p: { id: string; title: string }) => void; onCancel: () => void }) {
  const env = useEnv(); const [q, setQ] = useState(""); const hits = env.pages.filter(p => !q || (p.title || "Untitled").toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return <div className="ntn-linkpick" data-testid="link-picker"><input autoFocus aria-label="Link to page" placeholder="Link to page…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onCancel(); if (e.key === "Enter" && hits[0]) onPick(hits[0]); }} />
    <div>{hits.map(p => <button type="button" key={p.id} onClick={() => onPick(p)}>{p.icon} {p.title || "Untitled"}</button>)}{!hits.length && <span className="ntn-ph">No pages match</span>}</div></div>;
}
