import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Korosha",
  description: "Resume intake and recruiting pipeline",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cookie, not localStorage: it is readable on the server, so the collapsed
  // width ships in the first HTML response instead of snapping after hydration.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full">
        <AppSidebar initialCollapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
