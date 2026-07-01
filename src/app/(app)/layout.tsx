import { redirect } from "next/navigation";

import { Sidebar } from "~/components/layout/sidebar";
import { Topbar } from "~/components/layout/topbar";
import { MobileNav } from "~/components/layout/mobile-nav";
import { auth } from "~/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <Sidebar />
      <Topbar
        userName={session.user.name ?? "Freelancer"}
        userEmail={session.user.email ?? ""}
      />
      <main className="min-h-[calc(100dvh-3.5rem)] p-4 pb-24 md:ms-60 md:p-6 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
