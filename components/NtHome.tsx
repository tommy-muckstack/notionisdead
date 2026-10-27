import Link from "next/link";
import "./pk.css";
import "./nthome.css";

export const NtMark = ({ s = 24 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="#fff" stroke="#111" strokeWidth="1.8" /><path d="M8 17V7.5l8 9V7" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export function NtNav() {
  return <header className="nt-nav"><Link href="/" className="nt-lg"><NtMark s={28} /></Link>
    <nav><a>Product <i>⌄</i></a><a>Resources <i>⌄</i></a><Link href="/pricing">Pricing</Link><a href="https://github.com/tommy-muckstack/notionisdead">GitHub</a></nav>
    <div className="r"><Link href="/login" className="nt-t">Log in</Link><Link href="/login" className="nt-b">Get NotionIsDead free</Link></div></header>;
}
const FOOT = [["Product", ["Features", "What's New", "Markdown import", "Pricing", "Source code", "Download"]], ["Resources", ["Open source", "Connections", "Marketplace", "Help Center", "Academy", "Community"]], ["Company", ["About us", "Careers", "Security", "Status", "Terms & privacy", "Your privacy rights"]], ["For teams", ["Enterprise", "Small businesses", "Startups", "Developers"]]] as const;
export function NtFoot({ h = 397 }: { h?: number }) {
  return <footer className="nt-foot" style={{ height: h }}><div className="in"><div className="l"><span className="nt-lgt"><NtMark s={32} /><b>NotionIsDead</b></span><q>We shape our tools,<br />&nbsp;&nbsp;and thereafter our tools shape us.</q><small>Marshall McLuhan</small></div>
    <div className="cols">{FOOT.map(([t, ls]) => <div key={t}><h5>{t}</h5>{ls.map(l => <a key={l}>{l}</a>)}{t === "Product" && <a className="ex">Explore more →</a>}</div>)}
      <div className="bot"><span>© 2026 NotionIsDead</span><span>Do Not Sell or Share My Info</span><span>Cookie settings</span><span className="lang">English (US) ⌄</span></div></div></div>
    <p className="note">NotionIsDead is an independent open-source project, not affiliated with or endorsed by Notion Labs, Inc. Notion is a trademark of its owner. Source: github.com/tommy-muckstack/notionisdead (Apache-2.0)</p></footer>;
}
const LOGOS1 = ["Free", "Open source", "Apache-2.0", "No plan gates", "No card"];
const LOGOS2 = ["Nested pages", "Backlinks", "⌘K search", "Markdown import & export"];
const CHIPS = ["Write meeting notes", "Plan a project with to-dos", "Link pages with backlinks", "Import Markdown files", "Search everything with ⌘K"];
const STATS = ["Free for everyone", "No plans or seats", "Apache-2.0 on GitHub", "Markdown import and export", "No card needed"];
export function NtHome() {
  return <div className="nt pk">
    <NtNav />
    <section className="nt-hero"><h1>Where teams write<br />and <span className="pill"><i />Ship</span> together.</h1>
      <p>Write, plan and organize in nested pages and blocks. Free and open source.</p>
      <div className="cta"><Link href="/login" className="nt-b">Get NotionIsDead free</Link><Link href="/login" className="nt-b2">Log in</Link></div>
      <div className="win"><aside><b>Acme</b><span className="on">Home</span><u>Upcoming events</u><span>Design Weekly</span><span>Eng Kickoff</span><span>Product Updates</span><u>Agents</u><span>Task routing agent</span><span>Q&amp;A agent</span><span>Reporting agent</span><u>Teamspaces</u><span>Company HQ</span><span>My OS</span></aside>
        <main><div className="t">Team HQ</div><div className="kb">{["To-do", "In progress", "In review", "Complete"].map(c => <div key={c}><b>{c}</b>{[1, 2, 3, 4, 5, 6].map(i => <i key={i} />)}</div>)}</div></main></div>
      <div className="logos"><div>{LOGOS1.map(l => <b key={l}>{l}</b>)}</div><div>{LOGOS2.map(l => <b key={l}>{l}</b>)}</div></div>
      <p className="amb">Free and open source, with every feature included.</p></section>
    <section className="nt-ai"><h2>Everything in one place.</h2>
      <div className="g2"><div className="cd"><small>Capture knowledge</small><h3>Bring everything into one system of record.</h3><span className="go">→</span><div className="in"><b>Meetings</b>{[1, 2, 3, 4, 5, 6, 7].map(i => <i key={i} />)}</div></div>
        <div className="cd"><small>Find anything</small><h3>Search every page, instantly, with ⌘K.</h3><span className="go">→</span><div className="in"><b>H2 Deal Flow Dashboard</b><em>Search: H2 opportunities</em></div></div></div>
      <div className="cd wide"><small>Connect your thinking</small><h3>Link pages with [[links]] and see every backlink.</h3><span className="go">→</span><div className="in a"><b>Engineering Tasks</b></div><div className="in b"><b>Backlinks</b></div></div>
      <p className="see">See what NotionIsDead can do</p>
      <div className="chips">{CHIPS.map((c, i) => <div key={c}><i className={"ic" + i} /><b>{c} →</b></div>)}</div></section>
    <section className="nt-trust"><h2>Built in the open.</h2>
      <div className="g3"><div className="q r"><em>free</em><p>“Every feature is free. No seats, no plans and no trial that runs out.”</p><small>The NotionIsDead promise</small></div><div className="q b"><em>open</em><p>“The code is Apache-2.0 on GitHub. Read it, fork it or suggest a fix.”</p><small>Why it&apos;s open source</small></div><div className="q y"><em>yours</em><p>“Export any page as Markdown, or import your own .md files.”</p><small>Your notes, your files</small></div></div>
      <div className="stats">{STATS.map(s => <span key={s}>● {s}</span>)}</div></section>
    <section className="nt-end"><h2>Get started today.</h2><div className="cta"><Link href="/login" className="nt-b">Get NotionIsDead free</Link><Link href="/login" className="nt-b2">Log in</Link></div></section>
    <NtFoot />
  </div>;
}
