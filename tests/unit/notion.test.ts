import { describe, it, expect } from "vitest";
import { applyShortcut, blocksToMarkdown, filterMenu, inlineTokens, markdownToBlocks, mk, moveBlock, numbering, splitBlock, turnInto } from "@/lib/notion/blocks";
import { backlinks, breadcrumb, children, createPage, deleteForever, duplicatePage, emptyWorkspace, findByTitle, importMarkdown, movePage, pageMarkdown, restorePage, searchPages, trashPage, updatePage } from "@/lib/notion/pages";
import { seedWorkspace } from "@/lib/notion/seed";
const strip = (bs: ReturnType<typeof markdownToBlocks>) => bs.map(({ id, ...r }) => r);
describe("markdown shortcuts", () => {
  it("# turns a paragraph into a heading by level", () => { expect(applyShortcut(mk("p", "## Hello"))).toMatchObject({ type: "h2", text: "Hello" }); expect(applyShortcut(mk("p", "#nospace"))).toBeNull(); });
  it("lists, todos, quotes", () => {
    expect(applyShortcut(mk("p", "- item"))).toMatchObject({ type: "bullet", text: "item" }); expect(applyShortcut(mk("p", "1. one"))).toMatchObject({ type: "number", text: "one" });
    expect(applyShortcut(mk("p", "[] do it"))).toMatchObject({ type: "todo", checked: false }); expect(applyShortcut(mk("p", "[x] done"))).toMatchObject({ type: "todo", checked: true }); expect(applyShortcut(mk("p", "> wise"))).toMatchObject({ type: "quote", text: "wise" });
  });
  it("``` and --- convert only when typed alone", () => { expect(applyShortcut(mk("p", "```ts"))).toMatchObject({ type: "code", lang: "ts" }); expect(applyShortcut(mk("p", "---"))).toMatchObject({ type: "divider" }); expect(applyShortcut(mk("p", "--- more"))).toBeNull(); });
});
describe("splitting", () => {
  it("splits at the caret and continues lists", () => { const [a, b] = splitBlock(mk("bullet", "hello world"), 5); expect(a.text).toBe("hello"); expect(b).toMatchObject({ type: "bullet", text: " world" }); });
  it("empty list item becomes a paragraph", () => expect(splitBlock(mk("todo", ""), 0)).toMatchObject([{ type: "p" }]));
  it("headings continue as paragraphs", () => expect(splitBlock(mk("h1", "Title"), 5)[1].type).toBe("p"));
  it("numbered lists restart after a break", () => { const bs = [mk("number"), mk("number"), mk("p"), mk("number")]; const nums = numbering(bs); expect([nums[bs[0].id], nums[bs[1].id], nums[bs[3].id]]).toEqual([1, 2, 1]); });
  it("moves and converts blocks", () => { const bs = [mk("p", "a"), mk("p", "b")]; expect(moveBlock(bs, bs[1].id, -1).map(b => b.text)).toEqual(["b", "a"]); expect(moveBlock(bs, bs[0].id, -1)).toBe(bs); expect(turnInto(bs, bs[0].id, "todo")[0]).toMatchObject({ type: "todo", checked: false }); });
  it("slash menu filters by label and keyword", () => { expect(filterMenu("head").map(m => m.type)).toEqual(["h1", "h2", "h3"]); expect(filterMenu("checkbox")[0].type).toBe("todo"); expect(filterMenu("").length).toBeGreaterThan(8); });
});
describe("markdown round trip", () => {
  const corpus = ["# T\n\nPara one\nstill one\n\n## H2\n\n- a\n- b\n\n1. x\n2. y\n\n- [ ] open\n- [x] done\n\n> quote\n> more\n\n```ts\nconst a = 1;\n\nlet b;\n```\n\n---\n\nEnd with **bold** and [[Link]].\n",
    "Just a paragraph\n", "- [x] only\n", "1. one\n2. two\n3. three\n", "> 💡 callout text\n> second line\n"];
  for (const md of corpus) it(`round-trips ${JSON.stringify(md.slice(0, 18))}`, () => expect(blocksToMarkdown(markdownToBlocks(md))).toBe(md));
  it("parses to the expected block types", () => expect(markdownToBlocks("# a\n\n- b\n\n> c\n\n---\n").map(b => b.type)).toEqual(["h1", "bullet", "quote", "divider"]));
  it("is idempotent after one pass even for loose input", () => { const once = blocksToMarkdown(markdownToBlocks("* a\n* b\n\n\n\nText\n3) c")); expect(blocksToMarkdown(markdownToBlocks(once))).toBe(once); });
  it("keeps code blocks verbatim, including markdown-looking lines", () => { const bs = markdownToBlocks("```\n# not a heading\n- not a list\n```\n"); expect(strip(bs)).toEqual([{ type: "code", text: "# not a heading\n- not a list" }]); });
});
describe("inline", () => {
  it("tokenizes bold, italic, code, links and page links", () => {
    expect(inlineTokens("a **b** *c* `d` [e](https://x.io) [[F]] ~~g~~").map(t => t.t)).toEqual(["text", "bold", "text", "italic", "text", "code", "text", "link", "text", "page", "text", "strike"]);
  });
  it("leaves unmatched markers alone", () => expect(inlineTokens("2 * 3 = 6")).toEqual([{ t: "text", text: "2 * 3 = 6" }]));
  it("only links http(s)", () => expect(inlineTokens("[x](javascript:alert(1))").every(t => t.t === "text")).toBe(true));
});
describe("pages", () => {
  const ws0 = seedWorkspace(new Date("2026-10-14T12:00:00Z"));
  it("seed builds a tree", () => { expect(children(ws0, null).map(p => p.title)).toEqual(["Getting started", "Weekly planning"]); expect(children(ws0, findByTitle(ws0, "Weekly planning")!.id)[0].title).toBe("Roadmap"); });
  it("trash takes sub-pages along; restore brings them back", () => {
    const wp = findByTitle(ws0, "Weekly planning")!; const t = trashPage(ws0, wp.id); expect(findByTitle(t, "Roadmap")).toBeUndefined();
    const r = restorePage(t, wp.id); expect(findByTitle(r, "Roadmap")).toBeTruthy();
  });
  it("restoring a child whose parent is still in the trash returns it to the top level", () => {
    const wp = findByTitle(ws0, "Weekly planning")!; const rm = findByTitle(ws0, "Roadmap")!; const t = trashPage(ws0, wp.id); const r = restorePage(t, rm.id);
    expect(r.pages.find(p => p.id === rm.id)).toMatchObject({ trashed: false, parentId: null });
  });
  it("delete forever removes the subtree", () => { const wp = findByTitle(ws0, "Weekly planning")!; expect(deleteForever(ws0, wp.id).pages.length).toBe(ws0.pages.length - 2); });
  it("duplicates deeply with fresh ids", () => {
    const wp = findByTitle(ws0, "Weekly planning")!; const d = duplicatePage(ws0, wp.id); expect(d.page.title).toBe("Weekly planning (copy)"); expect(children(d.ws, d.page.id)).toHaveLength(1);
    expect(new Set(d.ws.pages.map(p => p.id)).size).toBe(d.ws.pages.length); expect(new Set(d.ws.pages.flatMap(p => p.blocks.map(b => b.id))).size).toBe(d.ws.pages.reduce((n, p) => n + p.blocks.length, 0));
  });
  it("won't move a page into its own subtree", () => { const wp = findByTitle(ws0, "Weekly planning")!; const rm = findByTitle(ws0, "Roadmap")!; expect(movePage(ws0, wp.id, rm.id)).toBe(ws0); expect(movePage(ws0, wp.id, wp.id)).toBe(ws0); expect(movePage(ws0, rm.id, null).pages.find(p => p.id === rm.id)!.parentId).toBeNull(); });
  it("breadcrumbs walk up to the root", () => expect(breadcrumb(ws0, findByTitle(ws0, "Roadmap")!.id).map(p => p.title)).toEqual(["Weekly planning", "Roadmap"]));
  it("search finds titles first, then body text with a snippet", () => {
    const hits = searchPages(ws0, "road"); expect(hits[0]).toMatchObject({ where: "title" }); expect(hits[0].page.title).toBe("Roadmap");
    const body = searchPages(ws0, "launch post"); expect(body[0]).toMatchObject({ where: "body" }); expect(body[0].snippet).toMatch(/launch post/);
    expect(searchPages(ws0, "   ")).toEqual([]);
  });
  it("search skips trashed pages", () => { const rm = findByTitle(ws0, "Roadmap")!; expect(searchPages(trashPage(ws0, rm.id), "roadmap").some(h => h.page.id === rm.id)).toBe(false); });
  it("finds backlinks from [[Title]] mentions", () => expect(backlinks(ws0, findByTitle(ws0, "Roadmap")!.id).map(p => p.title)).toEqual(["Weekly planning"]));
  it("import takes the first # heading as the title and export puts it back", () => {
    const r = importMarkdown(emptyWorkspace(), "# Notes\n\n- one\n- two\n"); expect(r.page.title).toBe("Notes"); expect(r.page.blocks.map(b => b.type)).toEqual(["bullet", "bullet"]); expect(pageMarkdown(r.page)).toBe("# Notes\n\n- one\n- two\n");
  });
  it("updates stamp updatedAt", () => { const { ws, page } = createPage(emptyWorkspace(), { title: "x" }, new Date("2026-01-01T00:00:00Z")); expect(updatePage(ws, page.id, { title: "y" }, new Date("2026-02-01T00:00:00Z")).pages[0].updatedAt).toBe("2026-02-01T00:00:00.000Z"); });
});

describe("database blocks", () => {
  it("round-trips a table through markdown", async () => {
    const { blocksToMarkdown, markdownToBlocks, mk } = await import("@/lib/notion/blocks");
    const b = mk("table", "", { db: { title: "Tasks", rows: [{ id: "a", name: "Write | pipe", status: "Done" }, { id: "b", name: "Ship", status: "In progress" }] } });
    const back = markdownToBlocks(blocksToMarkdown([b]));
    expect(back).toHaveLength(1); expect(back[0].type).toBe("table"); expect(back[0].db?.title).toBe("Tasks");
    expect(back[0].db?.rows.map(r => [r.name, r.status])).toEqual([["Write | pipe", "Done"], ["Ship", "In progress"]]);
  });
  it("keeps the board layout marker", async () => {
    const { blocksToMarkdown, markdownToBlocks, mk, newDb } = await import("@/lib/notion/blocks");
    expect(markdownToBlocks(blocksToMarkdown([mk("board", "", { db: newDb() })]))[0].type).toBe("board");
  });
});
