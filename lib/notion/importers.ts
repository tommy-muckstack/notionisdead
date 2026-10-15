// Import: HTML → Markdown (then the normal Markdown importer), plain text. Browser-only (DOMParser).
const inline = (n: Node): string => {
  if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").replace(/\s+/g, " ");
  const el = n as HTMLElement; const kids = Array.from(el.childNodes).map(inline).join(""); const tag = el.tagName?.toLowerCase();
  if (tag === "strong" || tag === "b") return kids.trim() ? `**${kids.trim()}**` : ""; if (tag === "em" || tag === "i") return kids.trim() ? `*${kids.trim()}*` : ""; if (tag === "u") return kids.trim() ? `<u>${kids.trim()}</u>` : "";
  if (tag === "s" || tag === "del" || tag === "strike") return kids.trim() ? `~~${kids.trim()}~~` : ""; if (tag === "code") return `\`${el.textContent ?? ""}\``;
  if (tag === "a") { const href = el.getAttribute("href") ?? ""; return /^https?:\/\//.test(href) ? `[${kids.trim() || href}](${href})` : kids; } if (tag === "br") return "\n";
  return kids;
};
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html"); const out: string[] = []; let num = 0;
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { const t = (n.textContent ?? "").trim(); if (t) out.push(t); return; }
    const el = n as HTMLElement; const tag = el.tagName?.toLowerCase(); if (!tag || ["script", "style", "head", "nav", "noscript"].includes(tag)) return;
    const text = () => inline(el).trim();
    if (/^h[1-6]$/.test(tag)) { out.push("#".repeat(Math.min(4, +tag[1])) + " " + text()); return; }
    if (tag === "p") { const t = text(); if (t) out.push(t); return; }
    if (tag === "hr") { out.push("---"); return; }
    if (tag === "pre") { out.push("```\n" + (el.textContent ?? "").replace(/\n$/, "") + "\n```"); return; }
    if (tag === "blockquote") { out.push(text().split("\n").map(l => "> " + l).join("\n")); return; }
    if (tag === "img") { out.push(`![${el.getAttribute("alt") ?? ""}](${el.getAttribute("src") ?? ""})`); return; }
    if (tag === "ul" || tag === "ol") { num = 0; const items: string[] = []; for (const li of Array.from(el.children)) { if (li.tagName.toLowerCase() !== "li") continue; const cb = li.querySelector("input[type=checkbox]"); const t = inline(li).replace(/\s+/g, " ").trim(); items.push(cb ? `- [${(cb as HTMLInputElement).checked ? "x" : " "}] ${t}` : tag === "ol" ? `${++num}. ${t}` : `- ${t}`); } out.push(items.join("\n")); return; }
    if (tag === "table") { const rows = Array.from(el.querySelectorAll("tr")).map(tr => Array.from(tr.children).map(c => (c.textContent ?? "").trim())); if (rows.length) { out.push([`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map(r => `| ${r.join(" | ")} |`)].join("\n")); } return; }
    if (tag === "details") { const sm = el.querySelector("summary"); const body = Array.from(el.childNodes).filter(c => c !== sm); const inner: string[] = []; const save = out.length; for (const c of body) walk(c); inner.push(...out.splice(save)); out.push(`<details>\n<summary>${sm ? inline(sm).trim() : ""}</summary>\n\n${inner.join("\n\n")}\n\n</details>`); return; }
    for (const c of Array.from(el.childNodes)) walk(c);
  };
  walk(doc.body); const title = doc.querySelector("title")?.textContent?.trim();
  return (title && !/^# /.test(out[0] ?? "") ? `# ${title}\n\n` : "") + out.join("\n\n") + "\n";
}
export const textToMarkdown = (t: string) => t.replace(/\r\n/g, "\n");
export const IMPORT_SOURCES: { id: string; name: string; icon: string; accept?: string; note?: string }[] = [
  { id: "md", name: "Text & Markdown", icon: "📝", accept: ".md,.markdown,.txt,text/markdown,text/plain" },
  { id: "html", name: "HTML", icon: "🌐", accept: ".html,.htm,text/html" },
  { id: "txt", name: "Plain text", icon: "📄", accept: ".txt,text/plain" },
  { id: "csv", name: "CSV", icon: "📊", accept: ".csv,text/csv", note: "Lands as an inline table database" },
  { id: "word", name: "Word", icon: "🟦", note: "Save the document as HTML or Markdown first, then import that" },
  { id: "gdocs", name: "Google Docs", icon: "📘", note: "File → Download → Markdown, then import that" },
  { id: "evernote", name: "Evernote", icon: "🐘", note: "Needs Evernote's API; not in the open-source version" },
  { id: "trello", name: "Trello", icon: "📋", note: "Needs Trello's API; not in the open-source version" },
  { id: "asana", name: "Asana", icon: "🟥", note: "Needs Asana's API; not in the open-source version" },
  { id: "confluence", name: "Confluence", icon: "🔷", note: "Export the space as HTML, then import the pages" },
];
