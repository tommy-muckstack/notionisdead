import "@/vendor/isdead-design/css/notion.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { site } from "@/site.config";
import { Analytics } from "@/lib/analytics/posthog";
export const metadata = { title: `${site.name}: free, open-source ${site.replaces} alternative`, description: site.hero.subtitle };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="notion"><body className="ids-root"><Analytics />{children}</body></html>;
}
