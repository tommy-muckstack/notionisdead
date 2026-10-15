// Export: HTML (standalone file, also used by the public /p/<id> page), PDF (pdf-lib, text layout), zip bundles with sub-pages.
import { blocksToMarkdown, fmtDate, inlineTokens, isIsoDate, plainText, type Block } from "./blocks";
import { children, pageMarkdown, type Page, type Workspace } from "./pages";
import { cellText, csvOf, migrateDb, rowTitle } from "./db";
import { zip } from "@/lib/zip";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (u: string) => /^(https?:|data:image\/|data:video\/|data:audio\/|data:application\/pdf)/i.test(u) ? u : "#";
export function inlineHtml(text: string): string {
  return inlineTokens(text).map(t => t.t === "bold" ? `<strong>${esc(t.text)}</strong>` : t.t === "italic" ? `<em>${esc(t.text)}</em>` : t.t === "strike" ? `<s>${esc(t.text)}</s>` : t.t === "underline" ? `<u>${esc(t.text)}</u>` : t.t === "code" ? `<code>${esc(t.text)}</code>`
    : t.t === "color" ? `<span class="c-${t.color}">${esc(t.text)}</span>` : t.t === "mark" ? `<mark class="bg-${t.color}">${esc(t.text)}</mark>` : t.t === "link" ? `<a href="${esc(safeUrl(t.href ?? ""))}" rel="noreferrer noopener">${esc(t.text)}</a>`
    : t.t === "page" ? `<span class="pagelink">📄 ${esc(t.text)}</span>` : t.t === "mention" ? `<span class="chip">@${esc(isIsoDate(t.text) ? fmtDate(t.text) : t.text)}</span>` : esc(t.text)).join("");
}
export type HtmlOpts = { media?: boolean; headingIds?: boolean };
export function blocksToHtml(blocks: Block[], o: HtmlOpts = {}): string {
  const media = o.media ?? true; const out: string[] = []; let list: "ul" | "ol" | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const open = (k: "ul" | "ol") => { if (list !== k) { close(); out.push(`<${k}>`); list = k; } };
  for (const b of blocks) {
    const cls = [b.color ? `c-${b.color}` : "", b.bg ? `bg-${b.bg}` : ""].filter(Boolean).join(" "); const at = cls ? ` class="${cls}"` : ""; const id = o.headingIds ? ` id="${b.id}"` : "";
    if (b.type === "bullet") { open("ul"); out.push(`<li${at}>${inlineHtml(b.text)}</li>`); continue; }
    if (b.type === "number") { open("ol"); out.push(`<li${at}>${inlineHtml(b.text)}</li>`); continue; }
    if (b.type === "todo") { open("ul"); out.push(`<li class="todo${b.checked ? " done" : ""}${cls ? " " + cls : ""}"><input type="checkbox" disabled${b.checked ? " checked" : ""}> ${inlineHtml(b.text)}</li>`); continue; }
    close();
    switch (b.type) {
      case "h1": case "h2": case "h3": case "h4": out.push(`<${b.type}${id}${at}>${inlineHtml(b.text)}</${b.type}>`); break;
      case "quote": out.push(`<blockquote${at}>${inlineHtml(b.text).replace(/\n/g, "<br>")}</blockquote>`); break;
      case "callout": out.push(`<aside class="callout${cls ? " " + cls : ""}"><span>💡</span><div>${inlineHtml(b.text).replace(/\n/g, "<br>")}</div></aside>`); break;
      case "code": out.push(`<pre><code${b.lang ? ` class="language-${esc(b.lang)}"` : ""}>${esc(b.text)}</code></pre>`); break;
      case "divider": out.push("<hr>"); break;
      case "toggle": out.push(`<details${b.open ? " open" : ""}${at}><summary>${inlineHtml(b.text)}</summary>${blocksToHtml(b.kids ?? [], o)}</details>`); break;
      case "columns": out.push(`<div class="columns">${(b.cols ?? []).map(c => `<div class="col">${blocksToHtml(c, o)}</div>`).join("")}</div>`); break;
      case "page": out.push(`<p class="pageblock">📄 ${esc(b.text || "Untitled")}</p>`); break;
      case "link": out.push(`<p class="pageblock">↗ ${esc(b.text || "Untitled")}</p>`); break;
      case "image": if (media && b.url) out.push(`<figure><img src="${esc(safeUrl(b.url))}" alt="${esc(b.text)}">${b.text ? `<figcaption>${inlineHtml(b.text)}</figcaption>` : ""}</figure>`); else if (b.text) out.push(`<p><em>${esc(b.text)}</em></p>`); break;
      case "video": if (media && b.url) out.push(`<p><a href="${esc(safeUrl(b.url))}">▶ ${esc(b.text || b.url)}</a></p>`); break;
      case "audio": if (media && b.url) out.push(`<p><a href="${esc(safeUrl(b.url))}">♪ ${esc(b.text || b.url)}</a></p>`); break;
      case "file": if (media && b.url) out.push(`<p><a href="${esc(safeUrl(b.url))}">📎 ${esc(b.text || "File")}</a></p>`); break;
      case "bookmark": out.push(`<p><a class="bookmark" href="${esc(safeUrl(b.url ?? ""))}">🔖 ${esc(b.text || b.url || "")}</a></p>`); break;
      case "equation": out.push(`<pre class="equation">${esc(b.text)}</pre>`); break;
      case "toc": out.push(`<nav class="toc">${blocks.filter(x => /^h[1-4]$/.test(x.type)).map(h => `<a class="${h.type}" href="#${h.id}">${esc(h.text)}</a>`).join("")}</nav>`); break;
      case "table": case "board": { const d = migrateDb(b.db, b.type === "board"); out.push(`${d.title ? `<h3>${esc(d.title)}</h3>` : ""}<table><thead><tr>${d.props.map(p => `<th>${esc(p.name)}</th>`).join("")}</tr></thead><tbody>${d.rows.map(r => `<tr>${d.props.map(p => `<td>${esc(cellText(p, r.cells[p.id]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`); break; }
      default: out.push(`<p${at}>${inlineHtml(b.text).replace(/\n/g, "<br>") || "&nbsp;"}</p>`);
    }
  }
  close(); return out.join("\n");
}
export const EXPORT_CSS = `body{margin:0;background:#fff;color:#37352f;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}.page{max-width:720px;margin:0 auto;padding:48px 24px 96px}.page.serif{font-family:Georgia,"Times New Roman",serif}.page.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.page.small{font-size:14px}.page.wide{max-width:none}
.cover{height:220px;background-size:cover;background-position:center var(--y,50%);margin:0 0 -40px}.icon{font-size:64px;line-height:1}h1.title{font-size:40px;margin:8px 0 24px}h1{font-size:30px;margin:28px 0 4px}h2{font-size:24px;margin:22px 0 4px}h3{font-size:19px;margin:16px 0 4px}h4{font-size:16px;margin:12px 0 2px}p{margin:4px 0}ul,ol{margin:4px 0;padding-left:26px}li{margin:2px 0}li.todo{list-style:none;margin-left:-22px}li.done{color:#9b9a97;text-decoration:line-through}
blockquote{border-left:3px solid #37352f;margin:8px 0;padding:2px 14px;font-size:1.05em}.callout{display:flex;gap:10px;background:#f1f1ef;border-radius:8px;padding:12px 14px;margin:8px 0}pre{background:#f7f6f3;border-radius:8px;padding:12px 14px;overflow:auto;font-size:13px}code{background:rgba(135,131,120,.15);color:#eb5757;border-radius:4px;padding:1px 5px;font-size:.88em}pre code{background:none;color:inherit;padding:0;font-size:inherit}hr{border:0;border-top:1px solid #e9e8e6;margin:16px 0}
details{margin:4px 0}summary{cursor:pointer}details>*:not(summary){margin-left:22px}.columns{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:28px}figure{margin:12px 0}img{max-width:100%;border-radius:4px}figcaption{color:#787774;font-size:13px}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}th,td{border:1px solid #e9e8e6;padding:6px 10px;text-align:left}th{color:#787774;font-weight:500}.toc a{display:block;color:#787774;text-decoration:underline}.toc .h2{padding-left:18px}.toc .h3{padding-left:36px}.toc .h4{padding-left:54px}
.chip{background:rgba(55,53,47,.08);border-radius:4px;padding:0 4px}.pagelink,.pageblock{font-weight:500;text-decoration:underline;text-decoration-color:#d3d1cb}.equation{text-align:center}
.c-gray{color:#787774}.c-brown{color:#9f6b53}.c-orange{color:#d9730d}.c-yellow{color:#cb912f}.c-green{color:#448361}.c-blue{color:#337ea9}.c-purple{color:#9065b0}.c-pink{color:#c14c8a}.c-red{color:#d44c47}
.bg-gray{background:#f1f1ef}.bg-brown{background:#f4eeee}.bg-orange{background:#fbecdd}.bg-yellow{background:#fbf3db}.bg-green{background:#edf3ec}.bg-blue{background:#e7f3f8}.bg-purple{background:#f6f3f9}.bg-pink{background:#faf1f5}.bg-red{background:#fdebec}
.foot{margin-top:64px;padding-top:16px;border-top:1px solid #e9e8e6;color:#9b9a97;font-size:12px}`;
/** Cover gallery: original gradients/solid colours (no Notion art). `g:<n>` ids are stored on the page. */
export const COVER_GALLERY: { id: string; name: string; css: string }[] = [
  { id: "g:1", name: "Sunrise", css: "linear-gradient(135deg,#f6d365 0%,#fda085 100%)" }, { id: "g:2", name: "Ocean", css: "linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%)" }, { id: "g:3", name: "Meadow", css: "linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)" }, { id: "g:4", name: "Dusk", css: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" },
  { id: "g:5", name: "Peach", css: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)" }, { id: "g:6", name: "Mint", css: "linear-gradient(135deg,#e0f7f4 0%,#b2ebf2 100%)" }, { id: "g:7", name: "Slate", css: "linear-gradient(135deg,#cfd9df 0%,#e2ebf0 100%)" }, { id: "g:8", name: "Ember", css: "linear-gradient(135deg,#f5576c 0%,#f093fb 100%)" },
  { id: "g:9", name: "Night", css: "linear-gradient(135deg,#1e3c72 0%,#2a5298 100%)" }, { id: "g:10", name: "Sand", css: "#f3eee4" }, { id: "g:11", name: "Sage", css: "#dfe8df" }, { id: "g:12", name: "Rose", css: "#f5e1e6" }, { id: "g:13", name: "Ink", css: "#37352f" }, { id: "g:14", name: "Sky", css: "#dfeefb" },
];
export const coverCss = (cover: string | undefined) => { if (!cover) return ""; const g = COVER_GALLERY.find(x => x.id === cover); if (g) return g.css; return /^(https?:|data:image\/)/i.test(cover) ? `url("${cover.replace(/"/g, "%22")}") center / cover` : ""; };
export type ExportOpts = { media?: boolean; subpages?: boolean; pageFormat?: "letter" | "a4"; scale?: number };
export function pageHtml(p: Page, o: ExportOpts = {}, extra = ""): string {
  const cls = ["page", p.font === "serif" ? "serif" : p.font === "mono" ? "mono" : "", p.smallText ? "small" : "", p.fullWidth ? "wide" : ""].filter(Boolean).join(" ");
  const cover = p.cover && (o.media ?? true) ? `<div class="cover" style="background:${coverCss(p.cover)};--y:${p.coverY ?? 50}%"></div>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title || "Untitled")}</title><style>${EXPORT_CSS}</style></head><body>${cover}<main class="${cls}">${p.icon && p.icon !== "📄" ? `<div class="icon">${esc(p.icon)}</div>` : ""}<h1 class="title">${esc(p.title || "Untitled")}</h1>${blocksToHtml(p.blocks, { media: o.media ?? true, headingIds: true })}${extra}</main></body></html>`;
}
export const slugify = (s: string) => (s || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
/** Markdown & CSV: one .md per page (databases also as CSV). */
export function markdownBundle(ws: Workspace, p: Page, subpages: boolean): { name: string; data: string }[] {
  const out: { name: string; data: string }[] = []; const walk = (pg: Page, dir: string) => {
    const base = dir + slugify(pg.title); out.push({ name: base + ".md", data: pageMarkdown(pg) });
    pg.blocks.filter(b => b.type === "table" || b.type === "board").forEach((b, i) => { const d = migrateDb(b.db, b.type === "board"); out.push({ name: `${base}${i ? "-" + (i + 1) : ""}-${slugify(d.title || "database")}.csv`, data: csvOf(d) }); });
    if (subpages) for (const c of children(ws, pg.id)) walk(c, base + "/");
  }; walk(p, ""); return out;
}
export function htmlBundle(ws: Workspace, p: Page, o: ExportOpts): { name: string; data: string }[] {
  const out: { name: string; data: string }[] = []; const walk = (pg: Page, dir: string) => { const base = dir + slugify(pg.title); out.push({ name: base + ".html", data: pageHtml(pg, o) }); if (o.subpages) for (const c of children(ws, pg.id)) walk(c, base + "/"); }; walk(p, ""); return out;
}
export const zipBytes = (files: { name: string; data: string | Uint8Array }[]) => zip(files);

// ---- PDF (pdf-lib standard fonts: WinAnsi only, so emoji and other glyphs are dropped) ----
const ascii = (s: string) => s.replace(/[^\x20-\x7e\xa0-\xff]/g, "").replace(/\s+/g, " ").trim();
export async function pagePdf(ws: Workspace, p: Page, o: ExportOpts = {}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), mono = await doc.embedFont(StandardFonts.Courier);
  const [W, H] = o.pageFormat === "a4" ? [595.28, 841.89] : [612, 792]; const scale = (o.scale ?? 100) / 100; const M = 56; let page = doc.addPage([W, H]); let y = H - M;
  const line = (text: string, size: number, f = font, indent = 0, color = rgb(0.22, 0.21, 0.18)) => {
    size *= scale; const width = W - 2 * M - indent; const words = ascii(text).split(" "); let cur = "";
    const flush = () => { if (y < M + size) { page = doc.addPage([W, H]); y = H - M; } page.drawText(cur, { x: M + indent, y, size, font: f, color }); y -= size * 1.5; cur = ""; };
    for (const w of words) { const t = cur ? cur + " " + w : w; if (f.widthOfTextAtSize(t, size) > width && cur) flush(); cur = cur ? cur + " " + w : w; }
    if (cur || !words.length) flush();
  };
  const render = (blocks: Block[], indent = 0) => { let n = 0; for (const b of blocks) {
    n = b.type === "number" ? n + 1 : 0; const t = plainText(b);
    if (b.type === "h1") { y -= 8; line(t, 22, bold, indent); } else if (b.type === "h2") { y -= 6; line(t, 18, bold, indent); } else if (b.type === "h3") { y -= 4; line(t, 15, bold, indent); } else if (b.type === "h4") line(t, 13, bold, indent);
    else if (b.type === "bullet") line("• " + t, 11, font, indent + 12); else if (b.type === "number") line(`${n}. ` + t, 11, font, indent + 12); else if (b.type === "todo") line(`[${b.checked ? "x" : " "}] ` + t, 11, font, indent + 12);
    else if (b.type === "quote" || b.type === "callout") line("| " + t, 11, font, indent + 12, rgb(0.4, 0.4, 0.38)); else if (b.type === "code" || b.type === "equation") for (const l of b.text.split("\n")) line(l || " ", 9.5, mono, indent + 8);
    else if (b.type === "divider") { y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: .5, color: rgb(.85, .85, .83) }); y -= 10; }
    else if (b.type === "toggle") { line("> " + t, 11, bold, indent); render(b.kids ?? [], indent + 16); } else if (b.type === "columns") for (const c of b.cols ?? []) render(c, indent);
    else if (b.type === "page" || b.type === "link") line("> " + (b.text || "Untitled"), 11, font, indent); else if (b.type === "table" || b.type === "board") { const d = migrateDb(b.db, b.type === "board"); if (d.title) line(d.title, 13, bold, indent); for (const r of d.rows) line(`${rowTitle(d, r) || "Untitled"}  -  ${d.props.filter(p => p.type !== "title").map(p => cellText(p, r.cells[p.id])).filter(Boolean).join("  ·  ")}`, 10.5, font, indent + 12); }
    else if (["image", "video", "audio", "file", "bookmark"].includes(b.type)) { if (o.media ?? true) line(`[${b.type}] ${b.text || b.url || ""}`.slice(0, 200), 10, font, indent, rgb(.5, .5, .48)); }
    else if (b.type !== "toc") line(t || " ", 11, font, indent);
  } };
  const one = (pg: Page) => { line(pg.title || "Untitled", 28, bold); y -= 8; render(pg.blocks); };
  one(p); if (o.subpages) for (const c of children(ws, p.id)) { page = doc.addPage([W, H]); y = H - M; one(c); }
  return doc.save();
}
export const blocksPlain = (blocks: Block[]) => blocksToMarkdown(blocks);
