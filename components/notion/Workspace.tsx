"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BP } from "@/lib/basepath";
import { useLocal } from "@/lib/useLocal";
import { useDismiss } from "@/lib/useDismiss";
import { Logo } from "@/components/Logo";
import { mk, type Block } from "@/lib/notion/blocks";
import {
  backlinks, breadcrumb, children, createPage, deleteForever, duplicatePage, emptyTrash, emptyWorkspace, findByTitle, getPage, importMarkdown, live, movePage, pageMarkdown, restorePage, searchPages, toggleFavorite, touchRecent, trashPage, updatePage, wordCount, descendants,
  type Page, type Workspace as WS,
} from "@/lib/notion/pages";
import { seedWorkspace } from "@/lib/notion/seed";
import { addComment, deleteThread, editComment, openThreads, replyComment, resolveThread } from "@/lib/notion/pages";
import { TEMPLATES, createFromTemplate, type Template } from "@/lib/notion/templates";
import { CommentBox, CommentsPane, ThreadView, type ThreadActions } from "./Comments";
import { TemplateGallery } from "./TemplateGallery";
import { Cover, ExportDialog, HistoryDialog, ImportDialog, PageMenu, SharePop, TrashPop } from "./PageChrome";
import { htmlToMarkdown, textToMarkdown } from "@/lib/notion/importers";
import { restoreSnapshot, type Snapshot } from "@/lib/notion/pages";
import { bid, mk as mkBlock, migrateBlocks } from "@/lib/notion/blocks";
import { dbFromCsv, parseCsv } from "@/lib/notion/db";
import { useSearchParams } from "next/navigation";
import { Editor } from "./Editor";
import { Popwrap } from "./Popwrap";
import { EditorCtx, type EditorEnv } from "./editorEnv";
import { pid } from "@/lib/notion/pages";

type Pop = null | "ws" | "share" | "menu" | "icon" | "cover" | "trash";
const COVER_DEFAULT = "g:2";
const cloneDeep = (b: Block): Block => ({ ...b, id: bid(), kids: b.kids?.map(cloneDeep), cols: b.cols?.map(c => c.map(cloneDeep)), db: b.db ? { ...b.db, rows: b.db.rows.map(r => ({ ...r, id: bid() })) } : undefined });
const ICONS = ["📄", "📝", "📚", "🧭", "🗓️", "✅", "💡", "🎯", "🚀", "🧪", "🎨", "📌", "🏠", "💼", "📊", "🔖"];

