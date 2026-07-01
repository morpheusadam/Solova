import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass-modal w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <span
            aria-hidden
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-ink-onbrand"
          >
            F
          </span>
          <h1 className="text-2xl font-semibold text-ink">FreelanceOS</h1>
          <p className="mt-1 text-md text-ink-secondary">
            Sign in to your workspace
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
