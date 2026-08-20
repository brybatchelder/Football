import type { Metadata } from "next";
import "./globals.css";
import { currentViewer } from "@/auth/permissions";
import { AppShell } from "@/components/app-shell";
import { TeamDisplayProvider } from "@/components/team-display";

export const metadata: Metadata = {
  title: {
    default: "Football · Front Office Football League",
    template: "%s · Football",
  },
  description:
    "Private contract dynasty league management for the Front Office Football League.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await currentViewer();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TeamDisplayProvider>
          <AppShell viewer={viewer}>{children}</AppShell>
        </TeamDisplayProvider>
      </body>
    </html>
  );
}
