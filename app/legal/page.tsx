import { NtPage } from "@/components/NtHome";
export const metadata = { title: "Terms & privacy — NotionIsDead" };
export default function Legal() {
  return <NtPage title="Terms & privacy" lede="Plain language. Last updated October 15, 2026.">
    <h2 id="terms">Terms</h2><p>NotionIsDead is free software licensed under the Apache License 2.0. It is provided as is, without warranty of any kind. You are responsible for backing up anything you keep in it (Settings → General → Export all). We may change or shut down the hosted instance at any time; the source code stays available so you can run your own.</p>
    <p>Do not publish pages that are illegal, that infringe someone else&apos;s rights, or that you have no right to share. We remove such pages when we become aware of them.</p>
    <h2 id="privacy">Privacy</h2><p>We collect as little as possible. Your pages stay in your browser. If you sign in we store your email address and name with the authentication provider (Firebase) and nothing else. If you publish a page, that page&apos;s content is stored on our servers until you unpublish it. We keep no analytics and sell or share nothing.</p>
    <p id="rights">You can delete everything yourself: unpublish your pages, Settings → General → Delete workspace content, then sign out. To delete your sign-in account, email the address on the GitHub profile of the repository owner.</p>
    <h2 id="cookies">Cookies</h2><p>Two cookies, both functional: a session cookie when you sign in and a guest cookie otherwise. There are no advertising or analytics cookies, so there is nothing to opt in or out of.</p>
    <h2>Trademarks</h2><p>NotionIsDead is an independent open-source project, not affiliated with, endorsed by or sponsored by Notion Labs, Inc. Notion is a trademark of its owner.</p>
  </NtPage>;
}
