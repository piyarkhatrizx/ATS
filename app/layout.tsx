import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { Toaster } from "@/components/ui/toast";
import { GlowLayer } from "@/components/korosha/glow-layer";

export const metadata: Metadata = {
  title: "Korosha",
  description: "Lead response system. Speed to first contact.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cookie, not localStorage: it is readable on the server, so the collapsed
  // width ships in the first HTML response instead of snapping after hydration.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full">
        <GlowLayer />
        <AppSidebar initialCollapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
