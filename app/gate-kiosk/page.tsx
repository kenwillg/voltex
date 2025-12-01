"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Radio, ScanQrCode, ShieldCheck, XCircle } from "lucide-react";
import io, { Socket } from "socket.io-client";

type DetectionMode = "plate" | "qr" | "idle";

interface PlateStatus {
  recognized: boolean;
  plate?: string;
  confidence?: number;
  driverName?: string;
  message?: string;
  timestamp?: string;
}

interface QrStatus {
  valid: boolean;
  qr?: string;
  driverName?: string;
  licensePlate?: string;
  message?: string;
  reason?: string;
  timestamp?: string;
}

type GateStep = "SCHEDULED" | "GATE_IN" | "LOADING" | "GATE_OUT";

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
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("qr");
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [plateStatus, setPlateStatus] = useState<PlateStatus | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<GateStep>("SCHEDULED");
  const currentStepRef = useRef<GateStep>("SCHEDULED");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Sedang mengambil data...");
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const scheduleAutoClear = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setPlateStatus(null);
      setQrStatus(null);
      setCurrentStep("SCHEDULED");
      setStatusMessage("Menunggu kendaraan berikutnya.");
    }, 20000);
  };

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
      // Tell Python script this is an ENTRY gate
      socket.emit("set_gate_direction", { direction: "entry" });
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
      setVideoFrame(null);
    });
    socket.on("connect_error", () => setSocketStatus("disconnected"));

    socket.on("connection_status", (payload: { mode?: DetectionMode }) => {
      // force kiosk to stay on QR mode even if server suggests otherwise
      setDetectionMode("qr");
    });
    socket.on("mode_changed", (payload: { mode?: DetectionMode }) => {
      setDetectionMode("qr");
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

    socket.on("driver_detected", (payload: any) => {
      setPlateStatus({
        recognized: true,
        plate: payload?.plate,
        confidence: payload?.confidence,
        driverName: payload?.driver?.name,
        message: payload?.message ?? "Plat dikenali, lanjutkan dengan QR.",
        timestamp: payload?.timestamp,
      });
      setQrStatus(null);
      const previous = currentStepRef.current;
      if (previous === "SCHEDULED") {
        setCurrentStep("GATE_IN");
        setStatusMessage("Silakan masuk, data diverifikasi di gate.");
        scheduleAutoClear();
      } else {
        setCurrentStep("LOADING");
        setStatusMessage("Data ditemukan, lanjut scan QR.");
      }
      setDetectionMode("qr");
      // optional prompt to server if supported
      socket.emit("request_mode_change", { mode: "qr" });
    });

    socket.on("plate_unrecognized", (payload: any) => {
      setPlateStatus({
        recognized: false,
        plate: payload?.plate,
        confidence: payload?.confidence,
        message: payload?.message ?? "Plat tidak ditemukan di jadwal hari ini.",
        timestamp: payload?.timestamp,
      });
      setQrStatus(null);
      setCurrentStep("GATE_IN");
      setStatusMessage(payload?.message ?? "Plat tidak ditemukan, mohon ulangi.");
      setDetectionMode("qr");
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

      // STRICTLY GATE IN LOGIC
      setCurrentStep("GATE_IN");
      setStatusMessage("Silakan masuk. Barrier dibuka.");

      setDetectionMode("qr");
      socket.emit("request_mode_change", { mode: "qr" });
      scheduleAutoClear();
    });

    socket.on("qr_invalid", (payload: any) => {
      setQrStatus({
        valid: false,
        qr: payload?.qr,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        reason: payload?.reason,
        message: payload?.message ?? "QR tidak valid.",
        timestamp: payload?.timestamp,
      });
      setCurrentStep("LOADING");
      setStatusMessage(payload?.message ?? "QR tidak valid, coba ulang.");
      setDetectionMode("qr");
      socket.emit("request_mode_change", { mode: "qr" });
      scheduleAutoClear();
    });

    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
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

  const driverName = qrStatus?.driverName ?? plateStatus?.driverName ?? "-";
  const licensePlate = qrStatus?.licensePlate ?? plateStatus?.plate ?? "-";
  const qrCodeText = qrStatus?.qr ?? "Belum terbaca";
  const qrMessage = qrStatus?.message ?? (plateStatus?.message || "Siapkan QR untuk validasi");
  const qrTime = formatTime(qrStatus?.timestamp ?? plateStatus?.timestamp);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-500">Gate In</p>
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
                <span>Mode: QR</span>
              </div>
              <div className="flex items-center gap-2">
                <ScanQrCode className="h-4 w-4 text-primary" />
                <span>Gerakkan QR ke area kamera</span>
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
                <p className="text-xs text-primary">{statusMessage}</p>
                {qrStatus?.reason && <p className="text-amber-400 text-xs">Alasan: {qrStatus.reason}</p>}
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Status Gate</p>
                <div className="flex flex-wrap gap-2">
                  {(["SCHEDULED", "GATE_IN", "LOADING", "GATE_OUT"] as GateStep[]).map((step) => {
                    const active = step === currentStep;
                    return (
                      <span
                        key={step}
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${active ? "bg-primary text-black" : "bg-white/10 text-neutral-300"
                          }`}
                      >
                        {step.replace("_", " ")}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-400">
                  Alur dapat lompat (Gate In → Loading → Gate Out) mengikuti hasil OCR/QR secara dinamis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
