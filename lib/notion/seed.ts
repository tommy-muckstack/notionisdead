import { markdownToBlocks } from "./blocks";
import { createPage, emptyWorkspace, updatePage, type Workspace } from "./pages";
const GETTING_STARTED = `Welcome! This page is a real document: click any line and type.

## Try these
- Type \`/\` on an empty line to pick a block type
- Start a line with \`# \`, \`- \`, \`1. \`, \`[] \` or \`> \` to turn it into a heading, list, to-do or quote
- Select text? Wrap it in **double stars** for bold, *single stars* for italic, \`backticks\` for code
- Link to another page with [[Weekly planning]]
- Move a block with ⌘⇧↑ / ⌘⇧↓, and search everything with ⌘K

## Your first to-dos
- [x] Open the demo
- [ ] Add a page from the sidebar
- [ ] Export this page as Markdown

> 💡 Everything is stored as plain Markdown, so you can take it with you.
`;
const PLANNING = `## This week
- [ ] Draft the launch post
- [ ] Review pricing page copy
- [x] Book the design review

## Notes
Back to [[Getting started]]. The roadmap lives in [[Roadmap]].
`;
const ROADMAP = `# Roadmap

1. Ship the editor
2. Add page sharing
3. Write the docs

\`\`\`ts
const status = "in progress";
\`\`\`

---

Questions? Add them under **Notes** in [[Weekly planning]].
`;
export function seedWorkspace(now = new Date()): Workspace {
  let ws = emptyWorkspace();
  const a = createPage(ws, { title: "Getting started", icon: "👋", blocks: markdownToBlocks(GETTING_STARTED) }, now); ws = a.ws;
  const b = createPage(ws, { title: "Weekly planning", icon: "🗓️", blocks: markdownToBlocks(PLANNING) }, now); ws = b.ws;
  const c = createPage(ws, { title: "Roadmap", icon: "🧭", parentId: b.page.id, blocks: markdownToBlocks(ROADMAP) }, now); ws = c.ws;
  ws = updatePage(ws, a.page.id, { favorite: true }, now);
  return { ...ws, recent: [a.page.id] };
}
