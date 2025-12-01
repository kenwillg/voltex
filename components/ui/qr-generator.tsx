"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import { InfoCard } from "@/components/ui/card";
import { useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";
import { QrStage } from "@/lib/qr-service";

interface QrGeneratorProps {
  stage?: QrStage;
  title?: string;
  description?: string;
}

export function QrGenerator({
  stage = "UNIVERSAL",
  title = "SPA QR Credential",
  description = "Generate or resend gate credentials per SPA (SPA + driver). The payload can also be copied for manual simulations.",
}: QrGeneratorProps) {
  const { sessions, generateDriverQr, emailDriverQr } = useStatusContext();
  const [selectedOrder, setSelectedOrder] = useState<string>(sessions[0]?.orderId ?? "");
  const selectedSession = useMemo(
    () => sessions.find((session) => session.orderId === selectedOrder) ?? sessions[0],
    [sessions, selectedOrder],
  );

  const [qrPreview, setQrPreview] = useState<string | undefined>(selectedSession?.qr.dataUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | "generate" | "send">(null);

  useEffect(() => {
    if (selectedSession?.qr.dataUrl) {
      setQrPreview(selectedSession.qr.dataUrl);
    }
    setMessage(null);
  }, [selectedSession]);

  if (!selectedSession) {
    return null;
  }

  const payloadSample = JSON.stringify(
    {
      order_id: selectedSession.orderId,
      driver_id: selectedSession.driverId,
    },
    null,
    2,
  );

  const handleGenerate = async () => {
    try {
      setLoading("generate");
      const qr = await generateDriverQr(selectedSession.orderId, stage);
      setQrPreview(qr);
      setMessage("QR updated successfully");
    } catch {
      setMessage("Unable to generate QR, please retry.");
    } finally {
      setLoading(null);
    }
  };

  const handleSend = async () => {
    try {
      setLoading("send");
      const result = await emailDriverQr(selectedSession.orderId, stage);
      setMessage(result.message);
    } catch {
      setMessage("Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  return (
    <InfoCard title={title} description={description} icon={QrCode}>
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Select Order
            </label>
            <select
              className="w-full rounded-2xl border border-border/70 bg-background/60 px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              value={selectedSession.orderId}
              onChange={(event) => setSelectedOrder(event.target.value)}
            >
              {sessions.map((session) => (
                <option key={session.orderId} value={session.orderId}>
                  {session.orderId} — {session.driverName}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Status</p>
            <p className="mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary">
              {StatusManager.getStatusConfig(selectedSession.status).label}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Gate In: {selectedSession.gate.entry ? new Date(selectedSession.gate.entry).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"} · Gate Out:{" "}
              {selectedSession.gate.exit ? new Date(selectedSession.gate.exit).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Driver identity</p>
              <div className="mt-2 space-y-1 rounded-2xl border border-border/60 p-4 text-sm">
                <p className="font-semibold text-foreground">{selectedSession.driverName}</p>
                <p className="text-muted-foreground">{selectedSession.licensePlate} • {selectedSession.product}</p>
                <p className="text-xs text-muted-foreground">{selectedSession.driverEmail}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Dummy payload</p>
              <textarea
                className="mt-2 h-36 w-full rounded-2xl border border-border/70 bg-background/60 p-3 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                value={payloadSample}
                readOnly
              />
              <p className="pt-2 text-xs text-muted-foreground">
                Use this payload inside the Gate QR Scanner to simulate entry/exit validations.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/40 p-6">
            {qrPreview ? (
              <>
                <Image
                  src={qrPreview}
                  alt={`QR credential for ${selectedSession.orderId}`}
                  width={192}
                  height={192}
                  className="h-48 w-48 rounded-xl border border-border/60 bg-white p-4 shadow-inner"
                  priority
                  unoptimized
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Updated {selectedSession.qr.issuedAt ? new Date(selectedSession.qr.issuedAt).toLocaleString("id-ID") : "just now"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Generate a QR to preview it here.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading !== null}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "generate" ? "Generating..." : "Generate QR"}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading !== null}
            className="flex-1 rounded-2xl border border-border/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "send" ? "Sending..." : "Send to Driver"}
          </button>
        </div>

        {message && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            {message}
          </div>
        )}
      </div>
    </InfoCard>
  );
}
