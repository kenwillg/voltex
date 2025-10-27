import Link from "next/link";

import { LoginCarousel } from "@/components/login-carousel";

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

          <form className="flex flex-col gap-6" action="/home">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="email"
              >
                Work email
              </label>
              <input
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                id="email"
                name="email"
                placeholder="you@company.com"
                required
                type="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  className="font-medium text-primary transition hover:text-primary/80"
                  href="#"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                type="submit"
              >
                Sign in
              </button>
              <p className="text-sm text-muted-foreground">
                By continuing you agree to our internal policies and confirm you are accessing company information securely.
              </p>
            </div>
          </form>
        </section>

        <aside className="hidden min-h-[28rem] bg-card/80 p-6 lg:block lg:p-8">
          <LoginCarousel />
        </aside>
      </div>
    </main>
  );
}
