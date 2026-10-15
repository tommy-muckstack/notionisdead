import { blocksToMarkdown, markdownToBlocks, mk, bid, plainText, type Block } from "./blocks";
export type Comment = { id: string; author: string; text: string; at: string };
/** A discussion: on the page (blockId null) or anchored to a block. */
export type Thread = { id: string; blockId: string | null; messages: Comment[]; resolved: boolean; createdAt: string };
export type Snapshot = { at: string; title: string; blocks: Block[] };
export type Published = { at: string; indexable: boolean; duplicable: boolean };
export type Page = {
  id: string; title: string; icon: string; parentId: string | null; blocks: Block[]; favorite: boolean; trashed: boolean; createdAt: string; updatedAt: string; order: number; threads?: Thread[];
  /** cover: a gallery id (`g:<n>`), a URL or a data URL; coverY: vertical focus 0–100 */
  cover?: string; coverY?: number;
  font?: "default" | "serif" | "mono"; smallText?: boolean; fullWidth?: boolean; locked?: boolean;
  /** Page history: snapshots of earlier states (newest last), capped. */
  history?: Snapshot[];
  /** Set while the page is published to the web (server copy keyed by the page id). */
  published?: Published;
  /** Teamspace the page lives in (undefined/null = Private). */
  spaceId?: string | null;
};
export const HISTORY_MAX = 20; export const HISTORY_GAP_MS = 10 * 60 * 1000;
export type Space = { id: string; name: string; icon: string };
export type Prefs = { weekStartsMonday?: boolean; dateFormat?: "relative" | "absolute"; enterNewline?: boolean; inboxBadge?: boolean; preferredName?: string; setupDismissed?: boolean; bannerDismissed?: boolean };
export type Workspace = { pages: Page[]; recent: string[]; name?: string; icon?: string; spaces?: Space[]; /** page id → last opened (ISO) */ visits?: Record<string, string>; prefs?: Prefs };
let n = 0; export const pid = () => `pg_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const iso = (d: Date) => d.toISOString();
export const emptyWorkspace = (): Workspace => ({ pages: [], recent: [] });
export const live = (ws: Workspace) => ws.pages.filter(p => !p.trashed);
export const getPage = (ws: Workspace, id: string | null | undefined) => ws.pages.find(p => p.id === id);
export const children = (ws: Workspace, parentId: string | null, spaceId?: string | null) => live(ws).filter(p => p.parentId === parentId && (parentId !== null || spaceId === undefined || (p.spaceId ?? null) === spaceId)).sort((a, b) => a.order - b.order);
export const descendants = (ws: Workspace, id: string): Page[] => ws.pages.filter(p => p.parentId === id).flatMap(c => [c, ...descendants(ws, c.id)]);
export function breadcrumb(ws: Workspace, id: string): Page[] { const out: Page[] = []; let p = getPage(ws, id); const seen = new Set<string>(); while (p && !seen.has(p.id)) { seen.add(p.id); out.unshift(p); p = getPage(ws, p.parentId); } return out; }

export function createPage(ws: Workspace, input: { id?: string; title?: string; parentId?: string | null; icon?: string; blocks?: Block[]; spaceId?: string | null } = {}, now = new Date()): { ws: Workspace; page: Page } {
  const siblings = ws.pages.filter(p => p.parentId === (input.parentId ?? null));
  const spaceId = input.parentId ? getPage(ws, input.parentId)?.spaceId ?? null : input.spaceId ?? null;
  const page: Page = { id: input.id ?? pid(), title: input.title ?? "", icon: input.icon ?? "📄", parentId: input.parentId ?? null, blocks: input.blocks ?? [mk("p")], favorite: false, trashed: false, createdAt: iso(now), updatedAt: iso(now), order: siblings.reduce((m, p) => Math.max(m, p.order + 1), 0), ...(spaceId ? { spaceId } : {}) };
  return { ws: { ...ws, pages: [...ws.pages, page] }, page };
}
export type PagePatch = Partial<Omit<Page, "id" | "createdAt" | "updatedAt" | "order" | "parentId">>;
/** Content edits (title/blocks) also feed page history: a snapshot of the previous state is kept when the last one is older than HISTORY_GAP_MS. */
export function updatePage(ws: Workspace, id: string, patch: PagePatch, now = new Date()): Workspace {
  return { ...ws, pages: ws.pages.map(p => {
    if (p.id !== id) return p;
    let history = p.history;
    if ((patch.blocks !== undefined || patch.title !== undefined) && !patch.history) {
      const last = p.history?.[p.history.length - 1];
      if (!last || +now - +new Date(last.at) > HISTORY_GAP_MS) history = [...(p.history ?? []), { at: p.updatedAt, title: p.title, blocks: p.blocks }].slice(-HISTORY_MAX);
    }
    return { ...p, ...patch, history, updatedAt: iso(now) };
  }) };
}
export const restoreSnapshot = (ws: Workspace, id: string, snap: Snapshot, now = new Date()): Workspace => updatePage(ws, id, { title: snap.title, blocks: snap.blocks.map(b => ({ ...b })) }, now);
export const touchRecent = (ws: Workspace, id: string, now = new Date()): Workspace => ({ ...ws, recent: [id, ...ws.recent.filter(x => x !== id)].slice(0, 8), visits: { ...ws.visits, [id]: iso(now) } });
/** "just now", "5m ago", "3h ago", "Yesterday", "Oct 2" */
export function relTime(isoAt: string | undefined, now = new Date()): string {
  if (!isoAt) return ""; const d = (+now - +new Date(isoAt)) / 1000; if (d < 60) return "just now"; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`; if (d < 2 * 86400) return "Yesterday"; if (d < 7 * 86400) return `${Math.floor(d / 86400)}d ago`;
  return new Date(isoAt).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(new Date(isoAt).getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}
