"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRightLeft, BadgeCheck, ScanQrCode } from "lucide-react";
import { ScanStage, useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

export default function GateKioskPage() {
  const { sessions, scanQrPayload } = useStatusContext();
  const [payload, setPayload] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(sessions[0]?.orderId ?? "");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scanQrPayload> | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.orderId === selectedOrder) ?? sessions[0],
    [sessions, selectedOrder],
  );

  const resolveGateStage = (session = selectedSession): ScanStage => {
    if (!session?.gate.entry) {
      return "gate-entry";
    }
    return "gate-exit";
  };

  const populateSample = () => {
    if (!selectedSession) return;
    const sample = JSON.stringify(
      {
        order_id: selectedSession.orderId,
        driver_id: selectedSession.driverId,
      },
      null,
      2,
    );
    setPayload(sample);
  };

  const handleScan = () => {
    if (!payload.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      const inferredStage = resolveGateStage();
      const scan = scanQrPayload(payload, inferredStage);
      setResult(scan);
      setIsScanning(false);
    }, 300);
  };

  const displaySession = result?.order;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row">
        <section className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.5em] text-neutral-500">Gate Terminal</p>
          <h1 className="text-5xl font-semibold tracking-[0.3em] text-white">SELAMAT DATANG</h1>
          <p className="text-base text-neutral-400">
            Tunjukkan QR yang kamu diterima melalui email arahkan pada scanner. Satu QR yang sama berlaku untuk
            Gate In, proses pengisian, hingga Gate Out. Sistem otomatis menentukan tahapnya.
          </p>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 text-sm text-neutral-300">
            <div className="flex items-center gap-3 text-white">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <p className="text-base font-semibold">Alur Ringkas</p>
            </div>
            <ol className="mt-4 space-y-3 text-sm">
              <li>1. Kamu menerima QR bersama surat perintah melalui email.</li>
              <li>2. Kamu cukup memindai QR yang sama di semua titik.</li>
              <li>3. Sistem mendeteksi tahap truk (masuk, pengisian, keluar) otomatis.</li>
            </ol>
          </div>
        </section>

        <section className="flex-1 space-y-6 rounded-[40px] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-neutral-400">Simulasi QR</p>
              <h2 className="text-2xl font-semibold text-white">Gate Scanner</h2>
            </div>
            <ScanQrCode className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Pilih Order</label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
                value={selectedSession?.orderId}
                onChange={(event) => setSelectedOrder(event.target.value)}
              >
                {sessions.map((session) => (
                  <option key={session.orderId} value={session.orderId}>
                    {session.orderId} — {session.driverName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={populateSample}
                className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary"
              >
                Gunakan JSON
              </button>
            </div>
          </div>

          <textarea
            className="h-40 w-full rounded-3xl border border-white/15 bg-black/40 p-4 font-mono text-sm text-white"
            placeholder='{"order_id":"SP-240503","driver_id":"DRV-0142"}'
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
          />

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning || !payload.trim()}
            className="w-full rounded-3xl bg-primary px-4 py-4 text-sm font-semibold text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isScanning ? "Mem-validasi..." : "Mulai Scan"}
          </button>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
            {result ? (
              displaySession ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-emerald-400">
                    <BadgeCheck className="h-5 w-5" />
                    <p>{result.message}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                    <div className="flex h-40 items-center justify-center rounded-2xl bg-white/5 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                      Foto Kendaraan
                    </div>
                    <div className="space-y-3 text-sm text-neutral-300">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">Driver</p>
                        <p className="text-lg font-semibold text-white">{displaySession.driverName}</p>
                        <p className="text-xs text-neutral-400">{displaySession.company}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">Nomor Polisi</p>
                        <p className="text-2xl font-semibold tracking-[0.2em] text-white">{displaySession.licensePlate}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                          {displaySession.product} · {displaySession.plannedVolume}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 font-semibold uppercase tracking-widest ${StatusManager.getStatusBadgeClass(displaySession.status)}`}
                        >
                          {StatusManager.getStatusConfig(displaySession.status).label}
                        </span>
                      </div>
                      <div className="grid gap-2 text-xs text-neutral-400">
                        <p>Gate In: {formatTime(displaySession.gate.entry)}</p>
                        <p>Gate Out: {formatTime(displaySession.gate.exit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  <p>{result.message}</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-neutral-500">
                <ScanQrCode className="h-8 w-8 text-neutral-600" />
                <p>Belum ada scan. Tempelkan QR pada scanner untuk membuka gerbang.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
