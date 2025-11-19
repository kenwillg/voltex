"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Fuel, HandHelping, ScanQrCode } from "lucide-react";
import { ScanStage, useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

const stage: ScanStage = "fuel-bay";

export default function FuelBayKioskPage() {
  const {
    sessions,
    getSession,
    scanQrPayload,
    verifyFuelPin,
    startFueling,
    finishFueling,
  } = useStatusContext();

  const [selectedOrderId, setSelectedOrderId] = useState(sessions[0]?.orderId ?? "");
  const [selectedSession, setSelectedSession] = useState(() => sessions[0]);
  const [orderIdInput, setOrderIdInput] = useState(sessions[0]?.orderId ?? "");
  const [pinInput, setPinInput] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState(0);

  const currentSession = useMemo(() => {
    if (!selectedSession) {
      const fallback = sessions.find((session) => session.orderId === selectedOrderId);
      return fallback ?? sessions[0];
    }
    return selectedSession;
  }, [selectedSession, sessions, selectedOrderId]);

  useEffect(() => {
    setSelectedOrderId((prev) => prev || (sessions[0]?.orderId ?? ""));
    setOrderIdInput((prev) => prev || (sessions[0]?.orderId ?? ""));
    setSelectedSession((prev) => prev ?? sessions[0]);
  }, [sessions]);

  useEffect(() => {
    if (currentSession?.status === "LOADING") {
      setFillProgress(10);
      const timer = setInterval(() => {
        setFillProgress((prev) => (prev >= 100 ? 15 : prev + 5));
      }, 300);
      return () => clearInterval(timer);
    }
    setFillProgress(0);
  }, [currentSession?.status]);

  const handleLoadOrder = () => {
    if (!orderIdInput.trim()) return;
    const found = getSession(orderIdInput.trim().toUpperCase());
    if (found) {
      setSelectedSession(found);
      setSelectedOrderId(found.orderId);
      setPinMessage(null);
      setScanMessage(null);
    } else {
      setPinMessage("Order tidak ditemukan, silakan periksa kembali nomor perintah.");
    }
  };

  const populateSamplePayload = () => {
    if (!currentSession) return;
    const sample = JSON.stringify(
      {
        order_id: currentSession.orderId,
        driver_id: currentSession.driverId,
      },
      null,
      2,
    );
    setPayload(sample);
  };

  const handleScan = () => {
    if (!payload.trim()) return;
    const scan = scanQrPayload(payload, stage);
    if (scan.order) {
      setSelectedSession(scan.order);
      setSelectedOrderId(scan.order.orderId);
      setOrderIdInput(scan.order.orderId);
      setScanMessage(scan.message);
    } else {
      setScanMessage(scan.message);
    }
  };

  const handleVerifyPin = () => {
    if (!currentSession) return;
    if (!pinInput.trim()) {
      setPinMessage("Masukkan PIN yang dikirim via email.");
      return;
    }
    const result = verifyFuelPin(currentSession.orderId, pinInput.trim());
    setPinMessage(result.message);
    if (result.order) {
      setSelectedSession(result.order);
    }
  };

  const handleStart = () => {
    if (!currentSession) return;
    const updated = startFueling(currentSession.orderId);
    if (updated) {
      setSelectedSession(updated);
      setPinMessage("Proses pengisian dimulai.");
    } else {
      setPinMessage("PIN harus diverifikasi sebelum memulai pengisian.");
    }
  };

  const handleFinish = () => {
    if (!currentSession) return;
    const updated = finishFueling(currentSession.orderId);
    if (updated) {
      setSelectedSession(updated);
      setPinMessage("Pengisian selesai, lanjutkan ke Gate Out.");
    }
  };

  if (!currentSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row">
        <section className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.5em] text-neutral-500">Fuel Bay</p>
          <h1 className="text-5xl font-semibold tracking-[0.3em] text-white">SELAMAT DATANG</h1>
          <p className="text-base text-neutral-400">
            Masukkan nomor order dan PIN konfirmasi atau tempelkan QR pada scanner untuk membuka akses pengisian.
          </p>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Bantuan Cepat</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>1. Verifikasi order dengan memasukkan nomor atau melakukan scan.</p>
              <p>2. Ketik PIN yang dikirim via email driver.</p>
              <p>3. Tekan tombol Start untuk membuka valve, dan Finish setelah tanki penuh.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 text-sm text-neutral-300">
            <div className="flex items-center gap-3 text-white">
              <HandHelping className="h-5 w-5 text-primary" />
              <p className="text-base font-semibold">Pusat Bantuan</p>
            </div>
            <p className="mt-3 text-sm">Butuh operator? Tekan tombol bantuan pada panel fisik atau hubungi ext. 120.</p>
          </div>
        </section>

        <section className="flex-1 space-y-6 rounded-[40px] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-neutral-400">Validasi Order</p>
              <h2 className="text-2xl font-semibold text-white">Fuel Bay Console</h2>
            </div>
            <Fuel className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Masukkan Order ID</label>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-semibold tracking-[0.4em] text-white"
                value={orderIdInput}
                onChange={(event) => setOrderIdInput(event.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={handleLoadOrder}
                className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary"
              >
                Ambil Data
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">PIN Konfirmasi</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-center text-2xl font-semibold tracking-[0.6em] text-white"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value.replace(/\D/g, ""))}
            />
            <button
              type="button"
              onClick={handleVerifyPin}
              className="w-full rounded-3xl bg-primary px-4 py-4 text-sm font-semibold text-black transition hover:bg-primary/90"
            >
              Verifikasi PIN
            </button>
          </div>

          {pinMessage && (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
              {pinMessage}
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-neutral-300">
            <div className="flex items-center gap-3">
              <ScanQrCode className="h-5 w-5 text-primary" />
              <p className="text-base font-semibold text-white">Atau gunakan scanner</p>
            </div>
            <div className="mt-3 flex gap-3">
              <select
                className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                value={selectedOrderId}
                onChange={(event) => {
                  setSelectedOrderId(event.target.value);
                  const found = getSession(event.target.value);
                  setSelectedSession(found);
                  setOrderIdInput(event.target.value);
                }}
              >
                {sessions.map((session) => (
                  <option key={session.orderId} value={session.orderId}>
                    {session.orderId} — {session.driverName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={populateSamplePayload}
                className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary hover:text-primary"
              >
                JSON
              </button>
            </div>
            <textarea
              className="mt-3 h-32 w-full rounded-2xl border border-white/15 bg-black/30 p-3 font-mono text-xs text-white"
              value={payload}
              placeholder="Tempel payload QR di sini"
              onChange={(event) => setPayload(event.target.value)}
            />
            <button
              type="button"
              onClick={handleScan}
              className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary"
            >
              Scan Payload
            </button>
            {scanMessage && <p className="mt-2 text-xs text-neutral-400">{scanMessage}</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Detail Driver</p>
            <div className="mt-3 space-y-2 text-sm text-neutral-300">
              <p className="text-xl font-semibold text-white">{currentSession.driverName}</p>
              <p className="text-xs text-neutral-400">{currentSession.company}</p>
              <p className="text-lg font-semibold tracking-[0.3em] text-white">{currentSession.licensePlate}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                  {currentSession.product} · {currentSession.plannedVolume}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold uppercase tracking-widest ${StatusManager.getStatusBadgeClass(currentSession.status)}`}
                >
                  {StatusManager.getStatusConfig(currentSession.status).label}
                </span>
              </div>
              <div className="grid gap-1 text-xs text-neutral-400">
                <p>Gate In: {formatTime(currentSession.gate.entry)}</p>
                <p>Mulai Mengisi: {formatTime(currentSession.fuel.startedAt)}</p>
                <p>Selesai Mengisi: {formatTime(currentSession.fuel.finishedAt)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleStart}
                className="rounded-2xl bg-emerald-500/90 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500 disabled:opacity-50"
                disabled={!currentSession.fuel.pinVerified}
              >
                Start Filling Tank
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary disabled:opacity-50"
                disabled={currentSession.status !== "LOADING"}
              >
                Finish Filling Tank
              </button>
            </div>
            {!currentSession.fuel.pinVerified && (
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                Verifikasi PIN untuk mengaktifkan tombol Start.
              </div>
            )}
            {currentSession.fuel.pin && (
              <p className="mt-2 text-xs text-neutral-500">
                PIN simulasi: <span className="font-semibold text-white">{currentSession.fuel.pin}</span>
              </p>
            )}
            {currentSession.status === "LOADING" && (
              <div className="mt-4 space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Fuel className="h-4 w-4" />
                  <p>Simulasi: pengisian sedang berlangsung</p>
                </div>
                <div className="h-3 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-300 ease-linear"
                    style={{ width: `${fillProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-emerald-200">
                  <span>Tanki</span>
                  <span>{fillProgress}%</span>
                </div>
                <div className="grid gap-2 text-xs text-emerald-200">
                  <div className="h-2 w-full animate-pulse rounded-full bg-emerald-400/40" />
                  <div className="h-2 w-4/5 animate-pulse rounded-full bg-emerald-400/30" />
                  <div className="h-2 w-3/5 animate-pulse rounded-full bg-emerald-400/20" />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
