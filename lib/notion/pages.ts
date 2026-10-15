import { blocksToMarkdown, markdownToBlocks, mk, bid, plainText, type Block } from "./blocks";
export type Page = { id: string; title: string; icon: string; parentId: string | null; blocks: Block[]; favorite: boolean; trashed: boolean; createdAt: string; updatedAt: string; order: number };
export type Workspace = { pages: Page[]; recent: string[] };
let n = 0; export const pid = () => `pg_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const iso = (d: Date) => d.toISOString();
export const emptyWorkspace = (): Workspace => ({ pages: [], recent: [] });
export const live = (ws: Workspace) => ws.pages.filter(p => !p.trashed);
export const getPage = (ws: Workspace, id: string | null | undefined) => ws.pages.find(p => p.id === id);
export const children = (ws: Workspace, parentId: string | null) => live(ws).filter(p => p.parentId === parentId).sort((a, b) => a.order - b.order);
export const descendants = (ws: Workspace, id: string): Page[] => ws.pages.filter(p => p.parentId === id).flatMap(c => [c, ...descendants(ws, c.id)]);
export function breadcrumb(ws: Workspace, id: string): Page[] { const out: Page[] = []; let p = getPage(ws, id); const seen = new Set<string>(); while (p && !seen.has(p.id)) { seen.add(p.id); out.unshift(p); p = getPage(ws, p.parentId); } return out; }

export function createPage(ws: Workspace, input: { title?: string; parentId?: string | null; icon?: string; blocks?: Block[] } = {}, now = new Date()): { ws: Workspace; page: Page } {
  const siblings = ws.pages.filter(p => p.parentId === (input.parentId ?? null));
  const page: Page = { id: pid(), title: input.title ?? "", icon: input.icon ?? "📄", parentId: input.parentId ?? null, blocks: input.blocks ?? [mk("p")], favorite: false, trashed: false, createdAt: iso(now), updatedAt: iso(now), order: siblings.reduce((m, p) => Math.max(m, p.order + 1), 0) };
  return { ws: { ...ws, pages: [...ws.pages, page] }, page };
}
export const updatePage = (ws: Workspace, id: string, patch: Partial<Pick<Page, "title" | "icon" | "blocks" | "favorite">>, now = new Date()): Workspace =>
  ({ ...ws, pages: ws.pages.map(p => p.id === id ? { ...p, ...patch, updatedAt: iso(now) } : p) });
export const touchRecent = (ws: Workspace, id: string): Workspace => ({ ...ws, recent: [id, ...ws.recent.filter(x => x !== id)].slice(0, 8) });
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
  const copy = (p: Page, parentId: string | null, title: string): Page => { const r = createPage(cur, { title, parentId, icon: p.icon, blocks: p.blocks.map(b => ({ ...b, id: bid() })) }, now); cur = r.ws; map.set(p.id, r.page.id); return r.page; };
  const root = copy(src, src.parentId, `${src.title || "Untitled"} (copy)`);
  const walk = (p: Page) => { for (const c of children(ws, p.id)) { copy(c, map.get(p.id)!, c.title); walk(c); } };
  walk(src); return { ws: cur, page: root };
}
/** Re-parent a page. Refuses to move a page into itself or its own descendants. */
export function movePage(ws: Workspace, id: string, parentId: string | null): Workspace {
  if (parentId === id || (parentId && descendants(ws, id).some(d => d.id === parentId))) return ws;
  const order = ws.pages.filter(p => p.parentId === parentId).reduce((m, p) => Math.max(m, p.order + 1), 0);
  return { ...ws, pages: ws.pages.map(p => p.id === id ? { ...p, parentId, order } : p) };
}
export const toggleFavorite = (ws: Workspace, id: string): Workspace => ({ ...ws, pages: ws.pages.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p) });
export const pageMarkdown = (p: Page) => `# ${p.title || "Untitled"}\n\n${blocksToMarkdown(p.blocks)}`;
export function importMarkdown(ws: Workspace, md: string, parentId: string | null = null, now = new Date()): { ws: Workspace; page: Page } {
  const blocks = markdownToBlocks(md); let title = "Imported page";
  if (blocks[0]?.type === "h1") { title = blocks[0].text; blocks.shift(); }
  return createPage(ws, { title, parentId, blocks: blocks.length ? blocks : [mk("p")] }, now);
}
export type Hit = { page: Page; snippet: string; where: "title" | "body" };
/** Title matches first, then body matches with a short snippet. */
export function searchPages(ws: Workspace, q: string): Hit[] {
  const s = q.trim().toLowerCase(); if (!s) return [];
  const hits: Hit[] = [];
  for (const p of live(ws)) { if ((p.title || "Untitled").toLowerCase().includes(s)) hits.push({ page: p, snippet: "", where: "title" }); }
  for (const p of live(ws)) {
    if (hits.some(h => h.page.id === p.id)) continue;
    for (const b of p.blocks) { const t = plainText(b); const i = t.toLowerCase().indexOf(s); if (i >= 0) { hits.push({ page: p, snippet: (i > 24 ? "…" : "") + t.slice(Math.max(0, i - 24), i + s.length + 48), where: "body" }); break; } }
  }
  return hits;
}
export const findByTitle = (ws: Workspace, title: string) => live(ws).find(p => (p.title || "Untitled").toLowerCase() === title.trim().toLowerCase());
export const backlinks = (ws: Workspace, id: string): Page[] => { const t = getPage(ws, id)?.title.toLowerCase(); if (!t) return []; return live(ws).filter(p => p.id !== id && p.blocks.some(b => b.text.toLowerCase().includes(`[[${t}]]`))); };
export const wordCount = (p: Page) => p.blocks.map(plainText).join(" ").split(/\s+/).filter(Boolean).length;
