import { NtPage } from "@/components/NtHome";
export const metadata = { title: "Security & data — NotionIsDead" };
export default function Security() {
  return <NtPage title="Security & data" lede="What is stored, where, and who can read it.">
    <h2>Your pages</h2><p>Pages, databases and comments are saved in your browser&apos;s localStorage, namespaced per account or guest id. They never leave the device unless you publish or export them. Clearing site data deletes them; export first.</p>
    <h2>Sign-in</h2><p>Authentication is a shared Firebase project used by every IsDead app. The browser trades a Firebase ID token for an httpOnly session cookie (14 days). Guest sessions are a signed random id in a cookie; no personal data is attached to them.</p>
    <h2>Published pages</h2><p>Publishing uploads a read-only copy of that page (title, icon, blocks, cover, font settings) to the document store so <code>/p/&lt;id&gt;</code> can serve it. Only the session that published it can update or remove it. Pages are <em>noindex</em> unless you turn on search-engine indexing. Unpublishing deletes the copy.</p>
    <h2>Uploads</h2><p>Images, files and covers you upload are stored inside your browser as data URLs (1.5 MB per file). Published pages carry them to the server as part of the page.</p>
    <h2>Analytics and AI</h2><p>No analytics, no tracking pixels, no AI features. The only third-party requests are Firebase Auth (when signing in) and the Google Fonts stylesheet.</p>
    <h2>Reporting a vulnerability</h2><p>Open a private security advisory on <a href="https://github.com/tommy-muckstack/notionisdead/security/advisories/new" target="_blank" rel="noreferrer">GitHub ↗</a>. Please do not file public issues for security problems.</p>
  </NtPage>;
}
