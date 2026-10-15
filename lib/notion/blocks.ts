// Block model + markdown round-trip. Markdown is the interchange format (like Brainz notes): what you export is what you wrote.
export type BlockType = "p" | "h1" | "h2" | "h3" | "h4" | "bullet" | "number" | "todo" | "toggle" | "quote" | "callout" | "code" | "divider"
  | "page" | "link" | "image" | "video" | "audio" | "file" | "bookmark" | "equation" | "toc" | "columns" | "table" | "board";
export type DbStatus = "Not started" | "In progress" | "Done";
export const DB_STATUSES: DbStatus[] = ["Not started", "In progress", "Done"];
export type Db = { title: string; rows: { id: string; name: string; status: DbStatus }[] };
/** Notion's colour names. `color` is the text colour, `bg` the block background; both optional. */
export const COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export type Color = typeof COLORS[number];
export type Block = {
  id: string; type: BlockType; text: string;
  checked?: boolean; lang?: string; db?: Db;
  color?: Color; bg?: Color;
  /** toggle: the blocks inside; columns: one list per column */
  kids?: Block[]; cols?: Block[][]; open?: boolean;
  /** page / link: the page it points at (title snapshot lives in `text`) */
  pageId?: string;
  /** image / video / audio / file / bookmark: where the media lives (`text` is the caption or file name) */
  url?: string;
};
export const newDb = (): Db => ({ title: "", rows: [0, 1, 2].map(() => ({ id: bid(), name: "", status: "Not started" as DbStatus })) });
let n = 0;
export const bid = () => `b_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const mk = (type: BlockType, text = "", extra: Partial<Block> = {}): Block => ({ id: bid(), type, text, ...extra });
export const MEDIA: BlockType[] = ["image", "video", "audio", "file", "bookmark"];
export const TEXTUAL: BlockType[] = ["p", "h1", "h2", "h3", "h4", "bullet", "number", "todo", "toggle", "quote", "callout"];
export const isTextual = (t: BlockType) => TEXTUAL.includes(t);
/** Fresh ids for a block tree (duplicate / paste). */
export const cloneBlock = (b: Block): Block => ({ ...b, id: bid(), kids: b.kids?.map(cloneBlock), cols: b.cols?.map(c => c.map(cloneBlock)), db: b.db ? { ...b.db, rows: b.db.rows.map(r => ({ ...r, id: bid() })) } : undefined });

export type MenuItem = { type: BlockType; label: string; hint: string; keywords: string; prefix?: string; group: MenuGroup };
export type MenuGroup = "Basic blocks" | "Media" | "Database" | "Advanced blocks";
/** The slash menu, grouped like Notion's (Suggested shows the best matches while you type). */
export const BLOCK_MENU: MenuItem[] = [
  { type: "p", label: "Text", hint: "Just start writing with plain text.", keywords: "text paragraph plain", group: "Basic blocks" },
  { type: "page", label: "Page", hint: "Embed a sub-page inside this page.", keywords: "page subpage sub-page child", group: "Basic blocks" },
  { type: "todo", label: "To-do list", hint: "Track tasks with a to-do list.", keywords: "todo task checkbox check", prefix: "[]", group: "Basic blocks" },
  { type: "h1", label: "Heading 1", hint: "Big section heading.", keywords: "h1 heading title", prefix: "#", group: "Basic blocks" },
  { type: "h2", label: "Heading 2", hint: "Medium section heading.", keywords: "h2 heading", prefix: "##", group: "Basic blocks" },
  { type: "h3", label: "Heading 3", hint: "Small section heading.", keywords: "h3 heading", prefix: "###", group: "Basic blocks" },
  { type: "h4", label: "Heading 4", hint: "Smaller section heading.", keywords: "h4 heading", prefix: "####", group: "Basic blocks" },
  { type: "bullet", label: "Bulleted list", hint: "Create a simple bulleted list.", keywords: "bullet list ul unordered", prefix: "-", group: "Basic blocks" },
  { type: "number", label: "Numbered list", hint: "Create a list with numbering.", keywords: "number list ol ordered", prefix: "1.", group: "Basic blocks" },
  { type: "toggle", label: "Toggle list", hint: "Toggles can hide and show content inside.", keywords: "toggle collapse expand details", prefix: ">", group: "Basic blocks" },
  { type: "quote", label: "Quote", hint: "Capture a quote.", keywords: "quote blockquote cite", prefix: "\"", group: "Basic blocks" },
  { type: "callout", label: "Callout", hint: "Make writing stand out.", keywords: "callout note tip info", group: "Basic blocks" },
  { type: "table", label: "Table", hint: "Add a simple table to this page.", keywords: "table simple grid", group: "Basic blocks" },
  { type: "divider", label: "Divider", hint: "Visually divide blocks.", keywords: "divider hr line separator", prefix: "---", group: "Basic blocks" },
  { type: "link", label: "Link to page", hint: "Link to an existing page.", keywords: "link page mention", group: "Basic blocks" },
  { type: "image", label: "Image", hint: "Upload or embed with a link.", keywords: "image picture photo img", group: "Media" },
  { type: "video", label: "Video", hint: "Embed from YouTube, Vimeo or a file.", keywords: "video movie youtube", group: "Media" },
  { type: "audio", label: "Audio", hint: "Embed from SoundCloud, Spotify or a file.", keywords: "audio sound music mp3", group: "Media" },
  { type: "code", label: "Code", hint: "Capture a code snippet.", keywords: "code snippet pre fence", prefix: "```", group: "Media" },
  { type: "file", label: "File", hint: "Upload or embed with a link.", keywords: "file attachment pdf upload", group: "Media" },
  { type: "bookmark", label: "Web bookmark", hint: "Save a link as a visual bookmark.", keywords: "bookmark web link url", group: "Media" },
  { type: "table", label: "Table view", hint: "Add a database as a table.", keywords: "table view database inline", group: "Database" },
  { type: "board", label: "Board view", hint: "Add a database as a kanban board.", keywords: "board view database kanban inline", group: "Database" },
  { type: "columns", label: "2 columns", hint: "Put blocks side by side.", keywords: "columns two side layout", group: "Advanced blocks" },
  { type: "equation", label: "Block equation", hint: "Display a standalone math equation.", keywords: "equation math latex tex formula", group: "Advanced blocks" },
  { type: "toc", label: "Table of contents", hint: "Show an outline of your page.", keywords: "toc table of contents outline", group: "Advanced blocks" },
];
export const MENU_GROUPS: MenuGroup[] = ["Basic blocks", "Media", "Database", "Advanced blocks"];
/** Items that match `q` (label or keyword). The empty query returns everything, in menu order. Table view/Table share a type; keep both. */
export const filterMenu = (q: string) => { const s = q.trim().toLowerCase(); return BLOCK_MENU.filter(m => !s || m.label.toLowerCase().includes(s) || m.keywords.includes(s)); };
/** Turn-into options (the block menu / toolbar): one entry per textual type plus code and callout. */
export const TURN_INTO: BlockType[] = ["p", "h1", "h2", "h3", "h4", "bullet", "number", "todo", "toggle", "quote", "callout", "code"];
export const labelOf = (t: BlockType) => BLOCK_MENU.find(m => m.type === t)?.label ?? t;

