"use client";

import { History, ShieldCheck } from "lucide-react";
import { QrScanner } from "@/components/ui/qr-scanner";
import { InfoCard } from "@/components/ui/card";
import { useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

export default function GatePage() {
  const { sessions } = useStatusContext();

  const orderedSessions = [...sessions].sort((a, b) => {
    const timeA = a.gate.entry ? new Date(a.gate.entry).getTime() : 0;
    const timeB = b.gate.entry ? new Date(b.gate.entry).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">Terminal Access</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Gate Entry & Exit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate QR credentials, read driver identity from dummy payloads, and keep the gate queue synchronized across entry and exit points.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <QrScanner stage="gate-entry" title="Gate Entry Scanner" description="Validate QR payload before allowing the truck to enter the terminal." />
        <QrScanner stage="gate-exit" title="Gate Exit Scanner" description="Scan the same QR before dispatching the truck to ensure the cycle is complete." />
      </div>

      <InfoCard
        title="Live Gate Timeline"
        description="Latest telemetry for every truck registered on today’s schedule"
        icon={History}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">Driver</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Gate In</th>
                <th className="pb-3 pr-4 font-medium">Gate Out</th>
                <th className="pb-3 pr-4 font-medium">Fuel Slot</th>
              </tr>
            </thead>
            <tbody>
              {orderedSessions.map((session) => (
                <tr key={session.orderId} className="border-t border-border/60 text-sm">
                  <td className="py-3 pr-4 font-semibold text-foreground">{session.orderId}</td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-foreground">{session.driverName}</div>
                    <div className="text-xs text-muted-foreground">{session.licensePlate}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${StatusManager.getStatusBadgeClass(session.status)}`}
                    >
                      {StatusManager.getStatusConfig(session.status).label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatTime(session.gate.entry)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatTime(session.gate.exit)}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      {session.fuel.slot}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    </div>
  );
}