export function Workspace({ uid, name, email, demo, view }: { uid: string; name: string; email: string; demo: boolean; view: string[] }) {
  const router = useRouter();
  const [stored, setStored, ready] = useLocal<WS | null>(uid, "ws", null);
  const [expanded, setExpanded] = useLocal<Record<string, boolean>>(uid, "expanded", {});
  const [searching, setSearching] = useState(false); const [toast, setToast] = useState(""); const [navOpen, setNavOpen] = useState(false); const [moveOpen, setMoveOpen] = useState(false); const [settings, setSettings] = useState(false);
  // One popover at a time (QA #16): a single slot; opening one replaces another, Escape/click-away clears it.
  const [pop, setPop] = useState<Pop>(null); const [cpane, setCpane] = useState(false); const [draftBlock, setDraftBlock] = useState<string | null>(null); const [focusThread, setFocusThread] = useState<string | null>(null); const [pageDraft, setPageDraft] = useState(false); const [gallery, setGallery] = useState<string | null | false>(false); const [dlg, setDlg] = useState<null | "export" | "history" | "import">(null); const params = useSearchParams(); const toggle = (k: NonNullable<Pop>) => setPop(p => (p === k ? null : k)); const closePop = useCallback(() => setPop(null), []);
  const fileRef = useRef<HTMLInputElement>(null); const titleRef = useRef<HTMLInputElement>(null); const [focusFirst, setFocusFirst] = useState(0);
  useEffect(() => { if (ready && !stored) setStored(demo ? seedWorkspace() : emptyWorkspace()); }, [ready, stored, demo, setStored]);
  // Databases saved before the typed property/view model are upgraded once, in place.
  useEffect(() => { if (!ready || !stored) return; if (stored.pages.some(p => p.blocks.some(b => (b.type === "table" || b.type === "board") && b.db && !("props" in b.db)))) setStored(w => w ? { ...w, pages: w.pages.map(p => ({ ...p, blocks: migrateBlocks(p.blocks) })) } : w); }, [ready, stored?.pages.length]); // eslint-disable-line
  const ws = stored;
  const notify = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(t => (t === m ? "" : t)), 2400); }, []);
  const commit = useCallback((f: (w: WS) => WS) => setStored(w => (w ? f(w) : w) as WS), [setStored]);
  const [kind, arg] = [view[0] === "trash" ? "trash" : view[0] ? "page" : "home", view[0]];
  const page = ws && kind === "page" ? getPage(ws, arg) : undefined;
  const missing = ws && kind === "page" && (!page || page.trashed);
  useEffect(() => { if (ws && page && !page.trashed) { const up = breadcrumb(ws, page.id).slice(0, -1); if (up.some(p => !expanded[p.id])) setExpanded(e => ({ ...e, ...Object.fromEntries(up.map(p => [p.id, true])) })); } }, [page?.id]); // eslint-disable-line
  useEffect(() => { if (page && !page.trashed) commit(w => (w.recent[0] === page.id ? w : touchRecent(w, page.id))); }, [page?.id]); // eslint-disable-line
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(true); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const open = useCallback((id: string) => { setNavOpen(false); router.push(`/app/${id}`); }, [router]);
  const dup = params.get("dup");
  useEffect(() => { if (!ws || !dup) return; (async () => { try { const r = await fetch(`${BP}/api/publish?id=${encodeURIComponent(dup)}`); const j = await r.json(); if (!r.ok || !j.duplicable) { notify("That page can't be duplicated."); router.replace("/app"); return; }
    const pg = j.page; const r2 = createPage(ws, { title: pg.title, icon: pg.icon, blocks: (pg.blocks as Block[]).map(cloneDeep) }); setStored({ ...r2.ws, pages: r2.ws.pages.map(x => x.id === r2.page.id ? { ...x, cover: pg.cover, coverY: pg.coverY, font: pg.font, smallText: pg.smallText, fullWidth: pg.fullWidth } : x) }); notify("Page duplicated into your workspace"); router.replace(`/app/${r2.page.id}`); } catch { notify("Could not load that page."); router.replace("/app"); } })(); }, [ws ? 1 : 0, dup]); // eslint-disable-line
  const newPage = useCallback((parentId: string | null = null, title = "") => { if (!ws) return; const r = createPage(ws, { parentId, title }); setStored(r.ws); if (parentId) setExpanded(e => ({ ...e, [parentId]: true })); open(r.page.id); }, [ws, setStored, setExpanded, open]);
  if (!ws) return <div className="ntn-loading" role="status">Loading your workspace…</div>;
  const resolve = (t: string) => findByTitle(ws, t)?.id ?? null;
  const tops = children(ws, null); const favs = live(ws).filter(p => p.favorite); const trashed = ws.pages.filter(p => p.trashed && !getPage(ws, p.parentId)?.trashed);

  const Tree = ({ parentId, depth }: { parentId: string | null; depth: number }) => <>{children(ws, parentId).map(p => { const kids = children(ws, p.id); const isOpen = expanded[p.id];
    return <div key={p.id}><div className={"ntn-node" + (page?.id === p.id ? " on" : "")} style={{ paddingLeft: 8 + depth * 14 }} data-testid="tree-node">
      <button className="ntn-node__tw" aria-label={isOpen ? "Collapse" : "Expand"} aria-expanded={!!isOpen} onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}>{kids.length ? (isOpen ? "▾" : "▸") : "·"}</button>
      <Link href={`/app/${p.id}`} className="ntn-node__link" onClick={() => setNavOpen(false)}><span>{p.icon}</span><span className="ntn-node__t">{p.title || "Untitled"}</span></Link>
      <button className="ntn-node__add" aria-label={`Add a page inside ${p.title || "Untitled"}`} title="Add a page inside" onClick={() => newPage(p.id)}>＋</button></div>
      {isOpen && <Tree parentId={p.id} depth={depth + 1} />}</div>; })}</>;

  const env: EditorEnv = {
    resolve, onPage: open, me: demo ? "Demo User" : (name || email.split("@")[0] || "You"), notify,
    pages: live(ws).filter(p => p.id !== page?.id).map(p => ({ id: p.id, title: p.title, icon: p.icon })),
    createSubpage: page ? title => { const id = pid(); commit(w => createPage(w, { id, title, parentId: page.id }).ws); setExpanded(e => ({ ...e, [page.id]: true })); return { id, title, icon: "📄" }; } : undefined,
    moveBlockToPage: (b, pid) => commit(w => { const t = getPage(w, pid); return t ? updatePage(w, pid, { blocks: [...t.blocks.filter(x => !(x.type === "p" && !x.text && t.blocks.length === 1)), b] }) : w; }),
    readOnly: !!page?.locked,
    onFocusTitle: () => { const el = titleRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } },
    onComment: page ? blockId => { setCpane(true); setDraftBlock(blockId); setFocusThread(null); } : undefined,
    comments: page ? Object.fromEntries(openThreads(page).filter(t => t.blockId).map(t => [t.blockId!, (page.threads ?? []).filter(x => x.blockId === t.blockId && !x.resolved).length])) : {},
    onShowComments: page ? blockId => { const t = (page.threads ?? []).find(x => x.blockId === blockId && !x.resolved) ?? (page.threads ?? []).find(x => x.blockId === blockId); setCpane(true); setDraftBlock(null); setFocusThread(t?.id ?? null); } : undefined,
  };
  const me = demo ? "Demo User" : (name || email.split("@")[0] || "You");
  const acts: ThreadActions = {
    reply: (tid, text) => page && commit(w => replyComment(w, page.id, tid, me, text)),
    resolve: (tid, r) => page && commit(w => resolveThread(w, page.id, tid, r)),
    remove: (tid) => page && commit(w => deleteThread(w, page.id, tid)),
    edit: (tid, cid, text) => page && commit(w => editComment(w, page.id, tid, cid, text)),
  };
  const addThread = (blockId: string | null, text: string) => { if (!page) return; const r = addComment(ws, page.id, blockId, me, text); setStored(r.ws); setDraftBlock(null); setPageDraft(false); setFocusThread(r.thread.id); if (blockId) setCpane(true); notify("Comment added"); };
  const useTemplate = (t: Template) => { const r = createFromTemplate(ws, t, me); setStored(r.ws); setGallery(false); notify(`Created “${t.title}” from the template`); open(r.page.id); };
  const jump = (blockId: string) => { document.getElementById(blockId)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const patchPage = (patch: Parameters<typeof updatePage>[2]) => page && commit(w => updatePage(w, page.id, patch));
  const importFile = async (kind: string, f: File) => {
    const text = await f.text(); const name = f.name.replace(/\.[^.]+$/, "");
    if (kind === "csv") { const rows = parseCsv(text); if (!rows.length) { notify("That CSV is empty."); return; } const db = dbFromCsv(name, rows);
      const r = createPage(ws, { title: name, blocks: [mkBlock("table", "", { db }), mkBlock("p")] }); setStored(r.ws); notify(`Imported ${db.rows.length} rows from “${f.name}”`); open(r.page.id); return; }
    const md = kind === "html" ? htmlToMarkdown(text) : textToMarkdown(text); const r = importMarkdown(ws, md); const titled = r.page.title === "Imported page" ? { ...r.ws, pages: r.ws.pages.map(x => x.id === r.page.id ? { ...x, title: name } : x) } : r.ws; setStored(titled); notify(`Imported “${r.page.title === "Imported page" ? name : r.page.title}”`); open(r.page.id);
  };
  const chooseMove = (id: string | null) => { if (!page) return; commit(w => movePage(w, page.id, id)); setMoveOpen(false); notify(id ? `Moved into ${getPage(ws, id)?.title || "Untitled"}` : "Moved to top level"); };

  return <div className="ntn" data-testid="notion-app">
    <aside className={"ntn-side" + (navOpen ? " is-open" : "")}>
      <Popwrap open={pop === "ws"} onClose={closePop} className="ns-wswrap"><div className="ns-ws" role="button" tabIndex={0} aria-haspopup="menu" aria-expanded={pop === "ws"} onClick={() => toggle("ws")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("ws"); } }}><span className="ns-av">{(demo ? "D" : (name || email || "N")[0]).toUpperCase()}</span><b title={email}>{demo ? "Demo's Space" : `${(name || email.split("@")[0]).split(" ")[0]}'s Space`}</b><i>⌄</i></div>
      {pop === "ws" && <div className="ns-wsmenu" role="menu"><div className="hd"><span className="ns-av">{(demo ? "D" : (name || email || "N")[0]).toUpperCase()}</span><span><b>{demo ? "Demo's Space" : `${(name || email.split("@")[0]).split(" ")[0]}'s Space`}</b><small>Free Plan · 1 member</small></span></div><div className="bt"><button>Upgrade</button><button onClick={() => { setSettings(true); closePop(); }}>Settings</button><button>Invite members</button></div><hr /><small className="em">{email || "demo@yourappisdead.com"}</small><button className="sel">✓ {demo ? "Demo's Space" : "My Space"}</button><button>New workspace</button><hr /><form method="post" action={`${BP}/api/session/logout`}><button>Log out</button></form></div>}</Popwrap>
      <div className="ns-tabs">
        <Link className={"ns-home" + (kind === "home" ? " on" : "")} href="/app" onClick={() => setNavOpen(false)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 7.2L8 2.6l5.5 4.6V13H10V9.5H6V13H2.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>Home</Link>
        <span className="ns-ic" title="Chat"><svg width="15" height="15" viewBox="0 0 16 16"><path d="M3 3h10v7H7l-3 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg></span>
        <span className="ns-ic" title="Meetings"><svg width="15" height="15" viewBox="0 0 16 16"><rect x="3" y="2.5" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5.5 6h5M5.5 8.5h5" stroke="currentColor" strokeWidth="1.2" /></svg></span>
        <span className="ns-ic" title="Inbox"><svg width="15" height="15" viewBox="0 0 16 16"><path d="M2.5 9l1.5-5.5h8L13.5 9v4h-11zM2.5 9h3.5l.8 1.5h2.4L10 9h3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg></span>
        <button className="ns-ic ns-search" onClick={() => setSearching(true)} data-testid="open-search" aria-label="Search"><svg width="15" height="15" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.2 10.2L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg></button>
      </div>
      <div className="ns-setup"><span>Set up your workspace</span><i><u /></i></div>
      {favs.length > 0 && <><div className="ntn-label">Favorites</div>{favs.map(p => <Link key={p.id} href={`/app/${p.id}`} className={"ntn-node__link ntn-fav" + (page?.id === p.id ? " on" : "")} onClick={() => setNavOpen(false)}><span>{p.icon}</span><span className="ntn-node__t">{p.title || "Untitled"}</span></Link>)}</>}
      <div className="ntn-label">Private<button className="ntn-label__add" aria-label="Add a page" onClick={() => newPage(null)}>＋</button></div>
      <nav aria-label="Pages" className="ntn-tree" data-testid="page-tree"><Tree parentId={null} depth={0} />{!tops.length && <p className="ids-muted" style={{ padding: "0 12px", fontSize: 13 }}>No pages yet.</p>}</nav>
      <button className="ntn-navbtn ntn-newpage" onClick={() => newPage(null)} data-testid="new-page"><span>＋ Add new</span></button>
      <div className="ns-gap" />
      <span className="ntn-navbtn ns-row"><span>◎ Add agents</span></span>
      <span className="ntn-navbtn ns-row"><span>▤ Try AI Meeting Notes</span></span>
      <span className="ntn-navbtn ns-row"><span>▥ Library</span></span>
      <span className="ntn-navbtn ns-row"><span>? Help</span></span>
      <Popwrap open={pop === "trash"} onClose={closePop}><button className={"ntn-navbtn ntn-trashbtn" + (kind === "trash" || pop === "trash" ? " on" : "")} aria-haspopup="dialog" aria-expanded={pop === "trash"} onClick={() => toggle("trash")}><span>🗑 Trash</span>{trashed.length > 0 && <em>{trashed.length}</em>}</button>
        {pop === "trash" && <TrashPop ws={ws} trashed={trashed} onRestore={id => { commit(w => restorePage(w, id)); notify("Restored"); }} onDelete={id => { commit(w => deleteForever(w, id)); notify("Deleted forever"); }} onEmpty={() => { commit(emptyTrash); notify("Trash emptied"); closePop(); }} onOpenAll={() => { closePop(); setNavOpen(false); router.push("/app/trash"); }} />}</Popwrap>
      <div className="ns-foot"><span className="ns-chat">New chat <kbd>Ctrl+O</kbd></span><span className="ns-fi" /><span className="ns-fi b" /><form method="post" action={`${BP}/api/session/logout`}><button className="ns-out" aria-label="Sign out" title="Sign out">⏻</button></form></div>
    </aside>
    <main className="ntn-main">
      <header className={"ntn-top" + (kind === "home" ? " is-home" : "")}><button className="ntn-burger" aria-label="Open sidebar" onClick={() => setNavOpen(o => !o)}>☰</button>
        <nav className="ntn-crumbs" aria-label="Breadcrumb">{page ? breadcrumb(ws, page.id).map((p, i, a) => <span key={p.id}>{i > 0 && <i>/</i>}<Link href={`/app/${p.id}`}>{p.icon} {p.title || "Untitled"}</Link></span>) : <span>{kind === "trash" ? "🗑️ Trash" : "Home"}</span>}</nav>
        {page && !page.trashed && <div className="ntn-top__actions">
          <span className="ntn-edited" title={`${wordCount(page)} words`}>Edited just now</span>
          <button className={"iconbtn ntn-cbtn" + (cpane ? " on" : "")} aria-label="Comments" aria-pressed={cpane} title="Comments" onClick={() => { setCpane(o => !o); setDraftBlock(null); }}>💬{openThreads(page).length > 0 && <em>{openThreads(page).length}</em>}</button>
          <Popwrap open={pop === "share"} onClose={closePop}><button className="ntn-sharebtn" aria-haspopup="dialog" aria-expanded={pop === "share"} onClick={() => toggle("share")}>🔒︎ Share</button>{pop === "share" && <SharePop page={page} name={demo ? "Demo User" : name} email={email} onClose={closePop} onCopy={() => { navigator.clipboard?.writeText(location.href); closePop(); notify("Link copied"); }} onPublished={pub => commit(w => ({ ...w, pages: w.pages.map(x => x.id === page.id ? { ...x, published: pub } : x) }))} notify={notify} />}</Popwrap>
          <button className="iconbtn" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(location.href); notify("Link copied"); }}>🔗︎</button>
          <button className="iconbtn" aria-pressed={page.favorite} aria-label={page.favorite ? "Remove from favorites" : "Add to favorites"} onClick={() => commit(w => toggleFavorite(w, page.id))}>{page.favorite ? "★" : "☆"}</button>
          <Popwrap open={pop === "menu"} onClose={closePop}><button className="iconbtn" aria-label="Page actions" aria-haspopup="menu" aria-expanded={pop === "menu"} onClick={() => toggle("menu")}>•••</button>
            {pop === "menu" && <PageMenu page={page} ws={ws} onChange={patchPage} onClose={closePop} notify={notify}
              onDuplicate={() => { const r = duplicatePage(ws, page.id); setStored(r.ws); notify("Page duplicated"); open(r.page.id); }} onMove={() => setMoveOpen(true)} onFavorite={() => commit(w => toggleFavorite(w, page.id))}
              onExport={() => setDlg("export")} onImport={() => setDlg("import")} onHistory={() => setDlg("history")} onTrash={() => { commit(w => trashPage(w, page.id)); notify("Moved to Trash"); router.push("/app"); }} />}</Popwrap></div>}
      </header>
      <div className={"ntn-body" + (cpane && page && !page.trashed ? " has-pane" : "")}><div className="ntn-scroll">
        {kind === "home" && <div className="ns-banner" role="note"><span>◌ Home is getting an update in our new sidebar redesign. Opt in to keep your pages, Notion AI, and meetings within reach.</span><a>Learn more</a><i>✕</i></div>}
        {kind === "home" && <Home ws={ws} name={demo ? "there" : (name || email.split("@")[0])} open={open} onNew={() => newPage(null)} onImport={() => setDlg("import")} onTemplate={id => setGallery(id)} />}
        {kind === "trash" && <Trash ws={ws} trashed={trashed} onRestore={id => { commit(w => restorePage(w, id)); notify("Restored"); }} onDelete={id => { commit(w => deleteForever(w, id)); notify("Deleted forever"); }} onEmpty={() => { commit(emptyTrash); notify("Trash emptied"); }} />}
        {missing && <div className="ntn-empty"><h2 className="ids-h2">This page isn't here</h2><p className="ids-muted">It may have been moved to the Trash.</p><Link className="ids-btn ids-btn--outline" href="/app">Back home</Link></div>}
        {page && !page.trashed && page.cover && <Cover page={page} onChange={patchPage} pick={pop === "cover"} onPick={() => toggle("cover")} onClose={closePop} />}
        {page && !page.trashed && <article className={"ntn-page" + (page.font && page.font !== "default" ? " f-" + page.font : "") + (page.smallText ? " is-small" : "") + (page.fullWidth ? " is-wide" : "") + (page.locked ? " is-locked" : "") + (page.cover ? " has-cover" : "")} key={page.id} data-testid="page">
          {page.locked && <div className="ntn-lockbar">🔒 Locked <button type="button" onClick={() => patchPage({ locked: false })}>Unlock</button></div>}
          <Popwrap open={pop === "icon"} onClose={closePop} className="ntn-iconwrap"><button className={"ntn-icon" + (page.icon === "📄" ? " is-def" : "")} aria-label="Change icon" aria-haspopup="menu" aria-expanded={pop === "icon"} onClick={() => toggle("icon")}>{page.icon === "📄" ? "☺ Add icon" : page.icon}</button>
            {pop === "icon" && <div className="ntn-menu ntn-icons" role="menu">{ICONS.map(i => <button key={i} role="menuitem" aria-label={`Icon ${i}`} onClick={() => { commit(w => updatePage(w, page.id, { icon: i })); closePop(); }}>{i}</button>)}</div>}
            {!page.cover && <button className="ntn-icon is-def ntn-addcover" aria-label="Add cover" onClick={() => { patchPage({ cover: COVER_DEFAULT, coverY: 50 }); }}>🖼 Add cover</button>}
            <button className={"ntn-icon is-def ntn-addcmt" + (page.cover ? " has-cover" : "")} aria-label="Add comment" onClick={() => { setPageDraft(true); }}>💬 Add comment</button></Popwrap>
          <input ref={titleRef} className="ntn-title" aria-label="Page title" placeholder="Untitled" value={page.title} readOnly={!!page.locked} onChange={e => commit(w => updatePage(w, page.id, { title: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter" || (e.key === "ArrowDown" && e.currentTarget.selectionStart === page.title.length)) { e.preventDefault(); setFocusFirst(n => n + 1); } }} />
          <EditorCtx.Provider value={env}>
          {(pageDraft || (page.threads ?? []).some(t => !t.blockId && !t.resolved)) && <section className="ntn-pagecmts" aria-label="Page comments" data-testid="page-comments">
            {(page.threads ?? []).filter(t => !t.blockId && !t.resolved).map(t => <ThreadView key={t.id} t={t} page={page} acts={acts} />)}
            {pageDraft ? <div className="ntn-cmt"><span className="ns-av">{me[0].toUpperCase()}</span><CommentBox autoFocus onSend={t => addThread(null, t)} onCancel={() => setPageDraft(false)} /></div> : <button type="button" className="ntn-pagecmts__add" onClick={() => setPageDraft(true)}><span className="ns-av">{me[0].toUpperCase()}</span>Add a comment…</button>}
          </section>}
          <Editor blocks={page.blocks} autoFocusFirst={!page.title} focusFirst={focusFirst} onChange={(b: Block[]) => commit(w => updatePage(w, page.id, { blocks: b.length ? b : [mk("p")] }))} /></EditorCtx.Provider>
          {children(ws, page.id).length > 0 && <section className="ntn-subpages" aria-label="Sub-pages">{children(ws, page.id).map(c => <Link key={c.id} href={`/app/${c.id}`} className="ntn-subpage">{c.icon} {c.title || "Untitled"}</Link>)}</section>}
          {backlinks(ws, page.id).length > 0 && <section className="ntn-backlinks" data-testid="backlinks"><h4>Linked from</h4>{backlinks(ws, page.id).map(b => <Link key={b.id} href={`/app/${b.id}`}>{b.icon} {b.title || "Untitled"}</Link>)}</section>}
        </article>}
      </div>
      {cpane && page && !page.trashed && <EditorCtx.Provider value={env}><CommentsPane page={page} acts={acts} onClose={() => { setCpane(false); setDraftBlock(null); }} onAdd={addThread} focusThread={focusThread} draftBlock={draftBlock} onCancelDraft={() => setDraftBlock(null)} onJump={jump} /></EditorCtx.Provider>}</div>
    </main>
    <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden data-testid="import-file" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const r = importMarkdown(ws, await f.text()); setStored(r.ws); notify(`Imported “${r.page.title}”`); open(r.page.id); e.target.value = ""; }} />
    {searching && <Search ws={ws} onClose={() => setSearching(false)} onOpen={id => { setSearching(false); open(id); }} onCreate={t => { setSearching(false); newPage(null, t); }} />}
    {dlg === "export" && page && <ExportDialog page={page} ws={ws} onClose={() => setDlg(null)} notify={notify} />}
    {dlg === "history" && page && <HistoryDialog page={page} onClose={() => setDlg(null)} onRestore={(snap: Snapshot) => { commit(w => restoreSnapshot(w, page.id, snap)); notify("Version restored"); }} />}
    {dlg === "import" && <ImportDialog onClose={() => setDlg(null)} onFile={importFile} />}
    {gallery !== false && <TemplateGallery initial={gallery ?? undefined} onUse={useTemplate} onClose={() => setGallery(false)} />}
    {settings && <SettingsModal name={demo ? "Demo User" : name} onClose={() => setSettings(false)} />}
    {moveOpen && page && <MoveDialog ws={ws} page={page} onPick={chooseMove} onClose={() => setMoveOpen(false)} />}
    {toast && <div className="ntn-toast" role="status" data-testid="toast">{toast}</div>}
  </div>;
}

function Home({ ws, name, open, onNew, onImport, onTemplate }: { ws: WS; name: string; open: (id: string) => void; onNew: () => void; onImport: () => void; onTemplate: (id: string | null) => void }) {
  const hr = new Date().getHours(); const hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const recent = ws.recent.map(id => getPage(ws, id)).filter((p): p is Page => !!p && !p.trashed);
  const all = [...live(ws)].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 12);
  const list = recent.length ? recent : all;
  return <div className="ntn-home nh" data-testid="home"><h1>{hello}</h1>
    <div className="nh-h">◷ Recently visited</div>
    <div className="nh-rc">{list.slice(0, 4).map(p => <button key={p.id} className="nh-card" onClick={() => open(p.id)}><span className="cv" /><span className="ic">{p.icon}</span><b>{p.title || "Untitled"}</b><small>◷ {p.updatedAt ? "3h ago" : ""}</small></button>)}
      <button className="nh-card nh-new" onClick={onNew}><span className="cv" /><span className="ic">⊞</span><b className="mu">New page</b></button></div>
    <div className="nh-h">▤ Learn</div>
    <div className="nh-lr">{[["What is a block?", "2m read"], ["Create your first page", "2m watch"], ["Create a subpage", "2m read"], ["Customize & style your content", "9m read"]].map(([t, m], i) => <div key={t} className="nh-lc"><span className={"cv c" + i} /><b>{t}</b><small>{m}</small></div>)}</div>
    <div className="nh-h">▦ Upcoming events</div>
    <div className="nh-ev"><div className="l"><i>▦</i><b>Connect AI Meeting Notes<br />with your Calendar events</b><p>Join calls, transcribe audio, and summarize meetings all in Notion.</p><a>Connect Notion Calendar</a></div>
      <div className="r"><div><small>Today<br />Oct 15</small><span><b>Team standup</b><br />9 AM · Office</span></div><div><small>Fri<br />Oct 16</small><span><b>Project check-in</b><br />10 AM · Office</span></div></div></div>
    <div className="nh-h">▥ Featured templates<button type="button" className="nh-more" onClick={() => onTemplate(null)}>Browse all</button></div>
    <div className="nh-lr">{TEMPLATES.slice(0, 4).map(t => <button type="button" key={t.id} className="nh-tp" data-testid="template-card" onClick={() => onTemplate(t.id)}><span className="ic">{t.icon}</span><b>{t.title}</b><small>{t.blurb}</small></button>)}</div>
    <div className="nh-act"><button className="ids-btn ids-btn--outline ids-btn--sm" onClick={onImport}>Import Markdown</button></div>
  </div>;
}
function Trash({ ws, trashed, onRestore, onDelete, onEmpty }: { ws: WS; trashed: Page[]; onRestore: (id: string) => void; onDelete: (id: string) => void; onEmpty: () => void }) {
  return <div className="ntn-home" data-testid="trash"><h1 className="ids-h1" style={{ fontSize: 34 }}>Trash</h1>
    {trashed.length > 0 && <button className="ids-btn ids-btn--outline ids-btn--sm" onClick={onEmpty}>Empty trash</button>}
    <ul className="ntn-trash">{trashed.map(p => <li key={p.id} data-testid="trash-item"><span>{p.icon} {p.title || "Untitled"}{descendants(ws, p.id).length > 0 && <span className="ids-muted"> + {descendants(ws, p.id).length} sub-page(s)</span>}</span>
      <button className="ids-btn ids-btn--outline ids-btn--sm" onClick={() => onRestore(p.id)}>Restore</button><button className="ids-btn ids-btn--ghost ids-btn--sm" onClick={() => onDelete(p.id)}>Delete forever</button></li>)}</ul>
    {!trashed.length && <p className="ids-muted">Trash is empty.</p>}</div>;
}
function Search({ ws, onClose, onOpen, onCreate }: { ws: WS; onClose: () => void; onOpen: (id: string) => void; onCreate: (t: string) => void }) {
  const [q, setQ] = useState(""); const [i, setI] = useState(0); const ref = useRef<HTMLInputElement>(null); useEffect(() => ref.current?.focus(), []); const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  const hits = useMemo(() => q.trim() ? searchPages(ws, q) : ws.recent.map(id => getPage(ws, id)).filter((p): p is Page => !!p && !p.trashed).map(page => ({ page, snippet: "", where: "title" as const })), [ws, q]);
  const rows = [...hits.map(h => ({ key: h.page.id, label: `${h.page.icon} ${h.page.title || "Untitled"}`, sub: h.snippet, run: () => onOpen(h.page.id) })), ...(q.trim() ? [{ key: "new", label: `＋ Create page “${q.trim()}”`, sub: "", run: () => onCreate(q.trim()) }] : [])];
  return <div className="ntn-overlay"><div ref={box} className="ntn-search" role="dialog" aria-label="Search">
    <input ref={ref} aria-label="Search pages" placeholder="Search or jump to…" value={q} onChange={e => { setQ(e.target.value); setI(0); }} onKeyDown={e => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowDown") { e.preventDefault(); setI(x => Math.min(x + 1, rows.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setI(x => Math.max(0, x - 1)); } else if (e.key === "Enter") { e.preventDefault(); rows[i]?.run(); } }} />
    <ul role="listbox">{!q.trim() && rows.length > 0 && <li className="ntn-search__h">Recent</li>}{rows.map((r, n) => <li key={r.key} role="option" aria-selected={n === i} className={n === i ? "on" : ""} onMouseEnter={() => setI(n)} onClick={r.run}><span>{r.label}</span>{r.sub && <small>{r.sub}</small>}</li>)}{!rows.length && <li className="ntn-search__h">Type to search your pages</li>}</ul></div></div>;
}
function MoveDialog({ ws, page, onPick, onClose }: { ws: WS; page: Page; onPick: (id: string | null) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose); const bad = new Set([page.id, ...descendants(ws, page.id).map(d => d.id)]); const opts = live(ws).filter(p => !bad.has(p.id));
  return <div className="ntn-overlay"><div ref={box} className="ntn-search" role="dialog" aria-label="Move to">
    <div className="ntn-search__h" style={{ padding: "12px 16px" }}>Move “{page.title || "Untitled"}” to…</div>
    <ul><li role="option" aria-selected={false} onClick={() => onPick(null)}>🏠 Top level</li>{opts.map(p => <li key={p.id} role="option" aria-selected={false} onClick={() => onPick(p.id)}>{p.icon} {p.title || "Untitled"}</li>)}</ul></div></div>;
}

const SET_NAV: [string, string[]][] = [["", ["Search settings"]], ["Account", ["Preferences", "Notifications", "Mail & Calendar"]], ["Workspace", ["General", "People", "Import"]], ["Features", ["Notion AI", "Meeting notes", "Connections", "Notion MCP", "Public pages", "Emoji", "Developer"]], ["Admin", ["Teamspaces"]], ["Access & billing", ["Upgrade plan"]]];
function SettingsModal({ name, onClose }: { name: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  const Sel = ({ t }: { t: string }) => <span className="sel">{t} ⌄</span>; const Tg = ({ on }: { on?: boolean }) => <span className={"tg" + (on ? " on" : "")}><i /></span>;
  const Row = ({ t, d, c }: { t: string; d: string; c: React.ReactNode }) => <div className="row"><div><b>{t}</b><small>{d}</small></div>{c}</div>;
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ns-set" role="dialog" aria-label="Settings">
    <nav>{SET_NAV.map(([h, items]) => <div key={h}>{h && <h6>{h}</h6>}{items.map((i, n) => <a key={i} className={i === "Preferences" ? "on" : i === "Search settings" ? "ss" : ""}>{h === "Account" && n === 0 ? <span className="ns-av">{(name || "N")[0]}</span> : null}{h === "Account" && n === 0 ? name : i}</a>)}</div>)}</nav>
    <section><button className="x" onClick={onClose} aria-label="Close">✕</button>
      <h2>Preferences</h2><p className="sub">Choose how you want Notion to look and behave</p>
      <h3>Appearance</h3><Row t="Theme" d="Choose a theme for Notion on this device" c={<Sel t="Use system setting" />} /><Row t="High contrast" d="Increase contrast for improved visibility" c={<Sel t="Use system setting" />} />
      <h3>Input options</h3><Row t="Use Enter to add a new line" d="Applies to chat, comments, and other input fields. Press Cmd/Ctrl + Enter to send." c={<Tg />} />
      <h3>Language & time</h3><Row t="Language" d="Choose the language you want Notion in use" c={<Sel t="English (US)" />} /><Row t="Number format" d="Choose how numbers and currencies are formatted. Default uses your language setting." c={<Sel t="Default" />} />
      <Row t="Always show text direction controls" d="Show the option to change text direction (left to right or right to left) in the editor, regardless of what language you are using" c={<Tg />} /><Row t="Start week on Monday" d="This will affect the way your calendars appear in Notion" c={<Tg />} />
      <Row t="Date format" d="Set the default format for new @date mentions" c={<Sel t="Relative" />} /><Row t="Set time zone automatically using your location" d="Reminders, notifications, and emails will be delivered to you based on your time zone" c={<Tg on />} /><Row t="Time zone" d="Choose your time zone" c={<Sel t="(GMT-4:00) New York" />} />
    </section></div></div>;
}
