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
import { seedWorkspace, starterWorkspace } from "@/lib/notion/seed";
import { HelpPop, InboxPop, Search, SetupPop, SettingsModal, ShortcutsDialog, StubModal, StubPop, setupSteps, type SettingsTab } from "./Shell";
import { createSpace, relTime, type Space } from "@/lib/notion/pages";
import { dateOf, dateEnd, migrateDb, rowTitle } from "@/lib/notion/db";
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

type Pop = null | "ws" | "share" | "menu" | "icon" | "cover" | "trash" | "help" | "inbox" | "setup" | "chat" | "meetings";
const COVER_DEFAULT = "g:2";
const cloneDeep = (b: Block): Block => ({ ...b, id: bid(), kids: b.kids?.map(cloneDeep), cols: b.cols?.map(c => c.map(cloneDeep)), db: b.db ? { ...b.db, rows: b.db.rows.map(r => ({ ...r, id: bid() })) } : undefined });
const ICONS = ["📄", "📝", "📚", "🧭", "🗓️", "✅", "💡", "🎯", "🚀", "🧪", "🎨", "📌", "🏠", "💼", "📊", "🔖"];

export type WsRef = { id: string; name: string };
/** Several local workspaces per user: the default one lives under "ws", others under "ws:<id>". Switching remounts the inner component. */
export function Workspace(props: { uid: string; name: string; email: string; demo: boolean; view: string[]; guest?: boolean }) {
  const [list, setList] = useLocal<WsRef[]>(props.uid, "wsList", []); const [active, setActive, ready] = useLocal<string>(props.uid, "activeWs", "");
  if (!ready) return <div className="ntn-loading" role="status">Loading your workspace…</div>;
  return <WorkspaceInner key={active || "default"} {...props} storeKey={active ? `ws:${active}` : "ws"} wsList={list} activeWs={active} onSwitch={id => setActive(id)} onNewWs={name => { const id = `w${Date.now().toString(36)}`; setList(l => [...l, { id, name }]); setActive(id); }} onRenameWs={(id, name) => setList(l => l.map(w => w.id === id ? { ...w, name } : w))} />;
}
function WorkspaceInner({ uid, name, email, demo, view, guest, storeKey, wsList, activeWs, onSwitch, onNewWs, onRenameWs }: { uid: string; name: string; email: string; demo: boolean; view: string[]; guest?: boolean; storeKey: string; wsList: WsRef[]; activeWs: string; onSwitch: (id: string) => void; onNewWs: (name: string) => void; onRenameWs: (id: string, name: string) => void }) {
  const router = useRouter();
  const [stored, setStored, ready] = useLocal<WS | null>(uid, storeKey, null);
  const [expanded, setExpanded] = useLocal<Record<string, boolean>>(uid, "expanded", {});
  const [searching, setSearching] = useState(false); const [toast, setToast] = useState(""); const [navOpen, setNavOpen] = useState(false); const [moveOpen, setMoveOpen] = useState(false); const [settings, setSettings] = useState(false);
  // One popover at a time (QA #16): a single slot; opening one replaces another, Escape/click-away clears it.
  const [pop, setPop] = useState<Pop>(null); const [cpane, setCpane] = useState(false); const [draftBlock, setDraftBlock] = useState<string | null>(null); const [focusThread, setFocusThread] = useState<string | null>(null); const [pageDraft, setPageDraft] = useState(false); const [gallery, setGallery] = useState<string | null | false>(false); const [dlg, setDlg] = useState<null | "export" | "history" | "import" | "shortcuts">(null); const params = useSearchParams(); const [settingsTab, setSettingsTab] = useState<SettingsTab>("preferences"); const [stub, setStub] = useState<string | null>(null); const toggle = (k: NonNullable<Pop>) => setPop(p => (p === k ? null : k)); const closePop = useCallback(() => setPop(null), []);
  const fileRef = useRef<HTMLInputElement>(null); const titleRef = useRef<HTMLInputElement>(null); const [focusFirst, setFocusFirst] = useState(0);
  useEffect(() => { if (ready && !stored) setStored(demo ? seedWorkspace() : starterWorkspace(name || email.split("@")[0] || "You")); }, [ready, stored, demo, setStored]); // eslint-disable-line
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
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "p") && !(e.target instanceof HTMLTextAreaElement && (e.target as HTMLTextAreaElement).selectionStart !== (e.target as HTMLTextAreaElement).selectionEnd)) { e.preventDefault(); setSearching(true); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const open = useCallback((id: string) => { setNavOpen(false); router.push(`/app/${id}`); }, [router]);
  const dup = params.get("dup");
  useEffect(() => { if (!ws || !dup) return; (async () => { try { const r = await fetch(`${BP}/api/publish?id=${encodeURIComponent(dup)}`); const j = await r.json(); if (!r.ok || !j.duplicable) { notify("That page can't be duplicated."); router.replace("/app"); return; }
    const pg = j.page; const r2 = createPage(ws, { title: pg.title, icon: pg.icon, blocks: (pg.blocks as Block[]).map(cloneDeep) }); setStored({ ...r2.ws, pages: r2.ws.pages.map(x => x.id === r2.page.id ? { ...x, cover: pg.cover, coverY: pg.coverY, font: pg.font, smallText: pg.smallText, fullWidth: pg.fullWidth } : x) }); notify("Page duplicated into your workspace"); router.replace(`/app/${r2.page.id}`); } catch { notify("Could not load that page."); router.replace("/app"); } })(); }, [ws ? 1 : 0, dup]); // eslint-disable-line
  const newPage = useCallback((parentId: string | null = null, title = "") => { if (!ws) return; const r = createPage(ws, { parentId, title }); setStored(r.ws); if (parentId) setExpanded(e => ({ ...e, [parentId]: true })); open(r.page.id); }, [ws, setStored, setExpanded, open]);
  if (!ws) return <div className="ntn-loading" role="status">Loading your workspace…</div>;
  const resolve = (t: string) => findByTitle(ws, t)?.id ?? null;
  const tops = children(ws, null); const favs = live(ws).filter(p => p.favorite); const trashed = ws.pages.filter(p => p.trashed && !getPage(ws, p.parentId)?.trashed);

  const Tree = ({ parentId, depth, spaceId = null }: { parentId: string | null; depth: number; spaceId?: string | null }) => <>{children(ws, parentId, parentId === null ? spaceId : undefined).map(p => { const kids = children(ws, p.id); const isOpen = expanded[p.id];
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
  const me = demo ? "Demo User" : (ws.prefs?.preferredName || name || email.split("@")[0] || "You");
  const wsName = ws.name || (demo ? "Demo's Space" : `${me.split(" ")[0]}'s Space`); const wsIcon = ws.icon || wsName[0].toUpperCase(); const spaces = ws.spaces ?? [];
  const inboxCount = ws.prefs?.inboxBadge === false ? 0 : live(ws).flatMap(p => (p.threads ?? []).flatMap(t => t.messages)).filter(m => Date.now() - +new Date(m.at) < 7 * 86400e3).length;
  const openSettings = (tab: SettingsTab = "preferences") => { setSettingsTab(tab); setSettings(true); closePop(); };
  const welcome = () => { const w = live(ws).find(p => p.title === "Welcome to NotionIsDead") ?? live(ws).find(p => p.title === "Getting started"); if (w) open(w.id); else { const r = createPage(ws, { title: "Welcome to NotionIsDead", icon: "👋", blocks: starterWorkspace(me).pages[0].blocks }); setStored(r.ws); open(r.page.id); } };
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
  const chooseMove = (id: string | null, spaceId?: string | null) => { if (!page) return; commit(w => movePage(w, page.id, id, spaceId)); setMoveOpen(false); if (spaceId) setExpanded(e => ({ ...e, [spaceId]: true })); notify(id ? `Moved into ${getPage(ws, id)?.title || "Untitled"}` : spaceId ? `Moved to ${spaces.find(s => s.id === spaceId)?.name}` : "Moved to Private"); };

  return <div className="ntn" data-testid="notion-app">
    <aside className={"ntn-side" + (navOpen ? " is-open" : "")}>
      <Popwrap open={pop === "ws"} onClose={closePop} className="ns-wswrap"><div className="ns-ws" role="button" tabIndex={0} aria-haspopup="menu" aria-expanded={pop === "ws"} onClick={() => toggle("ws")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("ws"); } }}><span className="ns-av">{wsIcon}</span><b title={email}>{wsName}</b><i>⌄</i></div>
      {pop === "ws" && <div className="ns-wsmenu" role="menu" data-testid="ws-menu"><div className="hd"><span className="ns-av">{wsIcon}</span><span><b>{wsName}</b><small>Free plan · {live(ws).length} pages · 1 member</small></span></div><div className="bt"><Link href="/pricing" onClick={closePop}>Upgrade</Link><button onClick={() => openSettings("preferences")}>Settings</button><button onClick={() => openSettings("people")}>Invite members</button></div><hr /><small className="em">{email || (guest ? "Guest session" : "demo@yourappisdead.com")}</small>
        <button className={activeWs ? "" : "sel"} onClick={() => { router.push("/app"); onSwitch(""); closePop(); }}>{activeWs ? "　" : "✓ "}{demo ? "Demo's Space" : (wsList.length ? "Main workspace" : wsName)}</button>{wsList.map(w => <button key={w.id} className={activeWs === w.id ? "sel" : ""} onClick={() => { router.push("/app"); onSwitch(w.id); closePop(); }}>{activeWs === w.id ? "✓ " : "　"}{w.name}</button>)}
        <button onClick={() => { router.push("/app"); onNewWs(`Workspace ${wsList.length + 2}`); closePop(); notify("New workspace created. Rename it in Settings → General."); }}>＋ New workspace</button><hr /><form method="post" action={`${BP}/api/session/logout`}><button>Log out</button></form></div>}</Popwrap>
      <div className="ns-tabs">
        <Link className={"ns-home" + (kind === "home" ? " on" : "")} href="/app" onClick={() => setNavOpen(false)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 7.2L8 2.6l5.5 4.6V13H10V9.5H6V13H2.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>Home</Link>
        <Popwrap open={pop === "chat"} onClose={closePop}><button className="ns-ic" title="Chat" aria-label="Chat" aria-expanded={pop === "chat"} onClick={() => toggle("chat")}><svg width="15" height="15" viewBox="0 0 16 16"><path d="M3 3h10v7H7l-3 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg></button>{pop === "chat" && <StubPop feature="Notion AI chat" onClose={closePop} />}</Popwrap>
        <Popwrap open={pop === "meetings"} onClose={closePop}><button className="ns-ic" title="Meetings" aria-label="Meetings" aria-expanded={pop === "meetings"} onClick={() => toggle("meetings")}><svg width="15" height="15" viewBox="0 0 16 16"><rect x="3" y="2.5" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5.5 6h5M5.5 8.5h5" stroke="currentColor" strokeWidth="1.2" /></svg></button>{pop === "meetings" && <StubPop feature="AI Meeting Notes" onClose={closePop} />}</Popwrap>
        <Popwrap open={pop === "inbox"} onClose={closePop}><button className={"ns-ic" + (pop === "inbox" ? " on" : "")} title="Inbox" aria-label="Inbox" aria-expanded={pop === "inbox"} onClick={() => toggle("inbox")}><svg width="15" height="15" viewBox="0 0 16 16"><path d="M2.5 9l1.5-5.5h8L13.5 9v4h-11zM2.5 9h3.5l.8 1.5h2.4L10 9h3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>{inboxCount > 0 && <em className="ns-badge" aria-label={`${inboxCount} new`}>{inboxCount}</em>}</button>{pop === "inbox" && <InboxPop ws={ws} me={me} onClose={closePop} onOpen={(pid, tid) => { open(pid); setCpane(true); setFocusThread(tid ?? null); }} />}</Popwrap>
        <button className="ns-ic ns-search" onClick={() => setSearching(true)} data-testid="open-search" aria-label="Search"><svg width="15" height="15" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.2 10.2L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg></button>
      </div>
      {!ws.prefs?.setupDismissed && (() => { const st = setupSteps(ws); const done = st.filter(x => x.done).length; return <Popwrap open={pop === "setup"} onClose={closePop}><button type="button" className="ns-setup" aria-expanded={pop === "setup"} onClick={() => toggle("setup")}><span>Set up your workspace</span><i><u style={{ width: `${Math.max(8, (done / st.length) * 100)}%` }} /></i></button>{pop === "setup" && <SetupPop ws={ws} onClose={closePop} onDismiss={() => commit(w => ({ ...w, prefs: { ...w.prefs, setupDismissed: true } }))} onNew={() => newPage(null)} />}</Popwrap>; })()}
      {favs.length > 0 && <><div className="ntn-label">Favorites</div>{favs.map(p => <Link key={p.id} href={`/app/${p.id}`} className={"ntn-node__link ntn-fav" + (page?.id === p.id ? " on" : "")} onClick={() => setNavOpen(false)}><span>{p.icon}</span><span className="ntn-node__t">{p.title || "Untitled"}</span></Link>)}</>}
      <div className="ntn-label">Private<button className="ntn-label__add" aria-label="Add a page" onClick={() => newPage(null)}>＋</button></div>
      <nav aria-label="Pages" className="ntn-tree" data-testid="page-tree"><Tree parentId={null} depth={0} />{!tops.length && <p className="ids-muted" style={{ padding: "0 12px", fontSize: 13 }}>No pages yet.</p>}</nav>
      <button className="ntn-navbtn ntn-newpage" onClick={() => newPage(null)} data-testid="new-page"><span>＋ Add new</span></button>
      <div className="ntn-label">Teamspaces<button className="ntn-label__add" aria-label="Create a teamspace" title="Create a teamspace" onClick={() => { const r = createSpace(ws, `Team ${spaces.length + 1}`); setStored(r.ws); setExpanded(e => ({ ...e, [r.space.id]: true })); notify("Teamspace created. Rename it in Settings → Teamspaces."); }}>＋</button></div>
      <nav aria-label="Teamspaces" className="ntn-tree ntn-spaces" data-testid="teamspaces">{spaces.map(sp => <div key={sp.id}><div className="ntn-node ntn-space" data-testid="teamspace"><button className="ntn-node__tw" aria-label={expanded[sp.id] ? "Collapse" : "Expand"} aria-expanded={!!expanded[sp.id]} onClick={() => setExpanded(e => ({ ...e, [sp.id]: !e[sp.id] }))}>{expanded[sp.id] ? "▾" : "▸"}</button><button className="ntn-node__link ntn-space__name" onClick={() => setExpanded(e => ({ ...e, [sp.id]: !e[sp.id] }))}><span className="ns-av sm">{sp.icon}</span><span className="ntn-node__t">{sp.name}</span></button><button className="ntn-node__add" aria-label={`Add a page in ${sp.name}`} title="Add a page" onClick={() => { const r = createPage(ws, { spaceId: sp.id }); setStored(r.ws); setExpanded(e => ({ ...e, [sp.id]: true })); open(r.page.id); }}>＋</button></div>
        {expanded[sp.id] && <Tree parentId={null} depth={1} spaceId={sp.id} />}{expanded[sp.id] && !children(ws, null, sp.id).length && <p className="ids-muted" style={{ padding: "0 12px 4px 30px", fontSize: 12.5 }}>No pages yet.</p>}</div>)}{!spaces.length && <p className="ids-muted" style={{ padding: "0 12px", fontSize: 12.5 }}>Press ＋ to create a teamspace. Pages here are Private.</p>}</nav>
      <div className="ns-gap" />
      <button className="ntn-navbtn ns-row" onClick={() => setStub("Custom agents")}><span>◎ Add agents</span></button>
      <button className="ntn-navbtn ns-row" onClick={() => setStub("AI Meeting Notes")}><span>▤ Try AI Meeting Notes</span></button>
      <button className="ntn-navbtn ns-row" onClick={() => setGallery(null)}><span>▥ Library</span></button>
      <button className="ntn-navbtn ns-row" onClick={() => openSettings("preferences")}><span>⚙ Settings</span></button>
      <Popwrap open={pop === "help"} onClose={closePop}><button className={"ntn-navbtn ns-row" + (pop === "help" ? " on" : "")} aria-haspopup="dialog" aria-expanded={pop === "help"} onClick={() => toggle("help")}><span>? Help</span></button>{pop === "help" && <HelpPop onClose={closePop} onShortcuts={() => setDlg("shortcuts")} onWelcome={welcome} />}</Popwrap>
      <Popwrap open={pop === "trash"} onClose={closePop}><button className={"ntn-navbtn ntn-trashbtn" + (kind === "trash" || pop === "trash" ? " on" : "")} aria-haspopup="dialog" aria-expanded={pop === "trash"} onClick={() => toggle("trash")}><span>🗑 Trash</span>{trashed.length > 0 && <em>{trashed.length}</em>}</button>
        {pop === "trash" && <TrashPop ws={ws} trashed={trashed} onRestore={id => { commit(w => restorePage(w, id)); notify("Restored"); }} onDelete={id => { commit(w => deleteForever(w, id)); notify("Deleted forever"); }} onEmpty={() => { commit(emptyTrash); notify("Trash emptied"); closePop(); }} onOpenAll={() => { closePop(); setNavOpen(false); router.push("/app/trash"); }} />}</Popwrap>
      <div className="ns-foot"><button type="button" className="ns-chat" onClick={() => setStub("Notion AI chat")}>New chat <kbd>Ctrl+O</kbd></button><span className="ns-fi" /><span className="ns-fi b" /><form method="post" action={`${BP}/api/session/logout`}><button className="ns-out" aria-label="Sign out" title="Sign out">⏻</button></form></div>
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
        {kind === "home" && !ws.prefs?.bannerDismissed && <div className="ns-banner" role="note"><span>◌ Your pages live in this browser. Export or publish them from the ••• menu to take them anywhere.</span><button type="button" onClick={welcome}>Learn more</button><button type="button" className="x" aria-label="Dismiss" onClick={() => commit(w => ({ ...w, prefs: { ...w.prefs, bannerDismissed: true } }))}>✕</button></div>}
        {kind === "home" && <Home ws={ws} name={demo ? "there" : me.split(" ")[0]} open={open} onNew={() => newPage(null)} onImport={() => setDlg("import")} onTemplate={id => setGallery(id)} onLearn={welcome} />}
        {kind === "trash" && <Trash ws={ws} trashed={trashed} onRestore={id => { commit(w => restorePage(w, id)); notify("Restored"); }} onDelete={id => { commit(w => deleteForever(w, id)); notify("Deleted forever"); }} onEmpty={() => { commit(emptyTrash); notify("Trash emptied"); }} />}
        {missing && <div className="ntn-empty"><h2 className="ids-h2">This page couldn&apos;t be found.</h2><p className="ids-muted">It may have been moved to the Trash, deleted, or the link is wrong.</p><Link className="ids-btn ids-btn--outline" href="/app">Back to my content</Link></div>}
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
    {searching && <Search ws={ws} me={me} onClose={() => setSearching(false)} onOpen={id => { setSearching(false); open(id); }} onCreate={t => { setSearching(false); newPage(null, t); }} />}
    {dlg === "shortcuts" && <ShortcutsDialog onClose={() => setDlg(null)} />}
    {stub && <StubModal feature={stub} onClose={() => setStub(null)} />}
    {dlg === "export" && page && <ExportDialog page={page} ws={ws} onClose={() => setDlg(null)} notify={notify} />}
    {dlg === "history" && page && <HistoryDialog page={page} onClose={() => setDlg(null)} onRestore={(snap: Snapshot) => { commit(w => restoreSnapshot(w, page.id, snap)); notify("Version restored"); }} />}
    {dlg === "import" && <ImportDialog onClose={() => setDlg(null)} onFile={importFile} />}
    {gallery !== false && <TemplateGallery initial={gallery ?? undefined} onUse={useTemplate} onClose={() => setGallery(false)} />}
    {settings && <SettingsModal ws={ws} name={me} email={email} guest={!!guest} initial={settingsTab} onClose={() => setSettings(false)} onWs={commit} onImport={importFile} onReset={() => { setStored(emptyWorkspace()); router.push("/app"); notify("Workspace content deleted"); }} onUnpublish={async id => { await fetch(`${BP}/api/publish?id=${id}`, { method: "DELETE" }); commit(w => ({ ...w, pages: w.pages.map(x => x.id === id ? { ...x, published: undefined } : x) })); notify("Unpublished"); }} notify={notify} onOpenPage={open} />}
    {moveOpen && page && <MoveDialog ws={ws} page={page} onPick={chooseMove} onClose={() => setMoveOpen(false)} />}
    {toast && <div className="ntn-toast" role="status" data-testid="toast">{toast}</div>}
  </div>;
}

function Home({ ws, name, open, onNew, onImport, onTemplate, onLearn }: { ws: WS; name: string; open: (id: string) => void; onNew: () => void; onImport: () => void; onTemplate: (id: string | null) => void; onLearn: () => void }) {
  const hr = new Date().getHours(); const hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const recent = ws.recent.map(id => getPage(ws, id)).filter((p): p is Page => !!p && !p.trashed);
  const all = [...live(ws)].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 12);
  const list = recent.length ? recent : all;
  // Upcoming: rows of any database with a date in the next 14 days (what Notion fills from Calendar).
  const today = new Date().toISOString().slice(0, 10); const limit = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const upcoming = live(ws).flatMap(p => p.blocks.filter(b => b.type === "table" || b.type === "board").flatMap(b => { const d = migrateDb(b.db, b.type === "board"); const dp = d.props.find(x => x.type === "date"); if (!dp) return []; return d.rows.map(r => ({ page: p, title: rowTitle(d, r) || "Untitled", start: dateOf(r.cells[dp.id]), end: dateEnd(r.cells[dp.id]) })).filter(x => x.start && x.start >= today && x.start <= limit); })).sort((a, b) => a.start!.localeCompare(b.start!)).slice(0, 5);
  const fmtDay = (d: string) => { const x = new Date(d + "T12:00:00"); return [d === today ? "Today" : x.toLocaleDateString("en-US", { weekday: "short" }), x.toLocaleDateString("en-US", { month: "short", day: "numeric" })]; };
  return <div className="ntn-home nh" data-testid="home"><h1>{hello}{name && name !== "there" ? `, ${name}` : ""}</h1>
    <div className="nh-h">◷ Recently visited</div>
    <div className="nh-rc">{list.slice(0, 4).map(p => <button key={p.id} className="nh-card" onClick={() => open(p.id)}><span className="cv" style={p.cover ? { background: `var(--nt-blue-bg)` } : undefined} /><span className="ic">{p.icon}</span><b>{p.title || "Untitled"}</b><small data-testid="visited">◷ {relTime(ws.visits?.[p.id] ?? p.updatedAt)}</small></button>)}
      <button className="nh-card nh-new" onClick={onNew}><span className="cv" /><span className="ic">⊞</span><b className="mu">New page</b></button></div>
    <div className="nh-h">▤ Learn</div>
    <div className="nh-lr">{[["What is a block?", "1m read"], ["Create your first page", "1m read"], ["Create a subpage", "1m read"], ["Customize & style your content", "2m read"]].map(([t, m], i) => <button type="button" key={t} className="nh-lc" onClick={onLearn}><span className={"cv c" + i} /><b>{t}</b><small>{m}</small></button>)}</div>
    <div className="nh-h">▦ Upcoming</div>
    <div className="nh-ev"><div className="l"><i>▦</i><b>Dates from your databases<br />show up here</b><p>Add a Date property to any database (or create a Calendar view) and rows due in the next two weeks are listed on the right.</p><button type="button" className="lnk" onClick={() => onTemplate("meeting-notes")}>Start from the Meeting Notes template</button></div>
      <div className="r" data-testid="upcoming">{upcoming.length ? upcoming.map(u => { const [a, b] = fmtDay(u.start!); return <div key={u.page.id + u.title + u.start}><small>{a}<br />{b}</small><span><b>{u.title}</b><br /><button type="button" className="lnk" onClick={() => open(u.page.id)}>{u.page.icon} {u.page.title || "Untitled"}</button>{u.end && u.end !== u.start ? ` · until ${fmtDay(u.end)[1]}` : ""}</span></div>; }) : <p className="ids-muted">Nothing due in the next 14 days.</p>}</div></div>
    <div className="nh-h">▥ Featured templates<button type="button" className="nh-more" onClick={() => onTemplate(null)}>Browse all</button></div>
    <div className="nh-lr">{TEMPLATES.slice(0, 4).map(t => <button type="button" key={t.id} className="nh-tp" data-testid="template-card" onClick={() => onTemplate(t.id)}><span className="ic">{t.icon}</span><b>{t.title}</b><small>{t.blurb}</small></button>)}</div>
    <div className="nh-act"><button className="ids-btn ids-btn--outline ids-btn--sm" onClick={onImport}>Import</button></div>
  </div>;
}
function Trash({ ws, trashed, onRestore, onDelete, onEmpty }: { ws: WS; trashed: Page[]; onRestore: (id: string) => void; onDelete: (id: string) => void; onEmpty: () => void }) {
  return <div className="ntn-home" data-testid="trash"><h1 className="ids-h1" style={{ fontSize: 34 }}>Trash</h1>
    {trashed.length > 0 && <button className="ids-btn ids-btn--outline ids-btn--sm" onClick={onEmpty}>Empty trash</button>}
    <ul className="ntn-trash">{trashed.map(p => <li key={p.id} data-testid="trash-item"><span>{p.icon} {p.title || "Untitled"}{descendants(ws, p.id).length > 0 && <span className="ids-muted"> + {descendants(ws, p.id).length} sub-page(s)</span>}</span>
      <button className="ids-btn ids-btn--outline ids-btn--sm" onClick={() => onRestore(p.id)}>Restore</button><button className="ids-btn ids-btn--ghost ids-btn--sm" onClick={() => onDelete(p.id)}>Delete forever</button></li>)}</ul>
    {!trashed.length && <p className="ids-muted">Trash is empty.</p>}</div>;
}
function MoveDialog({ ws, page, onPick, onClose }: { ws: WS; page: Page; onPick: (id: string | null, spaceId?: string | null) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose); const bad = new Set([page.id, ...descendants(ws, page.id).map(d => d.id)]); const opts = live(ws).filter(p => !bad.has(p.id));
  return <div className="ntn-overlay"><div ref={box} className="ntn-search" role="dialog" aria-label="Move to">
    <div className="ntn-search__h" style={{ padding: "12px 16px" }}>Move “{page.title || "Untitled"}” to…</div>
    <ul><li role="option" aria-selected={false} onClick={() => onPick(null, null)}>🔒 Private (top level)</li>{(ws.spaces ?? []).map(s => <li key={s.id} role="option" aria-selected={false} onClick={() => onPick(null, s.id)}>{s.icon} {s.name} <small>teamspace</small></li>)}{opts.map(p => <li key={p.id} role="option" aria-selected={false} onClick={() => onPick(p.id)}>{p.icon} {p.title || "Untitled"}</li>)}</ul></div></div>;
}
