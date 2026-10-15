// Block model + markdown round-trip. Markdown is the interchange format (like Brainz notes): what you export is what you wrote.
export type BlockType = "p" | "h1" | "h2" | "h3" | "bullet" | "number" | "todo" | "quote" | "code" | "divider" | "callout";
export type Block = { id: string; type: BlockType; text: string; checked?: boolean; lang?: string };
let n = 0;
export const bid = () => `b_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const mk = (type: BlockType, text = "", extra: Partial<Block> = {}): Block => ({ id: bid(), type, text, ...extra });

export const BLOCK_MENU: { type: BlockType; label: string; hint: string; keywords: string; prefix?: string }[] = [
  { type: "p", label: "Text", hint: "Plain paragraph", keywords: "text paragraph plain" },
  { type: "h1", label: "Heading 1", hint: "Big section title", keywords: "h1 heading title", prefix: "#" },
  { type: "h2", label: "Heading 2", hint: "Medium section title", keywords: "h2 heading", prefix: "##" },
  { type: "h3", label: "Heading 3", hint: "Small section title", keywords: "h3 heading", prefix: "###" },
  { type: "bullet", label: "Bulleted list", hint: "A simple list", keywords: "bullet list ul unordered", prefix: "-" },
  { type: "number", label: "Numbered list", hint: "A list with numbers", keywords: "number list ol ordered", prefix: "1." },
  { type: "todo", label: "To-do list", hint: "Track tasks with checkboxes", keywords: "todo task checkbox check", prefix: "[]" },
  { type: "quote", label: "Quote", hint: "Capture a quote", keywords: "quote blockquote cite", prefix: ">" },
  { type: "code", label: "Code", hint: "A fenced code block", keywords: "code snippet pre fence", prefix: "```" },
  { type: "callout", label: "Callout", hint: "Make writing stand out", keywords: "callout note tip info" },
  { type: "divider", label: "Divider", hint: "Visually divide blocks", keywords: "divider hr line separator", prefix: "---" },
];
export const filterMenu = (q: string) => { const s = q.trim().toLowerCase(); return BLOCK_MENU.filter(m => !s || m.label.toLowerCase().includes(s) || m.keywords.includes(s)); };

