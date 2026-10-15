"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BLOCK_MENU, applyShortcut, filterMenu, inlineTokens, markdownToBlocks, mergeUp, mk, moveBlock, numbering, splitBlock, turnInto, type Block, type BlockType } from "@/lib/notion/blocks";

export function InlineText({ text, resolve, onPage }: { text: string; resolve: (title: string) => string | null; onPage: (id: string) => void }) {
  if (!text) return <span className="ntn-ph">{"\u200b"}</span>;
  return <>{inlineTokens(text).map((t, i) => t.t === "bold" ? <strong key={i}>{t.text}</strong> : t.t === "italic" ? <em key={i}>{t.text}</em> : t.t === "strike" ? <s key={i}>{t.text}</s> : t.t === "code" ? <code key={i}>{t.text}</code>
    : t.t === "link" ? <a key={i} href={t.href} target="_blank" rel="noreferrer noopener" onClick={e => e.stopPropagation()}>{t.text}</a>
    : t.t === "page" ? (() => { const id = resolve(t.text); return <a key={i} href="#" className={"ntn-pagelink" + (id ? "" : " is-missing")} onClick={e => { e.preventDefault(); e.stopPropagation(); if (id) onPage(id); }}>{id ? "📄 " : ""}{t.text}</a>; })()
    : <span key={i}>{t.text}</span>)}</>;
}

