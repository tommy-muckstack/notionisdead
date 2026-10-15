"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { BP } from "@/lib/basepath";
import { IMPORT_SOURCES } from "@/lib/notion/importers";
import { markdownBundle, zipBytes } from "@/lib/notion/export";
import { breadcrumb, children as kidsOf, createSpace, deleteSpace, getPage, live, relTime, searchPages, updateSpace, type Page, type Prefs, type Space, type Workspace as WS } from "@/lib/notion/pages";
import { download } from "./PageChrome";

const GH = "https://github.com/tommy-muckstack/notionisdead";
import { SHORTCUTS } from "@/lib/notion/shortcuts";
export { SHORTCUTS };

/** Small anchored panel used by Help, Inbox, Set up and the out-of-scope stubs. */
export function Pop({ title, onClose, children, className, wide }: { title?: string; onClose: () => void; children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={"ntn-menu ns-pop" + (wide ? " wide" : "") + (className ? " " + className : "")} role="dialog" aria-label={title}>{title && <div className="ns-pop__hd"><b>{title}</b><button type="button" className="x" aria-label="Close" onClick={onClose}>✕</button></div>}{children}</div>;
}
/** Out-of-scope features (AI chat, agents, meeting notes, mail/calendar): a labelled explanation, never a dead click. */
export function StubPop({ feature, onClose }: { feature: string; onClose: () => void }) {
  return <Pop title={feature} onClose={onClose} className="ns-stub"><p><b>Not part of the open-source version.</b> {feature} in Notion relies on hosted AI models and third-party integrations. NotionIsDead keeps your pages in your browser and ships no AI features.</p><p><a href={GH + "#readme"} target="_blank" rel="noreferrer">What NotionIsDead does include →</a></p></Pop>;
}
/** Modal variant of the stub (sidebar rows that aren't anchored popovers). */
export function StubModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ns-stubwrap"><StubPop feature={feature} onClose={onClose} /></div></div>;
}
export function HelpPop({ onClose, onShortcuts, onWelcome }: { onClose: () => void; onShortcuts: () => void; onWelcome: () => void }) {
  return <Pop title="Help" onClose={onClose}>
    <button type="button" onClick={() => { onShortcuts(); onClose(); }}>⌨ Keyboard shortcuts</button>
    <button type="button" onClick={() => { onWelcome(); onClose(); }}>👋 Getting started guide</button>
    <a href={GH + "#readme"} target="_blank" rel="noreferrer">📘 Help &amp; documentation ↗</a>
    <a href={GH + "/commits/main"} target="_blank" rel="noreferrer">✨ What&apos;s new ↗</a>
    <a href={GH + "/issues/new"} target="_blank" rel="noreferrer">🐛 Report a bug ↗</a>
    <a href="https://yourappisdead.com" target="_blank" rel="noreferrer">🪦 More IsDead apps ↗</a>
    <small className="ids-muted">Open source · Apache-2.0 · not affiliated with Notion</small></Pop>;
}
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ntn-dlg ns-keys" role="dialog" aria-label="Keyboard shortcuts"><div className="hd"><b>Keyboard shortcuts</b><button type="button" className="x" aria-label="Close" onClick={onClose}>✕</button></div><dl>{SHORTCUTS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl></div></div>;
}
/** Set up your workspace: a real checklist computed from the workspace. */
export function setupSteps(ws: WS): { id: string; label: string; done: boolean }[] {
  const pages = live(ws);
  return [
    { id: "page", label: "Create a page", done: pages.some(p => !/^(Welcome to NotionIsDead|To-do List)$/.test(p.title)) },
    { id: "icon", label: "Add an icon or a cover", done: pages.some(p => (p.icon && p.icon !== "📄") || p.cover) },
    { id: "blocks", label: "Use the slash menu (two block types on one page)", done: pages.some(p => new Set(p.blocks.map(b => b.type)).size >= 2) },
    { id: "db", label: "Create a database", done: pages.some(p => p.blocks.some(b => b.type === "table" || b.type === "board")) },
    { id: "share", label: "Export or publish a page", done: pages.some(p => !!p.published) },
  ];
}
export function SetupPop({ ws, onClose, onDismiss, onNew }: { ws: WS; onClose: () => void; onDismiss: () => void; onNew: () => void }) {
  const steps = setupSteps(ws); const done = steps.filter(s => s.done).length;
  return <Pop title="Set up your workspace" onClose={onClose}><div className="ns-setup__bar"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div><small className="ids-muted">{done} of {steps.length} done</small>
    <ul className="ns-steps">{steps.map(s => <li key={s.id} className={s.done ? "done" : ""}><span>{s.done ? "✓" : "○"}</span>{s.label}</li>)}</ul>
    <div className="ns-pop__acts"><button type="button" onClick={() => { onNew(); onClose(); }}>＋ New page</button><button type="button" className="lnk" onClick={() => { onDismiss(); onClose(); }}>Hide this</button></div></Pop>;
}
/** Inbox: comments and mentions across your pages, newest first. */
export function InboxPop({ ws, me, onClose, onOpen }: { ws: WS; me: string; onClose: () => void; onOpen: (pageId: string, threadId?: string) => void }) {
  const items = useMemo(() => live(ws).flatMap(p => (p.threads ?? []).flatMap(t => t.messages.map(m => ({ page: p, thread: t, m, mention: m.text.includes(`@[${me}]`) })))).sort((a, b) => +new Date(b.m.at) - +new Date(a.m.at)).slice(0, 30), [ws, me]);
  return <Pop title="Inbox" onClose={onClose} wide>{items.length ? <ul className="ns-inbox">{items.map(i => <li key={i.m.id}><button type="button" onClick={() => { onOpen(i.page.id, i.thread.id); onClose(); }}><span className="ns-av">{i.m.author[0]?.toUpperCase()}</span><span className="t"><b>{i.m.author}</b> {i.mention ? "mentioned you in" : i.thread.resolved ? "resolved a comment on" : "commented on"} <b>{i.page.icon} {i.page.title || "Untitled"}</b><small>{i.m.text.slice(0, 90)}</small></span><small className="when">{relTime(i.m.at)}</small></button></li>)}</ul> : <p className="ids-muted">Nothing here yet. Comments and @mentions on your pages show up in the inbox.</p>}</Pop>;
}