/** Typing a markdown prefix at the start of a paragraph turns it into that block (Notion's "markdown shortcuts"). Returns null if no shortcut applies. */
export function applyShortcut(b: Block): Block | null {
  if (b.type !== "p" && b.type !== "bullet" && b.type !== "number" && b.type !== "todo" && b.type !== "quote") return null;
  const t = b.text; let m: RegExpMatchArray | null;
  if ((m = t.match(/^(#{1,3}) (.*)$/s))) return { ...b, type: (["h1", "h2", "h3"] as const)[m[1].length - 1], text: m[2] };
  if ((m = t.match(/^\[( |x)?\] (.*)$/s)) && b.type !== "todo") return { ...b, type: "todo", checked: m[1] === "x", text: m[2] };
  if ((m = t.match(/^[-*+] (.*)$/s)) && b.type !== "bullet") return { ...b, type: "bullet", text: m[1] };
  if ((m = t.match(/^\d+\. (.*)$/s)) && b.type !== "number") return { ...b, type: "number", text: m[1] };
  if ((m = t.match(/^> (.*)$/s)) && b.type !== "quote") return { ...b, type: "quote", text: m[1] };
  if (b.type === "p" && (m = t.match(/^```(\w*)$/))) return { ...b, type: "code", text: "", lang: m[1] || undefined };
  if (b.type === "p" && /^(---|\*\*\*)$/.test(t)) return { ...b, type: "divider", text: "" };
  return null;
}
/** Enter inside a block: where does the caret split? Empty list/quote items drop back to a paragraph instead of continuing. */
export function splitBlock(b: Block, caret: number): Block[] {
  if (b.type === "divider") return [b];
  if (["bullet", "number", "todo", "quote", "callout"].includes(b.type) && b.text === "") return [{ ...b, type: "p", checked: undefined }];
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
export const turnInto = (blocks: Block[], id: string, type: BlockType): Block[] => blocks.map(b => b.id === id ? { ...b, type, checked: type === "todo" ? !!b.checked : undefined, text: type === "divider" ? "" : b.text } : b);

// ---- markdown ----
export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = []; let num = 0;
  blocks.forEach((b, i) => {
    num = b.type === "number" ? num + 1 : 0;
    const t = b.text;
    const line = b.type === "h1" ? `# ${t}` : b.type === "h2" ? `## ${t}` : b.type === "h3" ? `### ${t}` : b.type === "bullet" ? `- ${t}` : b.type === "number" ? `${num}. ${t}`
      : b.type === "todo" ? `- [${b.checked ? "x" : " "}] ${t}` : b.type === "quote" ? t.split("\n").map(l => `> ${l}`).join("\n") : b.type === "callout" ? t.split("\n").map((l, k) => (k === 0 ? `> 💡 ${l}` : `> ${l}`)).join("\n")
      : b.type === "code" ? "```" + (b.lang ?? "") + "\n" + t + "\n```" : b.type === "divider" ? "---" : t;
    out.push(line);
    const next = blocks[i + 1];
    const tight = next && ((b.type === "bullet" || b.type === "todo") && (next.type === "bullet" || next.type === "todo") || b.type === "number" && next.type === "number");
    if (next) out.push(tight ? "\n" : "\n\n");
  });
  return out.join("").replace(/\n\n\n/g, "\n\n") .replace(/\n\n$/, "") + (blocks.length ? "\n" : "");
}
export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n"); const out: Block[] = []; let para: string[] = [];
  const flush = () => { if (para.length) { out.push(mk("p", para.join("\n"))); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; let m: RegExpMatchArray | null;
    if ((m = l.match(/^```(\w*)\s*$/))) { flush(); const body: string[] = []; i++; while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]); out.push(mk("code", body.join("\n"), m[1] ? { lang: m[1] } : {})); continue; }
    if (/^\s*$/.test(l)) { flush(); continue; }
    if ((m = l.match(/^(#{1,3}) (.*)$/))) { flush(); out.push(mk((["h1", "h2", "h3"] as const)[m[1].length - 1], m[2])); continue; }
    if (/^(---|\*\*\*|___)\s*$/.test(l)) { flush(); out.push(mk("divider")); continue; }
    if ((m = l.match(/^\s*[-*+] \[( |x|X)\] (.*)$/))) { flush(); out.push(mk("todo", m[2], { checked: m[1].toLowerCase() === "x" })); continue; }
    if ((m = l.match(/^\s*[-*+] (.*)$/))) { flush(); out.push(mk("bullet", m[1])); continue; }
    if ((m = l.match(/^\s*\d+[.)] (.*)$/))) { flush(); out.push(mk("number", m[1])); continue; }
    if (/^>/.test(l)) { flush(); const q: string[] = [l.replace(/^> ?/, "")]; while (i + 1 < lines.length && /^>/.test(lines[i + 1])) q.push(lines[++i].replace(/^> ?/, "")); const first = q[0]; if (/^(💡|ℹ️|⚠️)\s/u.test(first)) { q[0] = first.replace(/^\S+\s/u, ""); out.push(mk("callout", q.join("\n"))); } else out.push(mk("quote", q.join("\n"))); continue; }
    para.push(l);
  }
  flush(); return out;
}

// ---- inline markdown ----
export type Inline = { t: "text" | "bold" | "italic" | "code" | "strike" | "link" | "page"; text: string; href?: string };
export function inlineTokens(src: string): Inline[] {
  const out: Inline[] = []; let rest = src;
  const re = /\[\[([^\]\n]+)\]\]|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_/;
  while (rest) {
    const m = re.exec(rest); if (!m) { out.push({ t: "text", text: rest }); break; }
    if (m.index) out.push({ t: "text", text: rest.slice(0, m.index) });
    if (m[1] !== undefined) out.push({ t: "page", text: m[1] }); else if (m[2] !== undefined) out.push({ t: "link", text: m[2], href: m[3] });
    else if (m[4] !== undefined) out.push({ t: "code", text: m[4] }); else if (m[5] !== undefined) out.push({ t: "bold", text: m[5] });
    else if (m[6] !== undefined) out.push({ t: "strike", text: m[6] }); else out.push({ t: "italic", text: (m[7] ?? m[8])! });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}
export const plainText = (b: Block) => inlineTokens(b.text).map(t => t.text).join("");
