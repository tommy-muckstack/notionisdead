import Link from "next/link";
import "./pk.css";
import "./nthome.css";

export const NtMark = ({ s = 24 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="#fff" stroke="#111" strokeWidth="1.8" /><path d="M8 17V7.5l8 9V7" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export function NtNav() {
  return <header className="nt-nav"><Link href="/" className="nt-lg"><NtMark s={28} /></Link>
    <nav><a>Product <i>⌄</i></a><a>Resources <i>⌄</i></a><Link href="/pricing">Pricing</Link><a>Request a demo</a></nav>
    <div className="r"><Link href="/login" className="nt-t">Log in</Link><Link href="/login" className="nt-b">Get NotionIsDead free</Link></div></header>;
}
const FOOT = [["Product", ["Features", "What's New", "NotionIsDead AI", "Pricing", "Request a demo", "Download"]], ["Resources", ["Customer stories", "Connections", "Marketplace", "Help Center", "Academy", "Community"]], ["Company", ["About us", "Careers", "Security", "Status", "Terms & privacy", "Your privacy rights"]], ["For teams", ["Enterprise", "Small businesses", "Startups", "Developers"]]] as const;
export function NtFoot({ h = 397 }: { h?: number }) {
  return <footer className="nt-foot" style={{ height: h }}><div className="in"><div className="l"><span className="nt-lgt"><NtMark s={32} /><b>NotionIsDead</b></span><q>We shape our tools,<br />&nbsp;&nbsp;and thereafter our tools shape us.</q><small>Marshall McLuhan</small></div>
    <div className="cols">{FOOT.map(([t, ls]) => <div key={t}><h5>{t}</h5>{ls.map(l => <a key={l}>{l}</a>)}{t === "Product" && <a className="ex">Explore more →</a>}</div>)}
      <div className="bot"><span>© 2026 NotionIsDead</span><span>Do Not Sell or Share My Info</span><span>Cookie settings</span><span className="lang">English (US) ⌄</span></div></div></div>
    <p className="note">NotionIsDead is an independent open-source project, not affiliated with or endorsed by Notion Labs, Inc. Notion is a trademark of its owner. Source: github.com/tommy-muckstack/notionisdead (Apache-2.0)</p></footer>;
}
const LOGOS1 = ["OpenAI", "A24", "Figma", "FedEx", "ramp", "Cursor", "Substack", "NVIDIA", "TOYOTA"];
const LOGOS2 = ["Clay", "Lamborghini", "David Zwirner", "Vercel", "FAIRE", "Lovable", "goop", "Discord"];
const CHIPS = ["Triage product feedback", "Resolve support tickets in Slack", "Respond to security alerts faster", "Automate weekly reporting", "Create your own developer tools"];
const STATS = ["#1 knowledge base for 3 consecutive years", "100M users in over 50 countries", "Over 50% of YC companies", "1.4M+ community members", "62% of Fortune 100 use Notion"];
export function NtHome() {
  return <div className="nt pk">
    <NtNav />
    <section className="nt-hero"><h1>Where teams and<br />agents <span className="pill"><i />Ship</span> together.</h1>
      <p>Capture context, find answers, and automate tasks with AI built for your team.</p>
      <div className="cta"><Link href="/login" className="nt-b">Get NotionIsDead free</Link><Link href="/login" className="nt-b2">Request a demo</Link></div>
      <div className="win"><aside><b>Ramp</b><span className="on">Home</span><u>Upcoming events</u><span>Design Weekly</span><span>Eng Kickoff</span><span>Product Updates</span><u>Agents</u><span>Task routing agent</span><span>Q&amp;A agent</span><span>Reporting agent</span><u>Teamspaces</u><span>Company HQ</span><span>My OS</span></aside>
        <main><div className="t">Ramp HQ</div><div className="kb">{["To-do", "In progress", "In review", "Complete"].map(c => <div key={c}><b>{c}</b>{[1, 2, 3, 4, 5, 6].map(i => <i key={i} />)}</div>)}</div></main></div>
      <div className="logos"><div>{LOGOS1.map(l => <b key={l}>{l}</b>)}</div><div>{LOGOS2.map(l => <b key={l}>{l}</b>)}</div></div>
      <p className="amb">The most ambitious companies run on NotionIsDead.</p></section>
    <section className="nt-ai"><h2>AI where your team works.</h2>
      <div className="g2"><div className="cd"><small>Capture knowledge</small><h3>Bring everything into one system of record.</h3><span className="go">→</span><div className="in"><b>Meetings</b>{[1, 2, 3, 4, 5, 6, 7].map(i => <i key={i} />)}</div></div>
        <div className="cd"><small>Find answers</small><h3>Get answers, instantly—with citations.</h3><span className="go">→</span><div className="in"><b>H2 Deal Flow Dashboard</b><em>What are our biggest opportunities in H2?</em></div></div></div>
      <div className="cd wide"><small>Automate busywork</small><h3>Keep work moving 24/7 with agents.</h3><span className="go">→</span><div className="in a"><b>Engineering Tasks</b></div><div className="in b"><b>Coding Agent</b></div></div>
      <p className="see">See what NotionIsDead can do</p>
      <div className="chips">{CHIPS.map((c, i) => <div key={c}><i className={"ic" + i} /><b>{c} →</b></div>)}</div></section>
    <section className="nt-trust"><h2>Trusted by teams that ship.</h2>
      <div className="g3"><div className="q r"><em>cursor</em><p>“Using the most AI-native tools like NotionIsDead is an important competitive advantage for us to stay small while doing a lot.”</p><small>Michael Truell, Co-founder &amp; CEO</small></div><div className="q b"><em>FAIRE</em><p>“The thoughtful design speeds up collaboration and decisions so we can deliver impact to our customers faster.”</p><small>Renee Solorzano, Sr. Director of Product Design</small></div><div className="q y"><em>ramp</em><p>“Custom Agents help our team go beyond doing work with AI to building AI tools that do the work for them.”</p><small>Ben Levick, Head of Operations &amp; Internal AI</small></div></div>
      <div className="stats">{STATS.map(s => <span key={s}>● {s}</span>)}</div></section>
    <section className="nt-end"><h2>Get started today.</h2><div className="cta"><Link href="/login" className="nt-b">Get NotionIsDead free</Link><Link href="/login" className="nt-b2">Request a demo</Link></div></section>
    <NtFoot />
  </div>;
}
