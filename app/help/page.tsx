import Link from "next/link";
import { NtPage } from "@/components/NtHome";
import { SHORTCUTS } from "@/lib/notion/shortcuts";
export const metadata = { title: "Help center — NotionIsDead" };
const FAQ: [string, string][] = [
  ["Where are my pages stored?", "In your browser (localStorage), keyed to your account or guest session. Nothing is uploaded unless you publish a page. Export from the ••• menu or Settings → General to keep a copy."],
  ["Do I need an account?", "No. The app opens as a guest. Signing in keeps the same data and lets you pick it up after clearing the browser (guest data is adopted by the account on first sign-in)."],
  ["How do I publish a page?", "Share → Publish → Publish. You get a public read-only link you can copy, index or not, and unpublish at any time."],
  ["Can I collaborate with others?", "Not yet: there is no sync server, so a workspace lives in one browser. Publishing a page is the way to share it today."],
  ["How do I import from Notion?", "Export your Notion pages as Markdown & CSV, then use ••• → Import (or Settings → Import) with the .md and .csv files."],
  ["Is there a dark theme or AI?", "No dark theme yet (tracked on GitHub). No AI features: anything in Notion that relies on hosted models is out of scope."],
];
export default function Help() {
  return <NtPage title="Help center" lede="Short answers, the full keyboard reference, and where to ask.">
    <h2>Getting started</h2><ol><li>Open <Link href="/app">the app</Link>: it starts with a Welcome page and a To-do list.</li><li>Press <kbd>Enter</kbd> in a title to move into the body; type <kbd>/</kbd> for blocks, <kbd>@</kbd> for mentions.</li><li>Type <kbd>/table</kbd> for a database; add properties and views from its toolbar.</li><li>Use <kbd>⌘K</kbd> (or <kbd>Ctrl+P</kbd>) to search everything.</li></ol>
    <h2 id="shortcuts">Keyboard shortcuts</h2><table className="nt-table"><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>)}</tbody></table>
    <h2 id="faq">Questions</h2>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
    <h2>Still stuck?</h2><p><a href="https://github.com/tommy-muckstack/notionisdead/issues/new" target="_blank" rel="noreferrer">Open an issue on GitHub ↗</a> with what you expected and what happened. Bugs with steps to reproduce get fixed first.</p>
  </NtPage>;
}
