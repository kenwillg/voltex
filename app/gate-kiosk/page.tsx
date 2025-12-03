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
  direction?: "entry" | "exit";
  sessionStatus?: string;
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
      // No fixed direction - will auto-detect based on session status
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

    // Helper function to validate QR with auto-direction detection
    const validateQrWithDirection = async (qrValue: string) => {
      if (!qrValue) return;

      try {
        // Extract session ID from QR format: VOLTEX|SPA|<SPA_NUMBER>|<SESSION_ID>
        const parts = qrValue.split("|");
        if (parts.length !== 4 || parts[0] !== "VOLTEX" || parts[1] !== "SPA") {
          setQrStatus({
            valid: false,
            qr: qrValue,
            message: "Format QR tidak valid",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const sessionId = parts[3];
        
        // First, check session status to determine direction
        const sessionRes = await fetch(`/api/load-sessions/${sessionId}`);
        if (!sessionRes.ok) {
          setQrStatus({
            valid: false,
            qr: qrValue,
            message: "Sesi tidak ditemukan",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const sessionData = await sessionRes.json();
        const currentStatus = sessionData.status;
        
        // Determine direction based on status
        let direction: "entry" | "exit";
        if (currentStatus === "SCHEDULED") {
          direction = "entry";
        } else if (currentStatus === "GATE_IN" || currentStatus === "LOADING") {
          direction = "exit";
        } else {
          setQrStatus({
            valid: false,
            qr: qrValue,
            message: `Status sesi tidak valid untuk gate: ${currentStatus}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Now validate QR with the determined direction
        const validateRes = await fetch(`/api/ocr/validate-qr?qr=${encodeURIComponent(qrValue)}&direction=${direction}`);
        const validateData = await validateRes.json();

        if (validateData.valid) {
          setQrStatus({
            valid: true,
            qr: qrValue,
            driverName: validateData.driver?.name,
            licensePlate: validateData.driver?.vehicle?.licensePlate,
            message: validateData.message ?? (direction === "entry" ? "Silakan masuk" : "Silakan keluar"),
            timestamp: new Date().toISOString(),
            direction,
            sessionStatus: currentStatus,
          });
        } else {
          setQrStatus({
            valid: false,
            qr: qrValue,
            reason: validateData.reason,
            message: validateData.message ?? "QR tidak valid",
            timestamp: new Date().toISOString(),
            direction,
            sessionStatus: currentStatus,
          });
        }
      } catch (error: any) {
        console.error("Error validating QR:", error);
        setQrStatus({
          valid: false,
          qr: qrValue,
          message: `Error: ${error.message || "Terjadi kesalahan"}`,
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Handle QR validation events from OCR server
    socket.on("qr_valid", async (payload: any) => {
      const qrValue = payload?.qr;
      if (qrValue) {
        // Validate with auto-direction detection
        await validateQrWithDirection(qrValue);
      } else {
        // Fallback if QR value not in payload
        setQrStatus({
          valid: true,
          driverName: payload?.driver?.name,
          licensePlate: payload?.driver?.vehicle?.licensePlate,
          message: payload?.message ?? "QR terverifikasi",
          timestamp: payload?.timestamp,
        });
      }
    });

    socket.on("qr_invalid", async (payload: any) => {
      const qrValue = payload?.qr;
      if (qrValue) {
        // Still try to validate with direction detection for better error messages
        await validateQrWithDirection(qrValue);
      } else {
        setQrStatus({
          valid: false,
          qr: payload?.qr,
          licensePlate: payload?.driver?.vehicle?.licensePlate,
          reason: payload?.reason,
          message: payload?.message ?? "QR tidak valid. Pastikan QR code sesuai dengan Surat Perintah.",
          timestamp: payload?.timestamp,
        });
      }
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
                <span>Mode: QR {qrStatus?.direction === "exit" ? "Exit" : "Entry/Exit"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ScanQrCode className="h-4 w-4 text-primary" />
                <span>
                  {qrStatus?.direction === "exit" 
                    ? "Arahkan QR code untuk keluar" 
                    : qrStatus?.direction === "entry"
                    ? "Arahkan QR code untuk masuk"
                    : "Arahkan QR code ke kamera"}
                </span>
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
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    qrStatus.direction === "exit"
                      ? "bg-blue-500/10 text-blue-300"
                      : "bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {qrStatus.direction === "exit" ? "Gate Out - Silakan Keluar" : "Gate In - Silakan Masuk"}
                  </div>
                  {qrStatus.sessionStatus && (
                    <p className="text-xs text-neutral-500">Status Sesi: {qrStatus.sessionStatus}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
