import Link from "next/link";

import { LoginCarousel } from "@/components/login-carousel";
import { LoginForm } from "@/components/ui/login-form";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_40px_120px_-60px_rgba(129,108,248,0.75)] lg:grid-cols-[1.05fr_1fr]">
        <section className="flex flex-col justify-between gap-10 p-10 lg:p-14">
          <div className="space-y-10">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                Logo
              </div>
              <div className="text-lg font-semibold text-foreground">Company Name</div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Welcome back
              </h1>
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                Sign in with your corporate credentials to access tailored insights, collaborate with your team, and stay ahead of upcoming initiatives.
              </p>
            </div>
          </div>

          <LoginForm />
        </section>

        <aside className="hidden min-h-[28rem] bg-card/80 p-6 lg:block lg:p-8">
          <LoginCarousel />
        </aside>
      </div>
    </main>
  );
}
