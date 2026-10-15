import { NtPage } from "@/components/NtHome";
export const metadata = { title: "About — NotionIsDead" };
export default function About() {
  return <NtPage title="About" lede="One of the IsDead apps: open-source clones of the tools people pay for, built to be good enough to switch.">
    <p>NotionIsDead recreates the parts of Notion most people actually use: a block editor, inline databases with views, comments, templates and one-click publishing. It runs entirely in your browser and exports everything as plain Markdown, so there is no lock-in in either direction.</p>
    <p>It is part of <a href="https://yourappisdead.com">yourappisdead.com</a>, an open-source marketplace of clones. Every app, and the hub itself, is Apache-2.0 and accepts contributions.</p>
    <h2>Principles</h2><ul><li><b>Real or removed.</b> Every control does something; features we can&apos;t ship say so instead of pretending.</li><li><b>Plain data.</b> Markdown in, Markdown out.</li><li><b>No AI, no tracking.</b> If a feature needs a hosted model or a data broker, it is out of scope.</li></ul>
    <h2>Parity with Notion</h2><p>A hands-on QA pass compares the clone with the real product; the findings and their status live in <a href="https://github.com/tommy-muckstack/notionisdead/blob/main/docs/PARITY_REPORT.md" target="_blank" rel="noreferrer">docs/PARITY_REPORT.md ↗</a>.</p>
  </NtPage>;
}
