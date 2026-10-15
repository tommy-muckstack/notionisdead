"use client";
import { useEffect, useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { BP } from "@/lib/basepath";
import { blocksToMarkdown } from "@/lib/notion/blocks";
import { COVER_GALLERY, coverCss, htmlBundle, markdownBundle, pageHtml, pagePdf, slugify, zipBytes, type ExportOpts } from "@/lib/notion/export";
import { IMPORT_SOURCES } from "@/lib/notion/importers";
import { children, descendants, type Page, type Snapshot, type Workspace } from "@/lib/notion/pages";
import { Popwrap } from "./Popwrap";

export const download = (name: string, data: string | Uint8Array, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data as BlobPart], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
const MAX_UPLOAD = 1_500_000;

/** Page cover with Change cover (Gallery / Upload / Link / Remove) and Reposition (drag vertically). */
export function Cover({ page, onChange, pick, onPick, onClose }: { page: Page; onChange: (patch: Partial<Page>) => void; pick: boolean; onPick: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<"gallery" | "upload" | "link">("gallery"); const [url, setUrl] = useState(""); const [repo, setRepo] = useState<number | null>(null); const fileRef = useRef<HTMLInputElement>(null); const drag = useRef<{ y0: number; v0: number } | null>(null);
  const upload = (f: File | undefined) => { if (!f) return; if (f.size > MAX_UPLOAD) { alert("Keep covers under 1.5 MB (stored in your browser)."); return; } const r = new FileReader(); r.onload = () => { onChange({ cover: String(r.result), coverY: 50 }); onClose(); }; r.readAsDataURL(f); };
  return <div className={"ntn-cover" + (repo !== null ? " is-repo" : "")} data-testid="cover" style={{ background: coverCss(page.cover), backgroundPosition: `center ${repo ?? page.coverY ?? 50}%` }}
    onPointerDown={e => { if (repo === null || (e.target as HTMLElement).closest("button")) return; drag.current = { y0: e.clientY, v0: repo }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
    onPointerMove={e => { if (repo === null || !drag.current) return; setRepo(Math.max(0, Math.min(100, drag.current.v0 - (e.clientY - drag.current.y0) / 2))); }} onPointerUp={() => { drag.current = null; }}>
    {repo !== null ? <div className="ntn-cover__repo"><span>Drag image to reposition</span><button type="button" onClick={() => { onChange({ coverY: Math.round(repo) }); setRepo(null); }}>Save position</button><button type="button" onClick={() => setRepo(null)}>Cancel</button></div>
      : <div className="ntn-cover__acts"><Popwrap open={pick} onClose={onClose}><button type="button" onClick={onPick} aria-expanded={pick}>Change cover</button>
        {pick && <div className="ntn-menu ntn-coverpick" role="dialog" aria-label="Change cover">
          <div className="tabs">{(["gallery", "upload", "link"] as const).map(t => <button type="button" key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}<button type="button" className="rm" onClick={() => { onChange({ cover: undefined, coverY: undefined }); onClose(); }}>Remove</button></div>
          {tab === "gallery" && <div className="grid">{COVER_GALLERY.map(g => <button type="button" key={g.id} aria-label={g.name} title={g.name} className={page.cover === g.id ? "on" : ""} style={{ background: g.css }} onClick={() => { onChange({ cover: g.id, coverY: 50 }); onClose(); }} />)}</div>}
          {tab === "upload" && <div className="up"><button type="button" className="ntn-media__btn" onClick={() => fileRef.current?.click()}>Upload file</button><small>Images under 1.5 MB (stored in your browser).</small><input ref={fileRef} type="file" accept="image/*" hidden aria-label="Upload cover" onChange={e => upload(e.target.files?.[0])} /></div>}
          {tab === "link" && <form className="up" onSubmit={e => { e.preventDefault(); if (url.trim()) { onChange({ cover: /^https?:\/\//.test(url) ? url.trim() : `https://${url.trim()}`, coverY: 50 }); onClose(); } }}><input autoFocus aria-label="Image link" placeholder="Paste an image link…" value={url} onChange={e => setUrl(e.target.value)} /><button type="submit" className="ntn-media__btn">Submit</button></form>}
        </div>}</Popwrap><button type="button" onClick={() => setRepo(page.coverY ?? 50)}>Reposition</button></div>}
  </div>;
}

export type PageMenuProps = { page: Page; ws: Workspace; onChange: (patch: Partial<Page>) => void; onClose: () => void; onDuplicate: () => void; onMove: () => void; onTrash: () => void; onExport: () => void; onImport: () => void; onHistory: () => void; onFavorite: () => void; notify: (m: string) => void };
/** Page ••• menu, after notion.com/help: Font, Small text, Full width, Lock, Favorite, Copy link, Duplicate, Move to, Export, Import, Page history, Move to Trash. */
export function PageMenu({ page, onChange, onClose, onDuplicate, onMove, onTrash, onExport, onImport, onHistory, onFavorite, notify }: PageMenuProps) {
  const Tg = ({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) => <button role="menuitemcheckbox" aria-checked={on} onClick={onToggle}><span>{label}</span><i className={"tg" + (on ? " on" : "")}><b /></i></button>;
  return <div className="ntn-menu ntn-menu--right ntn-pmenu" role="menu" data-testid="page-menu">
    <div className="ntn-slash__h">Style</div>
    <div className="fonts">{(["default", "serif", "mono"] as const).map(f => <button key={f} type="button" role="menuitemradio" aria-checked={(page.font ?? "default") === f} className={"f-" + f + ((page.font ?? "default") === f ? " on" : "")} onClick={() => onChange({ font: f })}><b>Ag</b><small>{f[0].toUpperCase() + f.slice(1)}</small></button>)}</div>
    <Tg on={!!page.smallText} label="Small text" onToggle={() => onChange({ smallText: !page.smallText })} /><Tg on={!!page.fullWidth} label="Full width" onToggle={() => onChange({ fullWidth: !page.fullWidth })} /><Tg on={!!page.locked} label="Lock page" onToggle={() => { onChange({ locked: !page.locked }); notify(page.locked ? "Page unlocked" : "Page locked"); }} />
    <div className="ntn-menu__sep" />
    <button role="menuitem" onClick={() => { onFavorite(); onClose(); }}><span>{page.favorite ? "★ Remove from Favorites" : "☆ Add to Favorites"}</span></button>
    <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(location.href); notify("Link copied"); onClose(); }}><span>🔗︎ Copy link</span></button>
    <button role="menuitem" onClick={() => { onDuplicate(); onClose(); }}><span>⧉ Duplicate</span></button>
    <button role="menuitem" onClick={() => { onMove(); onClose(); }}><span>→ Move to</span></button>
    <div className="ntn-menu__sep" />
    <button role="menuitem" onClick={() => { onExport(); onClose(); }}><span>↓ Export</span></button>
    <button role="menuitem" onClick={() => { onImport(); onClose(); }}><span>↑ Import</span></button>
    <button role="menuitem" onClick={() => { onHistory(); onClose(); }}><span>🕘 Page history</span><i>{page.history?.length ?? 0}</i></button>
    <div className="ntn-menu__sep" />
    <button role="menuitem" className="is-danger" onClick={() => { onTrash(); onClose(); }}><span>🗑 Move to Trash</span></button>
    <small className="ntn-pmenu__meta">Word count {page.blocks.map(b => b.text).join(" ").split(/\s+/).filter(Boolean).length} · Edited {new Date(page.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
  </div>;
}

/** Export dialog: Markdown & CSV / HTML / PDF with Notion's options (include content, page format, scale, include subpages). */
export function ExportDialog({ page, ws, onClose, notify }: { page: Page; ws: Workspace; onClose: () => void; notify: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  const [fmt, setFmt] = useState<"md" | "html" | "pdf">("md"); const [media, setMedia] = useState(true); const [sub, setSub] = useState(false); const [pf, setPf] = useState<"letter" | "a4">("letter"); const [scale, setScale] = useState(100); const [busy, setBusy] = useState(false);
  const subCount = descendants(ws, page.id).filter(p => !p.trashed).length; const o: ExportOpts = { media, subpages: sub, pageFormat: pf, scale };
  const run = async () => {
    setBusy(true); try {
      const base = slugify(page.title);
      if (fmt === "md") { const files = markdownBundle(ws, page, sub); if (files.length === 1) download(files[0].name, files[0].data, "text/markdown"); else download(base + ".zip", zipBytes(files), "application/zip"); }
      else if (fmt === "html") { const files = htmlBundle(ws, page, o); if (files.length === 1) download(files[0].name, files[0].data, "text/html"); else download(base + ".zip", zipBytes(files), "application/zip"); }
      else download(base + ".pdf", await pagePdf(ws, page, o), "application/pdf");
      notify("Export ready"); onClose();
    } catch (e) { notify("Export failed: " + String((e as Error).message ?? e)); } finally { setBusy(false); }
  };
  const Row = ({ t, c }: { t: string; c: React.ReactNode }) => <div className="row"><span>{t}</span>{c}</div>;
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ntn-dlg" role="dialog" aria-label="Export" data-testid="export-dialog">
    <Row t="Export format" c={<select aria-label="Export format" value={fmt} onChange={e => setFmt(e.target.value as typeof fmt)}><option value="md">Markdown & CSV</option><option value="html">HTML</option><option value="pdf">PDF</option></select>} />
    {fmt !== "md" && <Row t="Include content" c={<select aria-label="Include content" value={media ? "all" : "none"} onChange={e => setMedia(e.target.value === "all")}><option value="all">Everything</option><option value="none">No files or images</option></select>} />}
    {fmt === "pdf" && <><Row t="Page format" c={<select aria-label="Page format" value={pf} onChange={e => setPf(e.target.value as typeof pf)}><option value="letter">Letter</option><option value="a4">A4</option></select>} /><Row t="Scale percent" c={<input aria-label="Scale percent" type="number" min={50} max={150} value={scale} onChange={e => setScale(+e.target.value || 100)} />} /></>}
    <Row t={`Include subpages${subCount ? ` (${subCount})` : ""}`} c={<label className="sw"><input type="checkbox" aria-label="Include subpages" checked={sub} onChange={e => setSub(e.target.checked)} disabled={!subCount} /><i /></label>} />
    {fmt === "pdf" && <p className="ids-muted sm">PDF uses built-in fonts: emoji and non-Latin characters are left out. Use HTML for an exact copy.</p>}
    <div className="acts"><button type="button" onClick={onClose}>Cancel</button><button type="button" className="go" disabled={busy} onClick={run}>{busy ? "Exporting…" : "Export"}</button></div>
  </div></div>;
}

export function HistoryDialog({ page, onClose, onRestore }: { page: Page; onClose: () => void; onRestore: (s: Snapshot) => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose); const snaps = [...(page.history ?? [])].reverse(); const [i, setI] = useState(-1);
  const cur: Snapshot = { at: page.updatedAt, title: page.title, blocks: page.blocks }; const sel = i < 0 ? cur : snaps[i];
  const when = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ntn-dlg ntn-hist" role="dialog" aria-label="Page history" data-testid="history-dialog">
    <aside><h6>Page history</h6><button type="button" className={i < 0 ? "on" : ""} onClick={() => setI(-1)}>Current version<small>{when(cur.at)}</small></button>{snaps.map((s, n) => <button type="button" key={s.at + n} className={i === n ? "on" : ""} onClick={() => setI(n)}>{when(s.at)}<small>{s.title || "Untitled"} · {s.blocks.length} blocks</small></button>)}
      {!snaps.length && <p className="ids-muted sm">Versions are kept as you edit (one every 10 minutes, up to 20).</p>}</aside>
    <section><div className="hd"><b>{sel.title || "Untitled"}</b><span className="ids-muted">{when(sel.at)}</span>{i >= 0 && <button type="button" className="go" onClick={() => { onRestore(sel); onClose(); }}>Restore this version</button>}<button type="button" className="x" aria-label="Close" onClick={onClose}>✕</button></div>
      <pre>{blocksToMarkdown(sel.blocks) || "(empty)"}</pre></section>
  </div></div>;
}

export function ImportDialog({ onClose, onFile }: { onClose: () => void; onFile: (kind: string, file: File) => void }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose); const fileRef = useRef<HTMLInputElement>(null); const [kind, setKind] = useState<string | null>(null);
  const src = IMPORT_SOURCES.find(s => s.id === kind);
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ntn-dlg ntn-imp" role="dialog" aria-label="Import" data-testid="import-dialog">
    <div className="hd"><b>Import</b><button type="button" className="x" aria-label="Close" onClick={onClose}>✕</button></div>
    <div className="grid">{IMPORT_SOURCES.map(s => <button type="button" key={s.id} className={!s.accept ? "is-stub" : ""} title={s.note} onClick={() => { setKind(s.id); if (s.accept) setTimeout(() => fileRef.current?.click(), 0); }}><span>{s.icon}</span><b>{s.name}</b>{!s.accept && <small>{s.note}</small>}</button>)}</div>
    {src?.accept && <input ref={fileRef} type="file" accept={src.accept} hidden aria-label="Import file" data-testid="import-file" onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(src.id, f); onClose(); } e.target.value = ""; }} />}
    {src && !src.accept && <p className="ntn-imp__note">{src.icon} <b>{src.name}</b>: {src.note}.</p>}
    <p className="ids-muted sm">Imported pages land at the top level of your workspace. Markdown, HTML, plain text and CSV are converted in your browser; nothing is uploaded.</p>
  </div></div>;
}

/** Trash popover (sidebar): search, restore, delete forever, empty trash. */
export function TrashPop({ ws, trashed, onRestore, onDelete, onEmpty, onOpenAll }: { ws: Workspace; trashed: Page[]; onRestore: (id: string) => void; onDelete: (id: string) => void; onEmpty: () => void; onOpenAll: () => void }) {
  const [q, setQ] = useState(""); const ref = useRef<HTMLInputElement>(null); useEffect(() => ref.current?.focus(), []);
  const list = trashed.filter(p => !q || (p.title || "Untitled").toLowerCase().includes(q.toLowerCase()));
  return <div className="ntn-menu ntn-trashpop" role="dialog" aria-label="Trash" data-testid="trash-pop">
    <input ref={ref} aria-label="Search pages in Trash" placeholder="Search pages in Trash" value={q} onChange={e => setQ(e.target.value)} />
    <div className="list">{list.map(p => <div key={p.id} className="item" data-testid="trash-item"><span className="t">{p.icon} {p.title || "Untitled"}{children(ws, p.id).length + descendants(ws, p.id).length > 0 && <small> · {descendants(ws, p.id).length} sub-page(s)</small>}</span>
      <button type="button" aria-label={`Restore ${p.title || "Untitled"}`} title="Restore" onClick={() => onRestore(p.id)}>↩</button><button type="button" aria-label={`Delete ${p.title || "Untitled"} forever`} title="Delete forever" onClick={() => onDelete(p.id)}>🗑</button></div>)}
      {!list.length && <p className="ids-muted sm">{trashed.length ? "No pages match." : "Trash is empty. Pages you delete stay here until you empty the trash."}</p>}</div>
    <div className="ft"><button type="button" onClick={onOpenAll}>Open Trash page</button>{trashed.length > 0 && <button type="button" className="is-danger" onClick={onEmpty}>Empty trash</button>}</div>
  </div>;
}

/** Share popover with Share and Publish tabs. Publishing stores a read-only copy on the server at /p/<id>. */
export function SharePop({ page, name, email, onClose, onCopy, onPublished, notify }: { page: Page; name: string; email: string; onClose: () => void; onCopy: () => void; onPublished: (p: Page["published"] | undefined) => void; notify: (m: string) => void }) {
  const [tab, setTab] = useState<"share" | "publish">("share"); const [busy, setBusy] = useState(false); const pub = page.published;
  const url = typeof location !== "undefined" ? `${location.origin}${BP}/p/${page.id}` : `${BP}/p/${page.id}`;
  const stale = pub && +new Date(page.updatedAt) > +new Date(pub.at);
  const call = async (body: Record<string, unknown>) => { setBusy(true); try { const r = await fetch(`${BP}/api/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "Publish failed"); return j as { updatedAt: string; indexable: boolean; duplicable: boolean }; } finally { setBusy(false); } };
  const payload = () => ({ page: { id: page.id, title: page.title, icon: page.icon, blocks: page.blocks, cover: page.cover, coverY: page.coverY, font: page.font, smallText: page.smallText, fullWidth: page.fullWidth } });
  const publish = async (extra: Record<string, unknown> = {}) => { try { const j = await call({ ...payload(), ...extra }); onPublished({ at: j.updatedAt, indexable: j.indexable, duplicable: j.duplicable }); notify(pub ? "Site updated" : "Published to the web"); } catch (e) { notify(String((e as Error).message)); } };
  const unpublish = async () => { setBusy(true); try { await fetch(`${BP}/api/publish?id=${page.id}`, { method: "DELETE" }); onPublished(undefined); notify("Unpublished"); } finally { setBusy(false); } };
  return <div className="ntn-sharepop" role="dialog" aria-label="Share">
    <div className="tabs"><button type="button" className={tab === "share" ? "on" : ""} onClick={() => setTab("share")}>Share</button><button type="button" className={tab === "publish" ? "on" : ""} onClick={() => setTab("publish")} data-testid="publish-tab">Publish</button><a href="https://github.com/tommy-muckstack/notionisdead#readme" target="_blank" rel="noreferrer">Learn about sharing</a></div>
    {tab === "share" ? <>
      <div className="inv"><input placeholder="Email or group, separated by commas" aria-label="Invite" /><button type="button" onClick={() => notify("Invites need a team server; NotionIsDead keeps pages in your browser. Publish the page to share it instead.")}>Share</button></div>
      <div className="who"><span className="ns-av">{(name || "N")[0].toUpperCase()}</span><span><b>{name} (You)</b><small>{email || "guest"}</small></span><em>Full access</em></div>
      <div className="gen"><small>General access</small><div><span className="lk">{pub ? "🌐" : "🔒︎"}</span><span><b>{pub ? "Anyone with the link" : "Only you"}</b><small>{pub ? "Published to the web" : "This page lives in your browser"}</small></span></div></div>
      <div className="ft"><a href="https://github.com/tommy-muckstack/notionisdead#readme" target="_blank" rel="noreferrer">Advanced</a><button type="button" onClick={onCopy}>🔗︎ Copy link</button></div></>
    : <div className="pub" data-testid="publish-pane">
      {!pub ? <><div className="prev"><i>🌐</i><b>{page.icon} {page.title || "Untitled"}</b><small>{url}</small></div><p>Publish a read-only copy of this page to the web. Anyone with the link can view it; you can unpublish at any time.</p>
        <button type="button" className="go" disabled={busy} onClick={() => publish()}>{busy ? "Publishing…" : "Publish"}</button></>
      : <><div className="link"><input readOnly aria-label="Public link" value={url} onFocus={e => e.target.select()} /><button type="button" onClick={() => { navigator.clipboard?.writeText(url); notify("Public link copied"); }}>Copy</button></div>
        {stale && <p className="stale">This page changed since it was published. <button type="button" disabled={busy} onClick={() => publish()}>Update site</button></p>}
        <label className="opt"><span><b>Search engine indexing</b><small>Discoverable on the web</small></span><input type="checkbox" checked={pub.indexable} disabled={busy} onChange={e => publish({ indexable: e.target.checked })} /><i /></label>
        <label className="opt"><span><b>Duplicate as template</b><small>Visitors can copy this page into their workspace</small></span><input type="checkbox" checked={pub.duplicable} disabled={busy} onChange={e => publish({ duplicable: e.target.checked })} /><i /></label>
        <div className="acts"><a href={url} target="_blank" rel="noreferrer">View site ↗</a><button type="button" disabled={busy} onClick={unpublish}>Unpublish</button></div></>}
    </div>}
  </div>;
}
