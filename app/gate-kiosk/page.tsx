"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Radio, ScanQrCode, ShieldCheck, XCircle } from "lucide-react";
import io, { Socket } from "socket.io-client";

interface QrStatus {
  valid: boolean;
  qr?: string;
  driverName?: string;
  licensePlate?: string;
  message?: string;
  reason?: string;
  timestamp?: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_OCR_SOCKET_URL ?? "http://localhost:8000";
const USE_LOCAL_WEBCAM = process.env.NEXT_PUBLIC_GATE_KIOSK_LOCAL_CAM === "true"; // default off

const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "-";

export default function GateKioskPage() {
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // connect to OCR stream (same as dashboard gate)
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["polling"],
      path: "/socket.io/",
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[gate-kiosk] Connected to OCR server");
      setSocketStatus("connected");
      // Start streaming and set to QR mode
      socket.emit("start_stream");
      socket.emit("set_mode", { mode: "qr" });
      // Force "entry" direction to avoid conflict with Gate Out
      socket.emit("set_gate_direction", { direction: "entry" });
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
      setVideoFrame(null);
    });
    socket.on("connect_error", () => setSocketStatus("disconnected"));

    socket.on("connection_status", () => {
      // QR-only mode for entry gate
    });
    socket.on("mode_changed", () => {
      // QR-only mode for entry gate
    });
    socket.on("video_feed", (payload: { frame?: string }) => {
      if (payload?.frame && payload.frame.length > 10) {
        setVideoFrame(payload.frame);
      } else {
        setVideoFrame(null);
      }
    });

    socket.on("video_url", (payload: { url?: string }) => {
      if (payload?.url) {
        setVideoFrame(`url:${payload.url}`);
      }
    });

    socket.on("qr_valid", (payload: any) => {
      setQrStatus({
        valid: true,
        qr: payload?.qr,
        driverName: payload?.driver?.name,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        message: payload?.message ?? "QR terverifikasi, silakan masuk.",
        timestamp: payload?.timestamp,
      });
    });

    socket.on("qr_invalid", (payload: any) => {
      setQrStatus({
        valid: false,
        qr: payload?.qr,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        reason: payload?.reason,
        message: payload?.message ?? "QR tidak valid. Pastikan QR code sesuai dengan Surat Perintah.",
        timestamp: payload?.timestamp,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // start local webcam for kiosk display (preferred)
  useEffect(() => {
    if (!USE_LOCAL_WEBCAM) return;

    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
          setCameraError(null);
        }
      } catch (error) {
        setCameraError("Tidak bisa membuka kamera perangkat. Izinkan akses kamera lalu muat ulang.");
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const driverName = qrStatus?.driverName ?? "-";
  const licensePlate = qrStatus?.licensePlate ?? "-";
  const qrCodeText = qrStatus?.qr ?? "Belum terbaca";
  const qrMessage = qrStatus?.message ?? "Siapkan QR code untuk validasi masuk";
  const qrTime = formatTime(qrStatus?.timestamp);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-500">Gate Kiosk</p>
            <h1 className="text-3xl font-semibold">OCR Stream & Status</h1>
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${socketStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"}`} />
            {socketStatus === "connected" ? "Terhubung OCR" : "Menyambung OCR..."}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
            <div className="relative h-[65vh] w-full">
              {cameraReady ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
              ) : videoFrame ? (
                videoFrame.startsWith("url:") ? (
                  <iframe
                    src={videoFrame.replace("url:", "")}
                    className="h-full w-full border-0"
                    allow="autoplay; encrypted-media"
                    title="Live gate camera feed"
                  />
                ) : (
                  <img
                    src={videoFrame}
                    alt="Live gate camera feed"
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                  {socketStatus === "connected" ? "Menunggu stream OCR..." : "Menghubungkan ke stream OCR..."}
                </div>
              )}
              {!cameraReady && !videoFrame && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <span>Mode: QR Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <ScanQrCode className="h-4 w-4 text-primary" />
                <span>Arahkan QR code ke kamera untuk masuk</span>
              </div>
            </div>
            {USE_LOCAL_WEBCAM && cameraError && (
              <div className="border-t border-white/10 px-4 py-2 text-xs text-amber-400">
                {cameraError}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-neutral-300">
              <Car className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.35em]">Data Terdeteksi</p>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Driver</p>
                  <p className="text-2xl font-semibold text-white">{driverName}</p>
                </div>
                {qrStatus && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${qrStatus.valid ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
                      }`}
                  >
                    {qrStatus.valid ? <ShieldCheck className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {qrStatus.valid ? "Valid" : "Perlu cek"}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-neutral-200">
                <p className="font-semibold text-primary">QR: {qrCodeText}</p>
                <p>Plat: {licensePlate}</p>
                <p>Waktu: {qrTime}</p>
                <p className="text-neutral-300">{qrMessage}</p>
                {qrStatus?.reason && <p className="text-amber-400 text-xs">Alasan: {qrStatus.reason}</p>}
              </div>

              {qrStatus?.valid && (
                <div className="space-y-2 text-sm">
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Status</p>
                  <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Gate In - Silakan Masuk
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
