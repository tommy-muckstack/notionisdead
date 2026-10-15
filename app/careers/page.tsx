import { NtPage } from "@/components/NtHome";
export const metadata = { title: "Contribute — NotionIsDead" };
export default function Contribute() {
  return <NtPage title="Contribute" lede="No jobs, no salaries: an open-source project that takes pull requests.">
    <h2>Good first contributions</h2><ul><li>A dark theme (the colour tokens are in <code>app/app/notion.css</code>).</li><li>Nested (indented) list blocks.</li><li>A sync server so a workspace can be opened on two devices.</li><li>More templates: original content only, nothing copied from Notion&apos;s gallery.</li><li>Accessibility passes on the menus and dialogs.</li></ul>
    <h2>How</h2><ol><li>Fork <a href="https://github.com/tommy-muckstack/notionisdead" target="_blank" rel="noreferrer">the repository ↗</a> and run <code>npm install && npm run dev</code>.</li><li>Keep <code>npm run typecheck</code>, <code>npm test</code> and <code>npm run build</code> green; the <code>scripts/e2e-*.mjs</code> files drive the app with real mouse and keyboard events.</li><li>Open a pull request with before/after screenshots. Recreate assets; never copy Notion&apos;s code, art or copy.</li></ol>
  </NtPage>;
}
