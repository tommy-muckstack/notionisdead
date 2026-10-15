import { describe, it, expect } from "vitest";
import { blocksToHtml, inlineHtml, markdownBundle, pageHtml } from "@/lib/notion/export";
import { crc32, zip } from "@/lib/zip";
import { markdownToBlocks, mk } from "@/lib/notion/blocks";
import { createPage, emptyWorkspace, updatePage, HISTORY_GAP_MS } from "@/lib/notion/pages";
describe("html export", () => {
  it("renders inline marks and escapes", () => { expect(inlineHtml("a **b** <x> [l](https://x.io) @[2026-10-15]")).toBe('a <strong>b</strong> &lt;x&gt; <a href="https://x.io" rel="noreferrer noopener">l</a> <span class="chip">@Oct 15, 2026</span>'); });
  it("blocks the javascript: scheme and groups lists", () => { const html = blocksToHtml(markdownToBlocks("- a\n- b\n\n1. c\n\n[t](javascript:alert(1))\n")); expect(html).toContain("<ul>\n<li>a</li>\n<li>b</li>\n</ul>"); expect(html).toContain("<ol>"); expect(html).not.toContain('href="javascript'); });
  it("renders toggles, columns, todos and tables", () => { const html = blocksToHtml(markdownToBlocks("<details open>\n<summary>T</summary>\n\nin\n\n</details>\n\n- [x] done\n\n| Name | Status |\n| --- | --- |\n| r | Done |\n")); expect(html).toContain("<details open><summary>T</summary>"); expect(html).toContain('class="todo done"'); expect(html).toContain("<td>Done</td>"); });
  it("pageHtml is a standalone document honouring font/width", () => { const ws = createPage(emptyWorkspace(), { title: "P" }); const p = { ...ws.page, font: "serif" as const, fullWidth: true }; const h = pageHtml(p); expect(h.startsWith("<!doctype html>")).toBe(true); expect(h).toContain('class="page serif wide"'); expect(h).toContain("<title>P</title>"); });
});
describe("bundles + zip", () => {
  it("markdown bundle nests sub-pages and emits CSV for databases", () => {
    let ws = emptyWorkspace(); const a = createPage(ws, { title: "Top", blocks: [mk("table", "", { db: { title: "Tasks", rows: [{ id: "1", name: 'a "q"', status: "Done" }] } })] }); ws = a.ws; ws = createPage(ws, { title: "Kid", parentId: a.page.id }).ws;
    const files = markdownBundle(ws, a.page, true).map(f => f.name); expect(files).toEqual(["top.md", "top-tasks.csv", "top/kid.md"]);
    expect(markdownBundle(ws, a.page, false).find(f => f.name.endsWith(".csv"))!.data).toBe('Name,Status\n"a ""q""",Done\n');
  });
  it("writes a valid store-only zip", () => { expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686); const z = zip([{ name: "a.txt", data: "hi" }]); expect(Array.from(z.subarray(0, 4))).toEqual([0x50, 0x4b, 3, 4]); expect(z.length).toBe(30 + 5 + 2 + 46 + 5 + 22); expect(new TextDecoder().decode(z).includes("a.txt")).toBe(true); });
});
describe("page history", () => {
  it("keeps a snapshot when the previous one is older than the gap", () => {
    const t0 = new Date("2026-10-15T10:00:00Z"); let ws = createPage(emptyWorkspace(), { title: "H" }, t0); const id = ws.page.id;
    ws = { ws: updatePage(ws.ws, id, { blocks: [mk("p", "one")] }, new Date(+t0 + 1000)), page: ws.page }; expect(ws.ws.pages[0].history).toHaveLength(1);
    ws = { ws: updatePage(ws.ws, id, { blocks: [mk("p", "two")] }, new Date(+t0 + 2000)), page: ws.page }; expect(ws.ws.pages[0].history).toHaveLength(1);
    ws = { ws: updatePage(ws.ws, id, { blocks: [mk("p", "three")] }, new Date(+t0 + HISTORY_GAP_MS + 5000)), page: ws.page }; expect(ws.ws.pages[0].history).toHaveLength(2); expect(ws.ws.pages[0].history![1].blocks[0].text).toBe("two");
    expect(updatePage(ws.ws, id, { cover: "g:1" }).pages[0].history).toHaveLength(2);
  });
});