type Pending = { id: string; caret: number } | null;
export function Editor({ blocks, onChange, resolve, onPage, autoFocusFirst }: { blocks: Block[]; onChange: (b: Block[]) => void; resolve: (title: string) => string | null; onPage: (id: string) => void; autoFocusFirst?: boolean }) {
  const [focus, setFocus] = useState<string | null>(null); const [pending, setPending] = useState<Pending>(null);
  const [slash, setSlash] = useState<{ id: string; q: string; i: number } | null>(null); const [menuFor, setMenuFor] = useState<string | null>(null);
  const nums = useMemo(() => numbering(blocks), [blocks]); const refs = useRef(new Map<string, HTMLTextAreaElement | HTMLElement>());
  useEffect(() => { if (autoFocusFirst && blocks[0] && blocks.length === 1 && !blocks[0].text) setPending({ id: blocks[0].id, caret: 0 }); }, [autoFocusFirst]); // eslint-disable-line
  useLayoutEffect(() => { if (!pending) return; const el = refs.current.get(pending.id); if (!el) { if (focus !== pending.id) setFocus(pending.id); return; } (el as HTMLElement).focus(); if (el instanceof HTMLTextAreaElement) el.setSelectionRange(pending.caret, pending.caret); setFocus(pending.id); setPending(null); });

  const replace = useCallback((id: string, ...next: Block[]) => { const i = blocks.findIndex(b => b.id === id); onChange([...blocks.slice(0, i), ...next, ...blocks.slice(i + 1)]); }, [blocks, onChange]);
  const set = (id: string, patch: Partial<Block>) => onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  const idx = (id: string) => blocks.findIndex(b => b.id === id);
  const focusAt = (i: number, end: boolean) => { const b = blocks[i]; if (b) setPending({ id: b.id, caret: end ? b.text.length : 0 }); };

  const change = (b: Block, text: string) => {
    const next = { ...b, text }; const sc = applyShortcut(next);
    if (sc && /^(#{1,3} |[-*+] |\d+\. |\[( |x)?\] |> |```\w*$|---$|\*\*\*$)/.test(text)) { replace(b.id, sc); setSlash(null); setPending({ id: b.id, caret: 0 }); return; }
    { const m = text.match(/^\/([\w ]*)$/); if (m && (b.type as string) !== "code") setSlash(s => ({ id: b.id, q: m[1], i: s?.id === b.id && s.q === m[1] ? s.i : 0 })); else setSlash(null); }
    onChange(blocks.map(x => x.id === b.id ? next : x));
  };
  const choose = (id: string, type: BlockType) => {
    setSlash(null);
    if (type === "divider") { const i = idx(id); const div = mk("divider"); const p = mk("p"); onChange([...blocks.slice(0, i), div, p, ...blocks.slice(i + 1)]); setPending({ id: p.id, caret: 0 }); return; }
    onChange(blocks.map(b => b.id === id ? { ...b, type, text: "", checked: type === "todo" ? false : undefined, lang: undefined } : b)); setPending({ id, caret: 0 });
  };
  const insertMarkdown = (b: Block, md: string) => {
    const ins = markdownToBlocks(md); if (!ins.length) return; const i = idx(b.id);
    const next = b.text === "" ? [...blocks.slice(0, i), ...ins, ...blocks.slice(i + 1)] : [...blocks.slice(0, i + 1), ...ins, ...blocks.slice(i + 1)]; onChange(next); setPending({ id: ins[ins.length - 1].id, caret: ins[ins.length - 1].text.length });
  };

  const keydown = (e: React.KeyboardEvent<HTMLTextAreaElement>, b: Block) => {
    const el = e.currentTarget; const i = idx(b.id); const mod = e.metaKey || e.ctrlKey; const caret = el.selectionStart; const collapsed = el.selectionStart === el.selectionEnd;
    if (slash && slash.id === b.id) {
      const items = filterMenu(slash.q);
      if (e.key === "ArrowDown") { e.preventDefault(); setSlash({ ...slash, i: Math.min(slash.i + 1, items.length - 1) }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlash({ ...slash, i: Math.max(0, slash.i - 1) }); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (items[slash.i]) choose(b.id, items[slash.i].type); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSlash(null); return; }
    }
    if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); onChange(moveBlock(blocks, b.id, e.key === "ArrowUp" ? -1 : 1)); setPending({ id: b.id, caret }); return; }
    if (mod && (e.key === "b" || e.key === "i" || e.key === "e") && !collapsed) { e.preventDefault(); const w = e.key === "b" ? "**" : e.key === "i" ? "*" : "`"; const { selectionStart: s, selectionEnd: en } = el; const t = b.text; set(b.id, { text: t.slice(0, s) + w + t.slice(s, en) + w + t.slice(en) }); setPending({ id: b.id, caret: en + 2 * w.length }); return; }
    if (e.key === "Enter" && b.type === "code") { if (mod) { e.preventDefault(); const p = mk("p"); onChange([...blocks.slice(0, i + 1), p, ...blocks.slice(i + 1)]); setPending({ id: p.id, caret: 0 }); } return; }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault(); const parts = splitBlock(b, caret); replace(b.id, ...parts); const target = parts[parts.length - 1]; setPending({ id: target.id, caret: parts.length > 1 ? 0 : 0 }); return;
    }
    if (e.key === "Backspace" && collapsed && caret === 0) {
      e.preventDefault();
      if (b.type !== "p") { replace(b.id, { ...b, type: "p", checked: undefined }); setPending({ id: b.id, caret: 0 }); return; }
      if (i > 0) { const prev = blocks[i - 1]; if (prev.type === "divider") { onChange(blocks.filter(x => x.id !== prev.id)); setPending({ id: b.id, caret: 0 }); } else { const m = mergeUp(prev, b); onChange([...blocks.slice(0, i - 1), m, ...blocks.slice(i + 1)]); setPending({ id: m.id, caret: prev.text.length }); } }
      return;
    }
    if (e.key === "ArrowUp" && collapsed && !el.value.slice(0, caret).includes("\n") && i > 0) { e.preventDefault(); focusAt(i - 1, true); return; }
    if (e.key === "ArrowDown" && collapsed && !el.value.slice(caret).includes("\n") && i < blocks.length - 1) { e.preventDefault(); focusAt(i + 1, false); return; }
  };

  const grow = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = "0px"; el.style.height = el.scrollHeight + "px"; } };
  const prefixEl = (b: Block) => b.type === "bullet" ? <span className="ntn-mark">•</span> : b.type === "number" ? <span className="ntn-mark">{nums[b.id]}.</span> : b.type === "todo" ? <input type="checkbox" className="ntn-check" aria-label="Done" checked={!!b.checked} onChange={e => set(b.id, { checked: e.target.checked })} /> : b.type === "callout" ? <span className="ntn-callout__icon" aria-hidden>💡</span> : null;

  return <div className="ntn-editor" data-testid="editor">
    {blocks.map((b, i) => {
      const isFocus = focus === b.id;
      if (b.type === "divider") return <div key={b.id} className="ntn-block ntn-block--divider" data-testid="block" data-type="divider" tabIndex={0} ref={el => { if (el) refs.current.set(b.id, el); }}
        onFocus={() => setFocus(b.id)} onKeyDown={e => { if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); onChange(blocks.filter(x => x.id !== b.id)); if (i > 0) focusAt(i - 1, true); } else if (e.key === "Enter") { e.preventDefault(); const p = mk("p"); onChange([...blocks.slice(0, i + 1), p, ...blocks.slice(i + 1)]); setPending({ id: p.id, caret: 0 }); } else if (e.key === "ArrowUp") focusAt(i - 1, true); else if (e.key === "ArrowDown") focusAt(i + 1, false); }}><hr /></div>;
      return <div key={b.id} className={`ntn-block ntn-block--${b.type}` + (isFocus ? " is-focus" : "") + (b.type === "todo" && b.checked ? " is-done" : "")} data-testid="block" data-type={b.type}>
        <div className="ntn-handle"><button aria-label="Add block below" title="Add block below" onClick={() => { const p = mk("p"); onChange([...blocks.slice(0, i + 1), p, ...blocks.slice(i + 1)]); setPending({ id: p.id, caret: 0 }); }}>＋</button>
          <button aria-label="Block menu" title="Block menu" onClick={() => setMenuFor(menuFor === b.id ? null : b.id)}>⋮⋮</button>
          {menuFor === b.id && <div className="ntn-menu" role="menu" onMouseLeave={() => setMenuFor(null)}>
            <button role="menuitem" onClick={() => { onChange(moveBlock(blocks, b.id, -1)); setMenuFor(null); }}>Move up</button><button role="menuitem" onClick={() => { onChange(moveBlock(blocks, b.id, 1)); setMenuFor(null); }}>Move down</button>
            <button role="menuitem" onClick={() => { const c = { ...b, id: mk("p").id }; onChange([...blocks.slice(0, i + 1), c, ...blocks.slice(i + 1)]); setMenuFor(null); }}>Duplicate</button>
            <div className="ntn-menu__sep" />{BLOCK_MENU.filter(m => m.type !== "divider").map(m => <button key={m.type} role="menuitem" onClick={() => { onChange(turnInto(blocks, b.id, m.type)); setMenuFor(null); }}>Turn into {m.label.toLowerCase()}</button>)}
            <div className="ntn-menu__sep" /><button role="menuitem" className="is-danger" onClick={() => { onChange(blocks.length > 1 ? blocks.filter(x => x.id !== b.id) : [mk("p")]); setMenuFor(null); }}>Delete</button></div>}</div>
        {prefixEl(b)}
        <div className="ntn-text">
          {isFocus || b.type === "code" ? <textarea ref={el => { if (el) { refs.current.set(b.id, el); grow(el); } else refs.current.delete(b.id); }} rows={1} spellCheck={b.type !== "code"} aria-label={`Block ${i + 1}`} value={b.text} className="ntn-input" placeholder={i === 0 && blocks.length === 1 ? "Type '/' for commands" : b.type === "h1" ? "Heading 1" : b.type === "h2" ? "Heading 2" : b.type === "h3" ? "Heading 3" : b.type === "p" ? "Type '/' for commands" : "List"}
            onChange={e => change(b, e.target.value)} onKeyDown={e => keydown(e, b)} onFocus={() => setFocus(b.id)} onBlur={() => setTimeout(() => setFocus(f => (f === b.id ? null : f)), 0)}
            onPaste={e => { const t = e.clipboardData.getData("text/plain"); if (/\n/.test(t) && b.type !== "code") { e.preventDefault(); insertMarkdown(b, t); } }} />
            : <div className="ntn-view" tabIndex={-1} onMouseDown={e => { if ((e.target as HTMLElement).closest("a")) return; e.preventDefault(); setPending({ id: b.id, caret: b.text.length }); setFocus(b.id); }}><InlineText text={b.text} resolve={resolve} onPage={onPage} /></div>}
          {slash?.id === b.id && <SlashMenu q={slash.q} index={slash.i} onPick={t => choose(b.id, t)} onHover={n => setSlash({ ...slash, i: n })} />}
        </div>
      </div>;
    })}
    <button className="ntn-addrow" onClick={() => { const last = blocks[blocks.length - 1]; if (last && last.type === "p" && !last.text) { setPending({ id: last.id, caret: 0 }); return; } const p = mk("p"); onChange([...blocks, p]); setPending({ id: p.id, caret: 0 }); }} aria-label="Click to add a block below"> </button>
  </div>;
}
function SlashMenu({ q, index, onPick, onHover }: { q: string; index: number; onPick: (t: BlockType) => void; onHover: (i: number) => void }) {
  const items = filterMenu(q);
  return <div className="ntn-slash" role="listbox" aria-label="Insert block" data-testid="slash-menu">{items.length ? items.map((m, n) => <button key={m.type} role="option" aria-selected={n === index} className={n === index ? "on" : ""} onMouseEnter={() => onHover(n)} onMouseDown={e => { e.preventDefault(); onPick(m.type); }}>
    <span className="ntn-slash__glyph">{m.type === "p" ? "Aa" : m.type === "h1" ? "H1" : m.type === "h2" ? "H2" : m.type === "h3" ? "H3" : m.type === "bullet" ? "•" : m.type === "number" ? "1." : m.type === "todo" ? "☑" : m.type === "quote" ? "❝" : m.type === "code" ? "</>" : m.type === "callout" ? "💡" : "—"}</span>
    <span><b>{m.label}</b><small>{m.hint}</small></span></button>) : <div className="ntn-slash__none">No results</div>}</div>;
}
