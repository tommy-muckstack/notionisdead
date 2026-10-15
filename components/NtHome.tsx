import Link from "next/link";
import "./pk.css";
import "./nthome.css";
import { NtNavMenus, GH } from "./NtNavMenus";

export const NtMark = ({ s = 24 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="#fff" stroke="#111" strokeWidth="1.8" /><path d="M8 17V7.5l8 9V7" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export function NtNav() {
  return <header className="nt-nav"><Link href="/" className="nt-lg" aria-label="NotionIsDead home"><NtMark s={28} /></Link>
    <nav><NtNavMenus /><Link href="/pricing">Pricing</Link><Link href="/app">Try the demo</Link></nav>
    <div className="r"><Link href="/login" className="nt-t">Log in</Link><Link href="/login?mode=signup" className="nt-b">Get NotionIsDead free</Link></div></header>;
}
type L = { label: string; href: string; ext?: boolean };
const FOOT: [string, L[]][] = [
  ["Product", [{ label: "Editor", href: "/#editor" }, { label: "Databases", href: "/#databases" }, { label: "Publish to the web", href: "/#publish" }, { label: "Import & export", href: "/#export" }, { label: "Pricing", href: "/pricing" }, { label: "Open the web app", href: "/app" }]],
  ["Resources", [{ label: "Help center", href: "/help" }, { label: "Keyboard shortcuts", href: "/help#shortcuts" }, { label: "Templates", href: "/app" }, { label: "Source code", href: GH, ext: true }, { label: "What's new", href: GH + "/commits/main", ext: true }, { label: "Report a bug", href: GH + "/issues", ext: true }]],
  ["Company", [{ label: "About", href: "/about" }, { label: "Contribute", href: "/careers" }, { label: "Security", href: "/security" }, { label: "Status", href: "/status" }, { label: "Terms & privacy", href: "/legal" }, { label: "Your privacy rights", href: "/legal#privacy" }]],
  ["For teams", [{ label: "Teamspaces", href: "/#teams" }, { label: "Small businesses", href: "/pricing" }, { label: "Startups", href: "/pricing" }, { label: "Developers", href: GH + "#develop", ext: true }]],
];
const A = ({ l, className }: { l: L; className?: string }) => l.ext ? <a className={className} href={l.href} target="_blank" rel="noreferrer noopener">{l.label}</a> : <Link className={className} href={l.href}>{l.label}</Link>;
export function NtFoot({ h = 397 }: { h?: number }) {
  return <footer className="nt-foot" style={{ minHeight: h }}><div className="in"><div className="l"><span className="nt-lgt"><NtMark s={32} /><b>NotionIsDead</b></span><q>Your notes, your databases,<br />&nbsp;&nbsp;your browser, your data.</q><small>Open source, Apache-2.0</small></div>
    <div className="cols">{FOOT.map(([t, ls]) => <div key={t}><h5>{t}</h5>{ls.map(l => <A key={l.label} l={l} />)}{t === "Product" && <a className="ex" href="https://yourappisdead.com">Explore more IsDead apps →</a>}</div>)}
      <div className="bot"><span>© 2026 NotionIsDead contributors</span><Link href="/legal#privacy">Do Not Sell or Share My Info</Link><Link href="/legal#cookies">Cookie settings</Link><span className="lang">English (US)</span></div></div></div>
    <p className="note">NotionIsDead is an independent open-source project, not affiliated with or endorsed by Notion Labs, Inc. Notion is a trademark of its owner. Source: github.com/tommy-muckstack/notionisdead (Apache-2.0)</p></footer>;
}
const FACTS1 = ["25 block types", "7 database layouts", "Markdown round-trip", "Publish to the web", "Comments & mentions", "Templates", "Page history", "Covers & icons", "Teamspaces"];
const FACTS2 = ["No account needed", "Runs in your browser", "Export as Markdown / HTML / PDF", "Import Markdown, HTML, CSV", "Apache-2.0", "Zero AI, zero tracking", "Keyboard-first", "Dark mode: in progress"];
const CHIPS: [string, string][] = [["Plan a project on a board", "/#databases"], ["Keep meeting notes with action items", "/app"], ["Publish a page for your team", "/#publish"], ["Track tasks on a calendar", "/#databases"], ["Write docs with toggles and callouts", "/#editor"]];
const STATS = ["0 dollars, forever", "Pages stay in your browser", "Everything exports as plain Markdown", "One click to publish a read-only page", "Open source: fork it, change it, ship it"];
const INSIDE: [string, string, string][] = [["Editor", "Slash menu with 25 block types, drag handles, a formatting toolbar, @mentions, toggles, columns, media, equations and a table of contents. Markdown shortcuts work as you type.", "/#editor"], ["Databases", "Typed properties, filters, sorts and views: table, board, list, calendar, gallery, timeline and chart. Every row opens as a page.", "/#databases"], ["Sharing", "Publish any page to a public read-only link, export Markdown / HTML / PDF with sub-pages, or import what you already have.", "/#publish"]];
export function NtHome() {
  return <div className="nt pk">
    <NtNav />
    <section className="nt-hero" id="editor"><h1>Where your notes and<br />databases <span className="pill"><i />live</span> together.</h1>
      <p>A block editor, inline databases and one-click publishing. Free, open source, no account required.</p>
      <div className="cta"><Link href="/login?mode=signup" className="nt-b">Get NotionIsDead free</Link><Link href="/app" className="nt-b2">Try the demo</Link></div>
      <div className="win"><aside><b>Your workspace</b><span className="on">Home</span><u>Private</u><span>Welcome</span><span>Meeting notes</span><span>Reading list</span><u>Teamspaces</u><span>Product</span><span>Design</span><u>Databases</u><span>Roadmap</span><span>Content calendar</span></aside>
        <main><div className="t">Roadmap</div><div className="kb">{["Not started", "In progress", "In review", "Done"].map(c => <div key={c}><b>{c}</b>{[1, 2, 3, 4, 5, 6].map(i => <i key={i} />)}</div>)}</div></main></div>
      <div className="logos"><div>{FACTS1.map(l => <b key={l}>{l}</b>)}</div><div>{FACTS2.map(l => <b key={l}>{l}</b>)}</div></div>
      <p className="amb">Everything above ships today. Nothing on this page is a mock-up.</p></section>
    <section className="nt-ai" id="databases"><h2>Databases where your notes are.</h2>
      <div className="g2"><div className="cd"><small>Capture</small><h3>Every page is blocks; every table is a database.</h3><Link className="go" href="/app" aria-label="Open the app">→</Link><div className="in"><b>Meeting notes</b>{[1, 2, 3, 4, 5, 6, 7].map(i => <i key={i} />)}</div></div>
        <div className="cd"><small>Organize</small><h3>Seven layouts, filters and sorts, all on the same rows.</h3><Link className="go" href="/app" aria-label="Open the app">→</Link><div className="in"><b>Content calendar</b><em>Group by status, filter by owner, sort by due date.</em></div></div></div>
      <div className="cd wide" id="publish"><small>Share</small><h3>Publish a read-only page in one click, unpublish any time.</h3><Link className="go" href="/app" aria-label="Open the app">→</Link><div className="in a"><b>Launch plan · published</b></div><div className="in b"><b>yourappisdead.com/notionisdead/p/…</b></div></div>
      <p className="see" id="export">Import Markdown, HTML or CSV. Export Markdown & CSV, HTML or PDF, sub-pages included.</p>
      <div className="chips">{CHIPS.map(([c, href], i) => <Link key={c} href={href}><i className={"ic" + i} /><b>{c} →</b></Link>)}</div></section>
    <section className="nt-trust" id="teams"><h2>What&apos;s inside.</h2>
      <div className="g3">{INSIDE.map(([t, p, href], i) => <div key={t} className={"q " + ["r", "b", "y"][i]}><em>{t}</em><p>{p}</p><Link href={href}>See it →</Link></div>)}</div>
      <div className="stats">{STATS.map(s => <span key={s}>● {s}</span>)}</div></section>
    <section className="nt-end"><h2>Start writing today.</h2><div className="cta"><Link href="/login?mode=signup" className="nt-b">Get NotionIsDead free</Link><Link href="/app" className="nt-b2">Try the demo</Link></div></section>
    <NtFoot />
  </div>;
}
/** Shared frame for the small marketing pages (help, security, legal, about, contribute, status). */
export function NtPage({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return <div className="nt pk"><NtNav /><main className="nt-page"><h1>{title}</h1>{lede && <p className="lede">{lede}</p>}{children}</main><NtFoot h={320} /></div>;
}
