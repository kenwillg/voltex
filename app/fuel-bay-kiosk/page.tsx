"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, Fuel, HandHelping } from "lucide-react";
import { useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

export default function FuelBayKioskPage() {
  const { sessions, getSession, verifyFuelPin, startFueling, finishFueling } = useStatusContext();

  const [selectedOrderId, setSelectedOrderId] = useState(sessions[0]?.orderId ?? "");
  const [selectedSession, setSelectedSession] = useState(() => sessions[0]);
  const [orderIdInput, setOrderIdInput] = useState(sessions[0]?.orderId ?? "");
  const [pinInput, setPinInput] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    } else {
      setPinMessage("Order tidak ditemukan, silakan periksa kembali nomor perintah.");
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

  const startCamera = async () => {
    setIsStartingCamera(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for metadata to load
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              setCameraOn(true);
              setCameraError(null);
            }
          } catch (playErr) {
            console.error("Play error:", playErr);
            setCameraError("Gagal memutar video kamera.");
            setCameraOn(false);
          }
        };
      } else {
        setCameraError("Video element tidak ditemukan.");
        setCameraOn(false);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Tidak dapat mengakses kamera. Izinkan akses lalu muat ulang.");
      setCameraOn(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row">
        <section className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.5em] text-neutral-500">Fuel Bay</p>
          <h1 className="text-5xl font-semibold tracking-[0.3em] text-white">SELAMAT DATANG</h1>
          <p className="text-base text-neutral-400">
            Masukkan nomor order dan PIN konfirmasi atau tempelkan QR pada scanner untuk membuka akses pengisian.
            <br />
            Atau arahkan QR kode yang dikirimkan ke kamera.
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
            <input
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-lg font-semibold tracking-[0.4em] text-white"
              value={orderIdInput}
              onChange={(event) => setOrderIdInput(event.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">PIN Konfirmasi</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-center text-2xl font-semibold tracking-[0.6em] text-white"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value.replace(/\\D/g, ""))}
            />
            <button
              type="button"
              onClick={handleVerifyPin}
              className="w-full rounded-3xl bg-primary px-4 py-4 text-sm font-semibold text-black transition hover:bg-primary/90"
            >
              Verifikasi
            </button>
          </div>

          {pinMessage && (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
              {pinMessage}
            </div>
          )}

          <div className="flex items-center gap-4 py-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Atau</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-primary" />
                <p className="text-base font-semibold text-white">Webcam QR Scanner</p>
              </div>
              {!cameraOn ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isStartingCamera}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-black transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isStartingCamera ? "Memulai..." : "Aktifkan Kamera"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  Matikan Kamera
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Tekan tombol untuk mengaktifkan kamera, lalu arahkan QR kode ke kamera untuk dipindai.
            </p>
            {cameraError && (
              <p className="mt-2 text-xs text-amber-400">
                {cameraError} (pastikan browser sudah mengizinkan akses kamera)
              </p>
            )}
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="relative h-64 w-full">
                <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover ${!cameraOn ? "hidden" : ""}`}
                  playsInline
                  muted
                  autoPlay
                />
                {!cameraOn && (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    {isStartingCamera ? "Memulai kamera..." : "Kamera belum aktif"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentSession && currentSession.status === "LOADING" && (
            <div className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">
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
        </section>
      </div>
    </div>
  );
}
