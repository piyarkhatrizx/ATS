import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { Toaster } from "@/components/ui/toast";

/**
 * One family, three weights — exactly what the type scale uses.
 * Drawn for technical interfaces: real tabular figures and letterforms that
 * stay distinct at 13px, which is the size the lead queue runs at.
 */
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Korosha",
  description: "Lead response system. Speed to first contact.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cookie, not localStorage: it is readable on the server, so the collapsed
  // width ships in the first HTML response instead of snapping after hydration.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <html lang="en" className={`h-full antialiased ${plex.variable}`}>
      <body className="flex min-h-full">
        <a href="#main" className="k-skip-link">Skip to content</a>
        <AppSidebar initialCollapsed={collapsed} />
        <div id="main" className="flex min-w-0 flex-1 flex-col">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
