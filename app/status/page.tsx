import { NtPage } from "@/components/NtHome";
import { StatusLive } from "@/components/StatusLive";
export const metadata = { title: "Status — NotionIsDead" };
export const dynamic = "force-dynamic";
export default function Status() {
  return <NtPage title="Status" lede="Live health of this deployment, checked when you load the page.">
    <StatusLive />
    <h2>What can go wrong</h2><ul><li><b>App:</b> static pages plus your browser; if this page loads, the app works.</li><li><b>Sign-in:</b> needs the shared Firebase project; guests keep working without it.</li><li><b>Publishing:</b> needs the document store; existing public pages keep serving while it is down.</li></ul>
    <p>Incidents and planned changes are tracked as <a href="https://github.com/tommy-muckstack/notionisdead/issues" target="_blank" rel="noreferrer">GitHub issues ↗</a>.</p>
  </NtPage>;
}