/** Typing a markdown prefix at the start of a paragraph turns it into that block (Notion's "markdown shortcuts"). Returns null if no shortcut applies. */
export function applyShortcut(b: Block): Block | null {
  if (b.type !== "p" && b.type !== "bullet" && b.type !== "number" && b.type !== "todo" && b.type !== "quote" && b.type !== "toggle") return null;
  const t = b.text; let m: RegExpMatchArray | null;
  if ((m = t.match(/^(#{1,4}) (.*)$/s))) return { ...b, type: (["h1", "h2", "h3", "h4"] as const)[m[1].length - 1], text: m[2] };
  if ((m = t.match(/^\[( |x)?\] (.*)$/s)) && b.type !== "todo") return { ...b, type: "todo", checked: m[1] === "x", text: m[2] };
  if ((m = t.match(/^[-*+] (.*)$/s)) && b.type !== "bullet") return { ...b, type: "bullet", text: m[1] };
  if ((m = t.match(/^\d+\. (.*)$/s)) && b.type !== "number") return { ...b, type: "number", text: m[1] };
  // Notion: "> " makes a toggle, '" ' makes a quote.
  if ((m = t.match(/^> (.*)$/s)) && b.type !== "toggle" && b.type !== "quote") return { ...b, type: "toggle", text: m[1], open: true, kids: [] };
  if ((m = t.match(/^" (.*)$/s)) && b.type !== "quote") return { ...b, type: "quote", text: m[1] };
  if (b.type === "p" && (m = t.match(/^```(\w*)$/))) return { ...b, type: "code", text: "", lang: m[1] || undefined };
  if (b.type === "p" && /^(---|\*\*\*)$/.test(t)) return { ...b, type: "divider", text: "" };
  if (b.type === "p" && /^\$\$$/.test(t)) return { ...b, type: "equation", text: "" };
  return null;
}
/** Enter inside a block: where does the caret split? Empty list/quote items drop back to a paragraph instead of continuing. */
export function splitBlock(b: Block, caret: number): Block[] {
  if (b.type === "divider") return [b];
  if (["bullet", "number", "todo", "quote", "callout", "toggle"].includes(b.type) && b.text === "") return [{ ...b, type: "p", checked: undefined, kids: undefined, open: undefined }];
  const before = b.text.slice(0, caret), after = b.text.slice(caret);
  const keep = ["bullet", "number", "todo"].includes(b.type) ? b.type : b.type === "quote" || b.type === "callout" ? b.type : "p";
  const first: Block = { ...b, text: before };
  const second: Block = mk(keep as BlockType, after, keep === "todo" ? { checked: false } : {});
  return [first, second];
}
export const mergeUp = (prev: Block, cur: Block): Block => ({ ...prev, text: prev.text + cur.text });
/** Display number of each numbered block (restarts after any non-numbered block). */
export function numbering(blocks: Block[]): Record<string, number> {
  const out: Record<string, number> = {}; let k = 0;
  for (const b of blocks) { if (b.type === "number") out[b.id] = ++k; else k = 0; }
  return out;
}
export const moveBlock = (blocks: Block[], id: string, dir: -1 | 1): Block[] => {
  const i = blocks.findIndex(b => b.id === id), j = i + dir; if (i < 0 || j < 0 || j >= blocks.length) return blocks;
  const c = [...blocks]; [c[i], c[j]] = [c[j], c[i]]; return c;
};
/** Drag-and-drop: put block `id` at position `to` (index in the list *before* removal). */
export function reorder(blocks: Block[], id: string, to: number): Block[] {
  const i = blocks.findIndex(b => b.id === id); if (i < 0) return blocks;
  const c = [...blocks]; const [b] = c.splice(i, 1); c.splice(to > i ? to - 1 : to, 0, b); return c;
}
export const turnInto = (blocks: Block[], id: string, type: BlockType): Block[] => blocks.map(b => b.id === id ? {
  ...b, type, checked: type === "todo" ? !!b.checked : undefined,
  text: type === "divider" || type === "table" || type === "board" ? "" : b.text,
  db: type === "table" || type === "board" ? b.db ?? newDb() : undefined,
  kids: type === "toggle" ? b.kids ?? [] : undefined, open: type === "toggle" ? b.open ?? true : undefined,
} : b);
/** Headings in reading order (table of contents). */
export const headings = (blocks: Block[]) => blocks.filter(b => b.type === "h1" || b.type === "h2" || b.type === "h3" || b.type === "h4");

// ---- markdown ----
const dbMarkdown = (db: Db | undefined, board: boolean) => { const rows = db?.rows ?? []; const head = db?.title ? `**${db.title}**\n\n` : ""; return head + ["| Name | Status |", "| --- | --- |", ...rows.map(r => `| ${r.name.replace(/\|/g, "\\|")} | ${r.status} |`)].join("\n") + (board ? "\n<!-- board -->" : ""); };
const colorNote = (b: Block) => (b.color || b.bg) ? `<!-- color:${b.color ?? ""}${b.bg ? ` bg:${b.bg}` : ""} -->\n` : "";
const indent = (md: string) => md.replace(/\n$/, "");
export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = []; let num = 0;
  blocks.forEach((b, i) => {
    num = b.type === "number" ? num + 1 : 0;
    const t = b.text;
    const line = b.type === "h1" ? `# ${t}` : b.type === "h2" ? `## ${t}` : b.type === "h3" ? `### ${t}` : b.type === "h4" ? `#### ${t}` : b.type === "bullet" ? `- ${t}` : b.type === "number" ? `${num}. ${t}`
      : b.type === "todo" ? `- [${b.checked ? "x" : " "}] ${t}` : b.type === "quote" ? t.split("\n").map(l => `> ${l}`).join("\n") : b.type === "callout" ? t.split("\n").map((l, k) => (k === 0 ? `> 💡 ${l}` : `> ${l}`)).join("\n")
      : b.type === "code" ? "```" + (b.lang ?? "") + "\n" + t + "\n```" : b.type === "divider" ? "---" : b.type === "table" ? dbMarkdown(b.db, false) : b.type === "board" ? dbMarkdown(b.db, true)
      : b.type === "toggle" ? `<details${b.open ? " open" : ""}>\n<summary>${t}</summary>\n\n${indent(blocksToMarkdown(b.kids ?? []))}\n\n</details>`
      : b.type === "columns" ? `<!-- columns -->\n${(b.cols ?? []).map(c => indent(blocksToMarkdown(c))).join("\n\n<!-- column -->\n\n")}\n\n<!-- /columns -->`
      : b.type === "page" ? `📄 [[${t || "Untitled"}]]` : b.type === "link" ? `↗ [[${t || "Untitled"}]]`
      : b.type === "image" ? `![${t}](${b.url ?? ""})` : b.type === "video" ? `<video src="${b.url ?? ""}"></video>` : b.type === "audio" ? `<audio src="${b.url ?? ""}"></audio>`
      : b.type === "file" ? `[📎 ${t || "File"}](${b.url ?? ""})` : b.type === "bookmark" ? `[🔖 ${t || b.url || "Bookmark"}](${b.url ?? ""})`
      : b.type === "equation" ? `$$\n${t}\n$$` : b.type === "toc" ? "<!-- toc -->" : t;
    out.push(colorNote(b) + line);
    const next = blocks[i + 1];
    const tight = next && ((b.type === "bullet" || b.type === "todo") && (next.type === "bullet" || next.type === "todo") || b.type === "number" && next.type === "number");
    if (next) out.push(tight ? "\n" : "\n\n");
  });
  return out.join("").replace(/\n\n\n/g, "\n\n") .replace(/\n\n$/, "") + (blocks.length ? "\n" : "");
}
const isColor = (s: string): s is Color => (COLORS as readonly string[]).includes(s);
export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n"); const out: Block[] = []; let para: string[] = [];
  let pendingColor: { color?: Color; bg?: Color } | null = null;
  const push = (b: Block) => { if (pendingColor) { b = { ...b, ...pendingColor }; pendingColor = null; } out.push(b); };
  const flush = () => { if (para.length) { push(mk("p", para.join("\n"))); para = []; } };
  // Collect lines until a closing marker at depth 0 (details / columns nest).
  const until = (i: number, open: RegExp, close: RegExp): [string[], number] => { const body: string[] = []; let d = 0; for (; i < lines.length; i++) { if (open.test(lines[i])) d++; else if (close.test(lines[i])) { if (d === 0) break; d--; } body.push(lines[i]); } return [body, i]; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; let m: RegExpMatchArray | null;
    if ((m = l.match(/^```(\w*)\s*$/))) { flush(); const body: string[] = []; i++; while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]); push(mk("code", body.join("\n"), m[1] ? { lang: m[1] } : {})); continue; }
    if (/^\$\$\s*$/.test(l)) { flush(); const body: string[] = []; i++; while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) body.push(lines[i++]); push(mk("equation", body.join("\n"))); continue; }
    if ((m = l.match(/^<!-- color:(\w*)(?: bg:(\w+))? -->\s*$/))) { flush(); pendingColor = { ...(isColor(m[1]) ? { color: m[1] } : {}), ...(m[2] && isColor(m[2]) ? { bg: m[2] } : {}) }; continue; }
    if (/^<!-- toc -->\s*$/.test(l)) { flush(); push(mk("toc")); continue; }
    if (/^<!-- columns -->\s*$/.test(l)) { flush(); const [body, end] = until(i + 1, /^<!-- columns -->\s*$/, /^<!-- \/columns -->\s*$/); i = end;
      const cols: string[][] = [[]]; let d = 0; for (const x of body) { if (/^<!-- columns -->\s*$/.test(x)) d++; else if (/^<!-- \/columns -->\s*$/.test(x)) d--; if (d === 0 && /^<!-- column -->\s*$/.test(x)) { cols.push([]); continue; } cols[cols.length - 1].push(x); }
      push(mk("columns", "", { cols: cols.map(c => { const bs = markdownToBlocks(c.join("\n")); return bs.length ? bs : [mk("p")]; }) })); continue; }
    if ((m = l.match(/^<details( open)?>\s*$/))) { flush(); const open = !!m[1]; let title = ""; let j = i + 1; const sm = lines[j]?.match(/^<summary>(.*)<\/summary>\s*$/); if (sm) { title = sm[1]; j++; }
      const [body, end] = until(j, /^<details( open)?>\s*$/, /^<\/details>\s*$/); i = end; push(mk("toggle", title, { open, kids: markdownToBlocks(body.join("\n")) })); continue; }
    if (/^\s*$/.test(l)) { flush(); continue; }
    if ((m = l.match(/^(#{1,4}) (.*)$/))) { flush(); push(mk((["h1", "h2", "h3", "h4"] as const)[m[1].length - 1], m[2])); continue; }
    if (/^(---|\*\*\*|___)\s*$/.test(l)) { flush(); push(mk("divider")); continue; }
    if ((m = l.match(/^\s*[-*+] \[( |x|X)\] (.*)$/))) { flush(); push(mk("todo", m[2], { checked: m[1].toLowerCase() === "x" })); continue; }
    if ((m = l.match(/^\s*[-*+] (.*)$/))) { flush(); push(mk("bullet", m[1])); continue; }
    if ((m = l.match(/^\s*\d+[.)] (.*)$/))) { flush(); push(mk("number", m[1])); continue; }
    if (/^>/.test(l)) { flush(); const q: string[] = [l.replace(/^> ?/, "")]; while (i + 1 < lines.length && /^>/.test(lines[i + 1])) q.push(lines[++i].replace(/^> ?/, "")); const first = q[0]; if (/^(💡|ℹ️|⚠️)\s/u.test(first)) { q[0] = first.replace(/^\S+\s/u, ""); push(mk("callout", q.join("\n"))); } else push(mk("quote", q.join("\n"))); continue; }
    if ((m = l.match(/^📄 \[\[([^\]]+)\]\]\s*$/))) { flush(); push(mk("page", m[1])); continue; }
    if ((m = l.match(/^↗ \[\[([^\]]+)\]\]\s*$/))) { flush(); push(mk("link", m[1])); continue; }
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]*)\)\s*$/))) { flush(); push(mk("image", m[1], { url: m[2] })); continue; }
    if ((m = l.match(/^<(video|audio) src="([^"]*)"><\/\1>\s*$/))) { flush(); push(mk(m[1] as BlockType, "", { url: m[2] })); continue; }
    if ((m = l.match(/^\[(📎|🔖) ([^\]]*)\]\(([^)\s]*)\)\s*$/))) { flush(); push(mk(m[1] === "📎" ? "file" : "bookmark", m[2], { url: m[3] })); continue; }
    if (/^\|\s*Name\s*\|\s*Status\s*\|\s*$/.test(l) && /^\|\s*-+\s*\|\s*-+\s*\|\s*$/.test(lines[i + 1] ?? "")) {
      flush(); i += 2; const rows: Db["rows"] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { const cells = lines[i].trim().slice(1, -1).split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|")); const st = (DB_STATUSES as string[]).includes(cells[1]) ? (cells[1] as DbStatus) : "Not started"; rows.push({ id: bid(), name: cells[0] ?? "", status: st }); i++; }
      let board = false; if (/^<!-- board -->\s*$/.test(lines[i] ?? "")) { board = true; i++; } i--;
      const prev = out[out.length - 1]; let title = ""; if (prev && prev.type === "p" && /^\*\*(.+)\*\*$/.test(prev.text)) { title = prev.text.slice(2, -2); out.pop(); }
      push(mk(board ? "board" : "table", "", { db: { title, rows } })); continue;
    }
    para.push(l);
  }
  flush(); return out;
}

// ---- inline markdown ----
export type Inline = { t: "text" | "bold" | "italic" | "code" | "strike" | "underline" | "link" | "page" | "mention" | "color" | "mark"; text: string; href?: string; color?: string; s: number };
/**
 * Tokens with `s` = the raw-string offset where the displayed text begins, so a DOM selection on the rendered
 * view maps back to raw offsets (the formatting toolbar needs that).
 */
export function inlineTokens(src: string): Inline[] {
  const out: Inline[] = []; let rest = src; let base = 0;
  const re = /\[\[([^\]\n]+)\]\]|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|<u>([^<\n]+)<\/u>|<font color="(\w+)">([^<\n]+)<\/font>|<mark class="(\w+)">([^<\n]+)<\/mark>|@\[([^\]\n]+)\]|\*([^*\n]+)\*|_([^_\n]+)_/;
  while (rest) {
    const m = re.exec(rest); if (!m) { out.push({ t: "text", text: rest, s: base }); break; }
    if (m.index) out.push({ t: "text", text: rest.slice(0, m.index), s: base });
    const at = base + m.index; const end = at + m[0].length;
    if (m[1] !== undefined) out.push({ t: "page", text: m[1], s: at + 2 }); else if (m[2] !== undefined) out.push({ t: "link", text: m[2], href: m[3], s: at + 1 });
    else if (m[4] !== undefined) out.push({ t: "code", text: m[4], s: at + 1 }); else if (m[5] !== undefined) out.push({ t: "bold", text: m[5], s: at + 2 });
    else if (m[6] !== undefined) out.push({ t: "strike", text: m[6], s: at + 2 }); else if (m[7] !== undefined) out.push({ t: "underline", text: m[7], s: at + 3 });
    else if (m[9] !== undefined) out.push({ t: "color", text: m[9], color: m[8], s: end - 7 - m[9].length });
    else if (m[11] !== undefined) out.push({ t: "mark", text: m[11], color: m[10], s: end - 7 - m[11].length });
    else if (m[12] !== undefined) out.push({ t: "mention", text: m[12], s: at + 2 });
    else out.push({ t: "italic", text: (m[13] ?? m[14])!, s: at + 1 });
    rest = rest.slice(m.index + m[0].length); base = end;
  }
  return out;
}
export const plainText = (b: Block) => inlineTokens(b.text).map(t => t.text).join("");
/** Wrap raw range [a,b) of `text` in inline markup. Used by the formatting toolbar and ⌘B/I/U/E… */
export type InlineStyle = "bold" | "italic" | "underline" | "strike" | "code";
export const WRAP: Record<InlineStyle, [string, string]> = { bold: ["**", "**"], italic: ["*", "*"], underline: ["<u>", "</u>"], strike: ["~~", "~~"], code: ["`", "`"] };
export function wrapRange(text: string, a: number, b: number, [l, r]: [string, string]): { text: string; a: number; b: number } {
  const [s, e] = a <= b ? [a, b] : [b, a]; const inner = text.slice(s, e);
  // Toggle off when the exact range is already wrapped.
  if (text.slice(s - l.length, s) === l && text.slice(e, e + r.length) === r) return { text: text.slice(0, s - l.length) + inner + text.slice(e + r.length), a: s - l.length, b: e - l.length };
  if (inner.startsWith(l) && inner.endsWith(r) && inner.length >= l.length + r.length) return { text: text.slice(0, s) + inner.slice(l.length, inner.length - r.length) + text.slice(e), a: s, b: e - l.length - r.length };
  return { text: text.slice(0, s) + l + inner + r + text.slice(e), a: s + l.length, b: e + l.length };
}
export const linkRange = (text: string, a: number, b: number, href: string) => { const [s, e] = a <= b ? [a, b] : [b, a]; return text.slice(0, s) + `[${text.slice(s, e) || href}](${href})` + text.slice(e); };
export const colorRange = (text: string, a: number, b: number, color: Color | null, bg = false) => { const [s, e] = a <= b ? [a, b] : [b, a]; const inner = text.slice(s, e); return text.slice(0, s) + (color ? (bg ? `<mark class="${color}">${inner}</mark>` : `<font color="${color}">${inner}</font>`) : inner) + text.slice(e); };
/** `@` mention markup: people and dates are `@[…]`, pages reuse `[[…]]`. */
export const mentionText = (kind: "person" | "page" | "date", v: string) => kind === "page" ? `[[${v}]]` : `@[${v}]`;
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const fmtDate = (iso: string) => { const d = new Date(iso + "T12:00:00"); return isNaN(+d) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
