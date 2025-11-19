"use client";

export default function CCTVPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Security Monitoring</h1>
        <p className="text-muted-foreground">
          CCTV integration is not part of this application build. Monitoring remains on the dedicated security platform.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_20px_80px_-40px_rgba(129,108,248,0.55)]">
        <p className="text-sm text-foreground">
          Please contact the on-site security command post for camera footage, alert history, or plate recognition logs.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Once CCTV services are available via API, this page will expose the live feeds and playback shortcuts.
        </p>
      </div>
    </div>
  );
}
