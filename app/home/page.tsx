import Link from "next/link";

export const metadata = {
  title: "Home | Voltex",
  description: "Authenticated landing space",
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="w-full max-w-3xl space-y-8 rounded-3xl border border-border/60 bg-card/80 p-12 text-center shadow-[0_30px_90px_-50px_rgba(129,108,248,0.75)]">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Welcome
        </span>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          You&apos;re signed in
        </h1>
        <p className="text-base text-muted-foreground md:text-lg">
          This simple home page confirms that the authentication flow has led you to the secure area of the platform. More personalized dashboards and collaboration tools will appear here soon.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-primary/60 px-6 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
            href="/"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