/** Search (⌘K / ⌘P): filters Title only · Created by · In · Date, recents when empty, breadcrumbs on hits. */
export function Search({ ws, me, onClose, onOpen, onCreate }: { ws: WS; me: string; onClose: () => void; onOpen: (id: string) => void; onCreate: (t: string) => void }) {
  const [q, setQ] = useState(""); const [i, setI] = useState(0); const ref = useRef<HTMLInputElement>(null); useEffect(() => ref.current?.focus(), []); const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  const [titleOnly, setTitleOnly] = useState(false); const [inPage, setInPage] = useState<string | null>(null); const [since, setSince] = useState<number | null>(null); const [by, setBy] = useState<"any" | "me">("any"); const [pickIn, setPickIn] = useState(false);
  const hits = useMemo(() => q.trim() ? searchPages(ws, q, { titleOnly, inPage, since }) : ws.recent.map(id => getPage(ws, id)).filter((p): p is Page => !!p && !p.trashed).map(page => ({ page, snippet: "", where: "title" as const })), [ws, q, titleOnly, inPage, since]);
  const crumbs = (p: Page) => breadcrumb(ws, p.id).slice(0, -1).map(x => x.title || "Untitled").join(" / ");
  const rows = [...hits.map(h => ({ key: h.page.id, icon: h.page.icon, label: h.page.title || "Untitled", sub: h.snippet || crumbs(h.page), when: relTime(h.page.updatedAt), run: () => onOpen(h.page.id) })), ...(q.trim() ? [{ key: "new", icon: "＋", label: `Create page “${q.trim()}”`, sub: "", when: "", run: () => onCreate(q.trim()) }] : [])];
  const inTitle = inPage ? getPage(ws, inPage)?.title || "Untitled" : null;
  return <div className="ntn-overlay"><div ref={box} className="ntn-search" role="dialog" aria-label="Search">
    <input ref={ref} aria-label="Search pages" placeholder={`Search ${ws.name || "your workspace"}…`} value={q} onChange={e => { setQ(e.target.value); setI(0); }} onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setI(x => Math.min(x + 1, rows.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setI(x => Math.max(0, x - 1)); } else if (e.key === "Enter") { e.preventDefault(); rows[i]?.run(); } }} />
    <div className="ntn-search__filters" data-testid="search-filters">
      <button type="button" className={titleOnly ? "on" : ""} aria-pressed={titleOnly} onClick={() => setTitleOnly(t => !t)}>Title only</button>
      <select aria-label="Created by" value={by} onChange={e => setBy(e.target.value as "any" | "me")}><option value="any">Created by</option><option value="me">{me} (you)</option></select>
      <span className="ntn-popwrap"><button type="button" className={inPage ? "on" : ""} aria-pressed={!!inPage} aria-haspopup="listbox" onClick={() => setPickIn(p => !p)}>In{inTitle ? `: ${inTitle}` : ""} ⌄</button>
        {pickIn && <div className="ntn-menu ntn-search__in" role="listbox" aria-label="Search in page"><button type="button" role="option" aria-selected={!inPage} onClick={() => { setInPage(null); setPickIn(false); }}>Everywhere</button>{live(ws).slice(0, 30).map(p => <button type="button" key={p.id} role="option" aria-selected={inPage === p.id} onClick={() => { setInPage(p.id); setPickIn(false); }}>{p.icon} {p.title || "Untitled"}{kidsOf(ws, p.id).length > 0 && <small> +{kidsOf(ws, p.id).length} sub-pages</small>}</button>)}</div>}</span>
      <select aria-label="Date" value={since ?? ""} onChange={e => setSince(e.target.value ? +e.target.value : null)}><option value="">Date</option><option value="1">Edited today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
      {(titleOnly || inPage || since) && <button type="button" className="clr" onClick={() => { setTitleOnly(false); setInPage(null); setSince(null); }}>Clear</button>}
    </div>
    <ul role="listbox">{!q.trim() && rows.length > 0 && <li className="ntn-search__h">Recent</li>}{rows.map((r, n) => <li key={r.key} role="option" aria-selected={n === i} className={n === i ? "on" : ""} onMouseEnter={() => setI(n)} onClick={r.run}><span className="ic">{r.icon}</span><span className="tx"><span>{r.label}</span>{r.sub && <small>{r.sub}</small>}</span>{r.when && <small className="when">{r.when}</small>}</li>)}{!rows.length && <li className="ntn-search__h">{q.trim() ? "No results" : "Type to search your pages"}</li>}</ul></div></div>;
}

