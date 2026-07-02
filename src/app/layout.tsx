import { type Metadata, type Viewport } from "next";
import { ThemeProvider } from "next-themes";

import { ToastViewport } from "~/components/ui/toast";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "FreelanceOS", template: "%s · FreelanceOS" },
  description:
    "Self-hosted business OS for a solo freelancer: clients, Trello-style boards, projects, contracts and double-entry accounting.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TRPCReactProvider>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            <ToastViewport />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