/** Move to trash, taking sub-pages with it. */
export function trashPage(ws: Workspace, id: string): Workspace {
  const ids = new Set([id, ...descendants(ws, id).map(p => p.id)]);
  return { ...ws, pages: ws.pages.map(p => ids.has(p.id) ? { ...p, trashed: true, favorite: false } : p), recent: ws.recent.filter(x => !ids.has(x)) };
}
/** Restore a page and its sub-pages; if its parent is also trashed it comes back at the top level. */
export function restorePage(ws: Workspace, id: string): Workspace {
  const ids = new Set([id, ...descendants(ws, id).map(p => p.id)]); const parent = getPage(ws, getPage(ws, id)?.parentId);
  return { ...ws, pages: ws.pages.map(p => ids.has(p.id) ? { ...p, trashed: false, parentId: p.id === id && parent?.trashed ? null : p.parentId } : p) };
}
export const deleteForever = (ws: Workspace, id: string): Workspace => { const ids = new Set([id, ...descendants(ws, id).map(p => p.id)]); return { ...ws, pages: ws.pages.filter(p => !ids.has(p.id)), recent: ws.recent.filter(x => !ids.has(x)) }; };
export const emptyTrash = (ws: Workspace): Workspace => ({ ...ws, pages: ws.pages.filter(p => !p.trashed) });
export function duplicatePage(ws: Workspace, id: string, now = new Date()): { ws: Workspace; page: Page } {
  const src = getPage(ws, id)!; const map = new Map<string, string>(); let cur = ws;
  const copy = (p: Page, parentId: string | null, title: string): Page => { const r = createPage(cur, { title, parentId, icon: p.icon, blocks: p.blocks.map(b => ({ ...b, id: bid() })) }, now); cur = { ...r.ws, pages: r.ws.pages.map(x => x.id === r.page.id ? { ...x, cover: p.cover, coverY: p.coverY, font: p.font, smallText: p.smallText, fullWidth: p.fullWidth } : x) }; map.set(p.id, r.page.id); return { ...r.page }; };
  const root = copy(src, src.parentId, `${src.title || "Untitled"} (copy)`);
  const walk = (p: Page) => { for (const c of children(ws, p.id)) { copy(c, map.get(p.id)!, c.title); walk(c); } };
  walk(src); return { ws: cur, page: root };
}
/** Re-parent a page. Refuses to move a page into itself or its own descendants. */
export function movePage(ws: Workspace, id: string, parentId: string | null, spaceId?: string | null): Workspace {
  if (parentId === id || (parentId && descendants(ws, id).some(d => d.id === parentId))) return ws;
  const order = ws.pages.filter(p => p.parentId === parentId).reduce((m, p) => Math.max(m, p.order + 1), 0);
  const space = parentId ? getPage(ws, parentId)?.spaceId ?? null : spaceId === undefined ? getPage(ws, id)?.spaceId ?? null : spaceId;
  const ids = new Set([id, ...descendants(ws, id).map(d => d.id)]);
  return { ...ws, pages: ws.pages.map(p => p.id === id ? { ...p, parentId, order, spaceId: space } : ids.has(p.id) ? { ...p, spaceId: space } : p) };
}
// ---- teamspaces ----
export const createSpace = (ws: Workspace, name: string, icon = "🏠"): { ws: Workspace; space: Space } => { const space: Space = { id: pid().replace("pg_", "ts_"), name, icon }; return { ws: { ...ws, spaces: [...(ws.spaces ?? []), space] }, space }; };
export const updateSpace = (ws: Workspace, id: string, patch: Partial<Space>): Workspace => ({ ...ws, spaces: (ws.spaces ?? []).map(s => s.id === id ? { ...s, ...patch } : s) });
/** Deleting a teamspace moves its pages back to Private. */
export const deleteSpace = (ws: Workspace, id: string): Workspace => ({ ...ws, spaces: (ws.spaces ?? []).filter(s => s.id !== id), pages: ws.pages.map(p => p.spaceId === id ? { ...p, spaceId: null } : p) });
export const toggleFavorite = (ws: Workspace, id: string): Workspace => ({ ...ws, pages: ws.pages.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p) });
export const pageMarkdown = (p: Page) => `# ${p.title || "Untitled"}\n\n${blocksToMarkdown(p.blocks)}`;
export function importMarkdown(ws: Workspace, md: string, parentId: string | null = null, now = new Date()): { ws: Workspace; page: Page } {
  const blocks = markdownToBlocks(md); let title = "Imported page";
  if (blocks[0]?.type === "h1") { title = blocks[0].text; blocks.shift(); }
  return createPage(ws, { title, parentId, blocks: blocks.length ? blocks : [mk("p")] }, now);
}
export type Hit = { page: Page; snippet: string; where: "title" | "body" };
export type SearchOpts = { titleOnly?: boolean; inPage?: string | null; since?: number | null };
/** Title matches first, then body matches with a short snippet. Filters: Title only, In (a page and its sub-pages), Date (edited within N days). */
export function searchPages(ws: Workspace, q: string, o: SearchOpts = {}): Hit[] {
  const s = q.trim().toLowerCase(); if (!s) return [];
  const scope = o.inPage ? new Set([o.inPage, ...descendants(ws, o.inPage).map(p => p.id)]) : null; const cutoff = o.since ? Date.now() - o.since * 86400e3 : null;
  const pool = live(ws).filter(p => (!scope || scope.has(p.id)) && (!cutoff || +new Date(p.updatedAt) >= cutoff));
  const hits: Hit[] = [];
  for (const p of pool) { if ((p.title || "Untitled").toLowerCase().includes(s)) hits.push({ page: p, snippet: "", where: "title" }); }
  if (o.titleOnly) return hits;
  for (const p of pool) {
    if (hits.some(h => h.page.id === p.id)) continue;
    for (const b of p.blocks) { const t = plainText(b); const i = t.toLowerCase().indexOf(s); if (i >= 0) { hits.push({ page: p, snippet: (i > 24 ? "…" : "") + t.slice(Math.max(0, i - 24), i + s.length + 48), where: "body" }); break; } }
  }
  return hits;
}
export const findByTitle = (ws: Workspace, title: string) => live(ws).find(p => (p.title || "Untitled").toLowerCase() === title.trim().toLowerCase());
export const backlinks = (ws: Workspace, id: string): Page[] => { const t = getPage(ws, id)?.title.toLowerCase(); if (!t) return []; return live(ws).filter(p => p.id !== id && p.blocks.some(b => b.text.toLowerCase().includes(`[[${t}]]`))); };
// ---- comments ----
const patchPage = (ws: Workspace, id: string, f: (p: Page) => Page): Workspace => ({ ...ws, pages: ws.pages.map(p => p.id === id ? f(p) : p) });
export function addComment(ws: Workspace, pageId: string, blockId: string | null, author: string, text: string, now = new Date()): { ws: Workspace; thread: Thread } {
  const thread: Thread = { id: pid().replace("pg_", "th_"), blockId, messages: [{ id: pid().replace("pg_", "cm_"), author, text, at: iso(now) }], resolved: false, createdAt: iso(now) };
  return { ws: patchPage(ws, pageId, p => ({ ...p, threads: [...(p.threads ?? []), thread] })), thread };
}
export const replyComment = (ws: Workspace, pageId: string, threadId: string, author: string, text: string, now = new Date()): Workspace =>
  patchPage(ws, pageId, p => ({ ...p, threads: (p.threads ?? []).map(t => t.id === threadId ? { ...t, resolved: false, messages: [...t.messages, { id: pid().replace("pg_", "cm_"), author, text, at: iso(now) }] } : t) }));
export const resolveThread = (ws: Workspace, pageId: string, threadId: string, resolved = true): Workspace => patchPage(ws, pageId, p => ({ ...p, threads: (p.threads ?? []).map(t => t.id === threadId ? { ...t, resolved } : t) }));
export const deleteThread = (ws: Workspace, pageId: string, threadId: string): Workspace => patchPage(ws, pageId, p => ({ ...p, threads: (p.threads ?? []).filter(t => t.id !== threadId) }));
export const editComment = (ws: Workspace, pageId: string, threadId: string, commentId: string, text: string): Workspace => patchPage(ws, pageId, p => ({ ...p, threads: (p.threads ?? []).map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => m.id === commentId ? { ...m, text } : m) } : t) }));
export const openThreads = (p: Page) => (p.threads ?? []).filter(t => !t.resolved);
export const wordCount = (p: Page) => p.blocks.map(plainText).join(" ").split(/\s+/).filter(Boolean).length;