// ---- Settings: every tab is a pane ----
type Tab = "account" | "preferences" | "notifications" | "mail" | "general" | "people" | "import" | "ai" | "meetings" | "connections" | "public" | "teamspaces" | "upgrade";
const NAV: [string, [Tab, string][]][] = [["Account", [["account", "My account"], ["preferences", "Preferences"], ["notifications", "Notifications"], ["mail", "Mail & Calendar"]]], ["Workspace", [["general", "General"], ["people", "People"], ["import", "Import"]]], ["Features", [["ai", "Notion AI"], ["meetings", "Meeting notes"], ["connections", "Connections"], ["public", "Public pages"]]], ["Admin", [["teamspaces", "Teamspaces"]]], ["Access & billing", [["upgrade", "Upgrade plan"]]]];
export type SettingsProps = { ws: WS; name: string; email: string; guest: boolean; onClose: () => void; onWs: (f: (w: WS) => WS) => void; onImport: (kind: string, f: File) => void; onReset: () => void; onUnpublish: (pageId: string) => void; notify: (m: string) => void; initial?: Tab; onOpenPage: (id: string) => void };
export function SettingsModal({ ws, name, email, guest, onClose, onWs, onImport, onReset, onUnpublish, notify, initial = "preferences", onOpenPage }: SettingsProps) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose); const [tab, setTab] = useState<Tab>(initial); const [q, setQ] = useState(""); const [confirm, setConfirm] = useState(false); const fileRef = useRef<HTMLInputElement>(null); const [kind, setKind] = useState<string | null>(null); const [newSpace, setNewSpace] = useState("");
  const prefs: Prefs = ws.prefs ?? {}; const setPref = (p: Partial<Prefs>) => onWs(w => ({ ...w, prefs: { ...w.prefs, ...p } }));
  const Sel = ({ v, opts, onChange, label }: { v: string; opts: [string, string][]; onChange: (v: string) => void; label: string }) => <select className="sel" aria-label={label} value={v} onChange={e => onChange(e.target.value)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  const Tg = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => <button type="button" role="switch" aria-checked={on} aria-label={label} className={"tg" + (on ? " on" : "")} onClick={onToggle}><i /></button>;
  const Row = ({ t, d, c }: { t: string; d?: string; c: React.ReactNode }) => <div className="row"><div><b>{t}</b>{d && <small>{d}</small>}</div>{c}</div>;
  const Stub = ({ what }: { what: string }) => <div className="ns-set__stub"><b>Not part of the open-source version.</b><p>{what} relies on hosted services NotionIsDead doesn&apos;t run. Your pages stay in your browser; export, publish or import them any time.</p><a href={GH + "#readme"} target="_blank" rel="noreferrer">See what is included ↗</a></div>;
  const filtered = NAV.map(([h, items]) => [h, items.filter(([, l]) => !q || l.toLowerCase().includes(q.toLowerCase()) || h.toLowerCase().includes(q.toLowerCase()))] as [string, [Tab, string][]]).filter(([, items]) => items.length);
  const published = live(ws).filter(p => p.published); const src = IMPORT_SOURCES.find(s => s.id === kind);
  const pane = () => {
    switch (tab) {
      case "account": return <><h2>My account</h2><p className="sub">How you appear in comments and mentions</p><h3>Profile</h3><Row t="Preferred name" d="Used for @mentions and comments on this device" c={<input className="inp" aria-label="Preferred name" value={prefs.preferredName ?? name} onChange={e => setPref({ preferredName: e.target.value })} />} /><Row t="Email" d={guest ? "Guest session: sign in to attach an email" : "From your sign-in"} c={<span className="ids-muted">{email || "—"}</span>} />
        <h3>Account security</h3><Row t="Password" d="Passwords are managed by the shared IsDead sign-in" c={<Link className="sel" href="/login?mode=reset">Change password</Link>} /><h3>Support</h3><Row t="Log out" d="Ends this session on this device" c={<form method="post" action={`${BP}/api/session/logout`}><button className="sel" type="submit">Log out</button></form>} /></>;
      case "preferences": return <><h2>Preferences</h2><p className="sub">Choose how you want NotionIsDead to look and behave</p>
        <h3>Appearance</h3><Row t="Theme" d="Light is the only theme shipped so far; a dark theme is tracked on GitHub" c={<Sel label="Theme" v="light" opts={[["light", "Light"]]} onChange={() => {}} />} />
        <h3>Input options</h3><Row t="Use Enter to add a new line" d="Applies to comments. Press ⌘/Ctrl + Enter to send." c={<Tg label="Use Enter to add a new line" on={!!prefs.enterNewline} onToggle={() => setPref({ enterNewline: !prefs.enterNewline })} />} />
        <h3>Language & time</h3><Row t="Language" d="English (US) is the only language shipped" c={<Sel label="Language" v="en-US" opts={[["en-US", "English (US)"]]} onChange={() => {}} />} /><Row t="Start week on Monday" d="Affects calendar views" c={<Tg label="Start week on Monday" on={!!prefs.weekStartsMonday} onToggle={() => setPref({ weekStartsMonday: !prefs.weekStartsMonday })} />} /><Row t="Date format" d="How @date mentions and timestamps read" c={<Sel label="Date format" v={prefs.dateFormat ?? "relative"} opts={[["relative", "Relative (3h ago)"], ["absolute", "Absolute (Oct 15, 2026)"]]} onChange={v => setPref({ dateFormat: v as Prefs["dateFormat"] })} />} /></>;
      case "notifications": return <><h2>Notifications</h2><p className="sub">Comments and mentions land in the sidebar Inbox</p><h3>Inbox</h3><Row t="Show an unread badge on the Inbox" d="Counts comments on your pages from the last 7 days" c={<Tg label="Inbox badge" on={prefs.inboxBadge !== false} onToggle={() => setPref({ inboxBadge: prefs.inboxBadge === false })} />} /><h3>Email</h3><p className="ids-muted">No email notifications: NotionIsDead has no mail server. Everything stays in the Inbox.</p></>;
      case "mail": return <><h2>Mail & Calendar</h2><p className="sub">Connect Notion Mail and Notion Calendar</p><Stub what="Mail and Calendar sync" /></>;
      case "general": return <><h2>General</h2><p className="sub">Workspace settings</p><h3>Workspace settings</h3><Row t="Name" d="Shows in the sidebar and in search" c={<input className="inp" aria-label="Workspace name" value={ws.name ?? ""} placeholder={`${(prefs.preferredName ?? name).split(" ")[0]}'s Space`} onChange={e => onWs(w => ({ ...w, name: e.target.value }))} />} /><Row t="Icon" d="One emoji or letter" c={<input className="inp sm" aria-label="Workspace icon" value={ws.icon ?? ""} placeholder={(ws.name || name || "N")[0].toUpperCase()} maxLength={2} onChange={e => onWs(w => ({ ...w, icon: e.target.value }))} />} />
        <h3>Export</h3><Row t="Export all workspace content" d="Every page as Markdown, databases as CSV, in a zip" c={<button type="button" className="sel" onClick={() => { const files = kidsOf(ws, null).flatMap(p => markdownBundle(ws, p, true)); if (!files.length) { notify("Nothing to export yet."); return; } download(`${(ws.name || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`, zipBytes(files), "application/zip"); notify("Export ready"); }}>Export all</button>} />
        <h3>Danger zone</h3><Row t="Delete all content" d="Removes every page, database and comment in this workspace from this browser. Export first." c={confirm ? <span className="ns-confirm"><button type="button" className="sel danger" onClick={() => { onReset(); setConfirm(false); onClose(); }}>Yes, delete everything</button><button type="button" className="sel" onClick={() => setConfirm(false)}>Cancel</button></span> : <button type="button" className="sel danger" onClick={() => setConfirm(true)}>Delete workspace content</button>} /></>;
      case "people": return <><h2>People</h2><p className="sub">Members of this workspace</p><div className="ns-people"><div><span className="ns-av">{(prefs.preferredName ?? name)[0]?.toUpperCase()}</span><span><b>{prefs.preferredName ?? name} (You)</b><small>{email || (guest ? "Guest session" : "")}</small></span><em>Workspace owner</em></div></div>
        <h3>Invite members</h3><p className="ids-muted">Pages live in your browser, so there is no one else to invite yet. Share work by publishing a page (Share → Publish) or exporting it. Multi-user workspaces need a sync server, which is the next item on the roadmap.</p><a className="sel" href={GH + "/issues"} target="_blank" rel="noreferrer">Follow progress on GitHub ↗</a></>;
      case "import": return <><h2>Import</h2><p className="sub">Bring content from other tools into NotionIsDead</p><div className="ntn-imp"><div className="grid">{IMPORT_SOURCES.map(s => <button type="button" key={s.id} className={!s.accept ? "is-stub" : ""} title={s.note} onClick={() => { setKind(s.id); if (s.accept) setTimeout(() => fileRef.current?.click(), 0); }}><span>{s.icon}</span><b>{s.name}</b>{!s.accept && <small>{s.note}</small>}</button>)}</div>
        {src?.accept && <input ref={fileRef} type="file" accept={src.accept} hidden aria-label="Import file" onChange={e => { const f = e.target.files?.[0]; if (f) { onImport(src.id, f); onClose(); } e.target.value = ""; }} />}{src && !src.accept && <p className="ntn-imp__note">{src.icon} <b>{src.name}</b>: {src.note}.</p>}</div></>;
      case "ai": return <><h2>Notion AI</h2><Stub what="Notion AI (writing, Q&A and agents)" /></>;
      case "meetings": return <><h2>Meeting notes</h2><Stub what="AI meeting notes (audio transcription and summaries)" /></>;
      case "connections": return <><h2>Connections</h2><p className="sub">Apps connected to this workspace</p><Stub what="Third-party connections (Slack, GitHub, Google Drive…)" /></>;
      case "public": return <><h2>Public pages</h2><p className="sub">Pages published to the web from Share → Publish</p>{published.length ? <ul className="ns-pub">{published.map(p => <li key={p.id}><button type="button" className="lnk" onClick={() => { onOpenPage(p.id); onClose(); }}>{p.icon} {p.title || "Untitled"}</button><a href={`${BP}/p/${p.id}`} target="_blank" rel="noreferrer">View ↗</a><button type="button" className="sel" onClick={() => onUnpublish(p.id)}>Unpublish</button></li>)}</ul> : <p className="ids-muted">No published pages yet.</p>}</>;
      case "teamspaces": return <><h2>Teamspaces</h2><p className="sub">Group pages by team or project. Pages outside a teamspace are Private.</p><ul className="ns-spaces">{(ws.spaces ?? []).map(s => <li key={s.id}><input className="inp sm" aria-label="Teamspace icon" value={s.icon} maxLength={2} onChange={e => onWs(w => updateSpace(w, s.id, { icon: e.target.value }))} /><input className="inp" aria-label="Teamspace name" value={s.name} onChange={e => onWs(w => updateSpace(w, s.id, { name: e.target.value }))} /><small className="ids-muted">{live(ws).filter(p => p.spaceId === s.id).length} pages</small><button type="button" className="sel danger" onClick={() => { onWs(w => deleteSpace(w, s.id)); notify(`Teamspace “${s.name}” removed; its pages are Private again`); }}>Delete</button></li>)}{!(ws.spaces ?? []).length && <li className="ids-muted">No teamspaces yet.</li>}</ul>
        <form className="ns-newspace" onSubmit={e => { e.preventDefault(); if (!newSpace.trim()) return; onWs(w => createSpace(w, newSpace.trim()).ws); setNewSpace(""); notify("Teamspace created"); }}><input className="inp" aria-label="New teamspace name" placeholder="New teamspace name" value={newSpace} onChange={e => setNewSpace(e.target.value)} /><button type="submit" className="sel">Create teamspace</button></form></>;
      case "upgrade": return <><h2>Upgrade plan</h2><p className="sub">There is nothing to upgrade to</p><div className="ns-plan"><b>Free, forever</b><p>Unlimited pages, blocks, databases, exports and publishing. No seats, no trials. See how that compares with Notion&apos;s plans.</p><Link className="sel" href="/pricing">See the price comparison</Link><a className="sel" href={GH} target="_blank" rel="noreferrer">Star the repo instead ↗</a></div></>;
    }
  };
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ns-set" role="dialog" aria-label="Settings">
    <nav><input className="ss" aria-label="Search settings" placeholder="Search settings" value={q} onChange={e => setQ(e.target.value)} />{filtered.map(([h, items]) => <div key={h}><h6>{h}</h6>{items.map(([id, l]) => <button type="button" key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{id === "account" ? <span className="ns-av">{(prefs.preferredName ?? name)[0]?.toUpperCase()}</span> : null}{id === "account" ? (prefs.preferredName ?? name) : l}</button>)}</div>)}</nav>
    <section data-testid="settings-pane" data-tab={tab}><button className="x" onClick={onClose} aria-label="Close">✕</button>{pane()}</section></div></div>;
}
export type { Tab as SettingsTab, Space };
