import { describe, it, expect } from "vitest";
import { WRAP, applyShortcut, blocksToMarkdown, colorRange, filterMenu, inlineTokens, linkRange, markdownToBlocks, mentionText, mk, moveBlock, numbering, reorder, splitBlock, turnInto, wrapRange } from "@/lib/notion/blocks";
import { backlinks, breadcrumb, children, createPage, deleteForever, duplicatePage, emptyWorkspace, findByTitle, importMarkdown, movePage, pageMarkdown, restorePage, searchPages, trashPage, updatePage } from "@/lib/notion/pages";
import { seedWorkspace } from "@/lib/notion/seed";
const strip = (bs: ReturnType<typeof markdownToBlocks>) => bs.map(({ id, ...r }) => r);
describe("markdown shortcuts", () => {
  it("# turns a paragraph into a heading by level", () => { expect(applyShortcut(mk("p", "## Hello"))).toMatchObject({ type: "h2", text: "Hello" }); expect(applyShortcut(mk("p", "#nospace"))).toBeNull(); });
  it("lists, todos, quotes", () => {
    expect(applyShortcut(mk("p", "- item"))).toMatchObject({ type: "bullet", text: "item" }); expect(applyShortcut(mk("p", "1. one"))).toMatchObject({ type: "number", text: "one" });
    expect(applyShortcut(mk("p", "[] do it"))).toMatchObject({ type: "todo", checked: false }); expect(applyShortcut(mk("p", "[x] done"))).toMatchObject({ type: "todo", checked: true }); expect(applyShortcut(mk("p", "> wise"))).toMatchObject({ type: "toggle", text: "wise" }); expect(applyShortcut(mk("p", '" wise'))).toMatchObject({ type: "quote", text: "wise" }); expect(applyShortcut(mk("p", "#### four"))).toMatchObject({ type: "h4", text: "four" });
  });
  it("``` and --- convert only when typed alone", () => { expect(applyShortcut(mk("p", "```ts"))).toMatchObject({ type: "code", lang: "ts" }); expect(applyShortcut(mk("p", "---"))).toMatchObject({ type: "divider" }); expect(applyShortcut(mk("p", "--- more"))).toBeNull(); });
});
describe("splitting", () => {
  it("splits at the caret and continues lists", () => { const [a, b] = splitBlock(mk("bullet", "hello world"), 5); expect(a.text).toBe("hello"); expect(b).toMatchObject({ type: "bullet", text: " world" }); });
  it("empty list item becomes a paragraph", () => expect(splitBlock(mk("todo", ""), 0)).toMatchObject([{ type: "p" }]));
  it("headings continue as paragraphs", () => expect(splitBlock(mk("h1", "Title"), 5)[1].type).toBe("p"));
  it("numbered lists restart after a break", () => { const bs = [mk("number"), mk("number"), mk("p"), mk("number")]; const nums = numbering(bs); expect([nums[bs[0].id], nums[bs[1].id], nums[bs[3].id]]).toEqual([1, 2, 1]); });
  it("moves and converts blocks", () => { const bs = [mk("p", "a"), mk("p", "b")]; expect(moveBlock(bs, bs[1].id, -1).map(b => b.text)).toEqual(["b", "a"]); expect(moveBlock(bs, bs[0].id, -1)).toBe(bs); expect(turnInto(bs, bs[0].id, "todo")[0]).toMatchObject({ type: "todo", checked: false }); });
  it("slash menu filters by label and keyword", () => { expect(filterMenu("head").map(m => m.type)).toEqual(["h1", "h2", "h3", "h4"]); expect(filterMenu("checkbox")[0].type).toBe("todo"); expect(filterMenu("").length).toBeGreaterThan(8); });
});
describe("markdown round trip", () => {
  const corpus = ["#### H4\n\n<details open>\n<summary>More</summary>\n\n- inside\n- two\n\n</details>\n\n<!-- columns -->\nleft\n\n<!-- column -->\n\nright\n\n<!-- /columns -->\n\n<!-- color:red bg:yellow -->\nColoured para\n\n📄 [[Child]]\n\n↗ [[Roadmap]]\n\n![cap](https://x.io/a.png)\n\n<video src=\"https://x.io/v.mp4\"></video>\n\n[📎 notes.pdf](https://x.io/n.pdf)\n\n[🔖 x.io](https://x.io)\n\n$$\nE = mc^2\n$$\n\n<!-- toc -->\n",
    "# T\n\nPara one\nstill one\n\n## H2\n\n- a\n- b\n\n1. x\n2. y\n\n- [ ] open\n- [x] done\n\n> quote\n> more\n\n```ts\nconst a = 1;\n\nlet b;\n```\n\n---\n\nEnd with **bold** and [[Link]].\n",
    "Just a paragraph\n", "- [x] only\n", "1. one\n2. two\n3. three\n", "> 💡 callout text\n> second line\n"];
  for (const md of corpus) it(`round-trips ${JSON.stringify(md.slice(0, 18))}`, () => expect(blocksToMarkdown(markdownToBlocks(md))).toBe(md));
  it("parses the new block kinds", () => {
    const bs = markdownToBlocks("<details>\n<summary>T</summary>\n\ninner\n\n</details>\n\n<!-- color:blue -->\n- item\n\n![c](https://a.io/b.png)\n");
    expect(bs.map(b => b.type)).toEqual(["toggle", "bullet", "image"]); expect(bs[0]).toMatchObject({ text: "T", open: false }); expect(bs[0].kids?.[0]).toMatchObject({ type: "p", text: "inner" }); expect(bs[1]).toMatchObject({ color: "blue" }); expect(bs[2]).toMatchObject({ url: "https://a.io/b.png", text: "c" });
  });
  it("reorders by drop index", () => { const bs = [mk("p", "a"), mk("p", "b"), mk("p", "c")]; expect(reorder(bs, bs[0].id, 3).map(b => b.text)).toEqual(["b", "c", "a"]); expect(reorder(bs, bs[2].id, 0).map(b => b.text)).toEqual(["c", "a", "b"]); expect(reorder(bs, bs[0].id, 1).map(b => b.text)).toEqual(["a", "b", "c"]); });
  it("parses to the expected block types", () => expect(markdownToBlocks("# a\n\n- b\n\n> c\n\n---\n").map(b => b.type)).toEqual(["h1", "bullet", "quote", "divider"]));
  it("is idempotent after one pass even for loose input", () => { const once = blocksToMarkdown(markdownToBlocks("* a\n* b\n\n\n\nText\n3) c")); expect(blocksToMarkdown(markdownToBlocks(once))).toBe(once); });
  it("keeps code blocks verbatim, including markdown-looking lines", () => { const bs = markdownToBlocks("```\n# not a heading\n- not a list\n```\n"); expect(strip(bs)).toEqual([{ type: "code", text: "# not a heading\n- not a list" }]); });
});
describe("inline", () => {
  it("tokenizes bold, italic, code, links and page links", () => {
    expect(inlineTokens("a **b** *c* `d` [e](https://x.io) [[F]] ~~g~~").map(t => t.t)).toEqual(["text", "bold", "text", "italic", "text", "code", "text", "link", "text", "page", "text", "strike"]);
  });
  it("leaves unmatched markers alone", () => expect(inlineTokens("2 * 3 = 6")).toEqual([{ t: "text", text: "2 * 3 = 6", s: 0 }]));
  it("tracks raw offsets, underline, colour, highlight and mentions", () => {
    const t = inlineTokens("ab **cd** <u>e</u> <font color=\"red\">f</font> <mark class=\"yellow\">g</mark> @[Sam] @[2026-10-15]");
    expect(t.map(x => [x.t, x.s])).toEqual([["text", 0], ["bold", 5], ["text", 9], ["underline", 13], ["text", 18], ["color", 37], ["text", 45], ["mark", 67], ["text", 75], ["mention", 78], ["text", 82], ["mention", 85]]);
    expect(t[5]).toMatchObject({ color: "red" }); expect(t[7]).toMatchObject({ color: "yellow" });
  });
  it("wraps, toggles and links ranges", () => {
    expect(wrapRange("hello world", 0, 5, WRAP.bold)).toEqual({ text: "**hello** world", a: 2, b: 7 });
    expect(wrapRange("**hello** world", 2, 7, WRAP.bold)).toEqual({ text: "hello world", a: 0, b: 5 });
    expect(wrapRange("x **y** z", 2, 7, WRAP.bold).text).toBe("x y z");
    expect(linkRange("see docs now", 4, 8, "https://x.io")).toBe("see [docs](https://x.io) now");
    expect(colorRange("a b c", 2, 3, "blue")).toBe('a <font color="blue">b</font> c'); expect(colorRange("a b c", 2, 3, "blue", true)).toBe('a <mark class="blue">b</mark> c');
    expect(mentionText("page", "Roadmap")).toBe("[[Roadmap]]"); expect(mentionText("date", "2026-10-15")).toBe("@[2026-10-15]");
  });
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
  it("round-trips a legacy-shaped table through markdown (migrating it)", async () => {
    const { blocksToMarkdown, markdownToBlocks, mk } = await import("@/lib/notion/blocks");
    const b = mk("table", "", { db: { title: "Tasks", rows: [{ id: "a", name: "Write | pipe", status: "Done" }, { id: "b", name: "Ship", status: "In progress" }] } as any });
    const md = blocksToMarkdown([b]); expect(md).toBe("**Tasks**\n\n| Name | Status |\n| --- | --- |\n| Write \\| pipe | Done |\n| Ship | In progress |\n");
    const back = markdownToBlocks(md);
    expect(back).toHaveLength(1); expect(back[0].type).toBe("table"); expect(back[0].db?.title).toBe("Tasks");
    expect(back[0].db?.rows.map(r => [r.cells.name, r.cells.status])).toEqual([["Write | pipe", "Done"], ["Ship", "In progress"]]);
  });
  it("round-trips a typed schema (props, views, row content) through markdown", async () => {
    const { blocksToMarkdown, markdownToBlocks, mk } = await import("@/lib/notion/blocks"); const { newDb, addProp, setCell, addView, updateView } = await import("@/lib/notion/db");
    let d = newDb(); const due = addProp(d, "date", "Due"); d = due.db; const n = addProp(d, "number", "Estimate"); d = n.db; const tags = addProp(d, "multi", "Tags"); d = tags.db;
    d = setCell(d, d.rows[0].id, "name", "First"); d = setCell(d, d.rows[0].id, due.prop.id, "2026-10-20/2026-10-22"); d = setCell(d, d.rows[0].id, n.prop.id, 3); d = setCell(d, d.rows[0].id, tags.prop.id, ["a", "b"]);
    const v = addView(d, "calendar"); d = updateView(v.db, v.view.id, { dateBy: due.prop.id, filters: [{ id: "f1", prop: "status", op: "is", value: "Done" }], sorts: [{ id: "s1", prop: n.prop.id, dir: "desc" }] });
    d = { ...d, rows: d.rows.map((r, i) => i === 0 ? { ...r, content: [mk("p", "inside the row")] } : r) };
    const md = blocksToMarkdown([mk("table", "", { db: d })]); expect(md).toContain("| Name | Status | Due | Estimate | Tags |"); expect(md).toContain("<!-- db ");
    const back = markdownToBlocks(md)[0].db!; expect(back.props.map(p => p.type)).toEqual(["title", "status", "date", "number", "multi"]); expect(back.views).toHaveLength(2); expect(back.views[1]).toMatchObject({ layout: "calendar", dateBy: due.prop.id }); expect(back.views[1].filters[0]).toMatchObject({ op: "is", value: "Done" });
    expect(back.rows[0].cells).toMatchObject({ name: "First", [due.prop.id]: "2026-10-20/2026-10-22", [n.prop.id]: 3, [tags.prop.id]: ["a", "b"] }); expect(back.rows[0].content?.[0].text).toBe("inside the row");
    expect(blocksToMarkdown(markdownToBlocks(md))).toBe(md);
  });
  it("parses a plain markdown table with extra columns", async () => { const { markdownToBlocks } = await import("@/lib/notion/blocks"); const b = markdownToBlocks("| Task | Owner | Status |\n| --- | --- | --- |\n| a | me | Done |\n")[0]; expect(b.type).toBe("table"); expect(b.db?.props.map(p => [p.name, p.type])).toEqual([["Task", "title"], ["Owner", "text"], ["Status", "status"]]); expect(b.db?.rows[0].cells.name).toBe("a"); });
  it("keeps the board layout marker", async () => {
    const { blocksToMarkdown, markdownToBlocks, mk, newDb } = await import("@/lib/notion/blocks");
    const back = markdownToBlocks(blocksToMarkdown([mk("board", "", { db: newDb("board") })]))[0]; expect(back.type).toBe("board"); expect(back.db?.views[0].layout).toBe("board");
  });
});
