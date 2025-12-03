"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Fuel, HandHelping, Radio, ScanQrCode, ShieldCheck, XCircle } from "lucide-react";
import io, { Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_OCR_SOCKET_URL ?? "http://localhost:8000";

interface QrStatus {
  valid: boolean;
  qr?: string;
  driverName?: string;
  licensePlate?: string;
  message?: string;
  reason?: string;
  timestamp?: string;
  loadSessionId?: string;
  plannedLiters?: number;
}

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

export default function FuelBayKioskPage() {
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSendingPreset, setIsSendingPreset] = useState(false);
  const [presetSent, setPresetSent] = useState(false);
  
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Connect to OCR socket for fuel bay validation
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["polling"],
      path: "/socket.io/",
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[fuel-bay-kiosk] Connected to OCR server");
      setSocketStatus("connected");
      socket.emit("start_stream");
      socket.emit("set_mode", { mode: "qr" }); // QR-only mode
      socket.emit("set_flip_camera", { flip: true }); // Enable camera flip for fuel bay
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
      setVideoFrame(null);
    });

    socket.on("connect_error", () => {
      setSocketStatus("disconnected");
    });

    socket.on("video_feed", (payload: { frame?: string }) => {
      if (payload?.frame && payload.frame.length > 10) {
        setVideoFrame(payload.frame);
      } else {
        setVideoFrame(null);
      }
    });

    socket.on("qr_valid", async (payload: any) => {
      const qrValue = payload?.qr;
      if (!qrValue) return;

      try {
        // Extract session ID from QR to get planned liters
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
        
        // Fetch session data to get planned liters
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
        const plannedLiters = sessionData.order?.plannedLiters 
          ? Number(sessionData.order.plannedLiters) 
          : undefined;

        const qrData: QrStatus = {
          valid: true,
          qr: qrValue,
          driverName: payload?.driver?.name ?? sessionData.order?.driver?.name,
          licensePlate: payload?.driver?.vehicle?.licensePlate ?? sessionData.order?.vehicle?.licensePlate,
          message: payload?.message ?? "QR validated successfully.",
          timestamp: payload?.timestamp ?? new Date().toISOString(),
          loadSessionId: sessionId,
          plannedLiters,
        };
        
        setQrStatus(qrData);
        setValidationMessage("QR code validated. Processing preset...");
      } catch (error: any) {
        console.error("Error processing QR:", error);
        setQrStatus({
          valid: false,
          qr: qrValue,
          message: `Error: ${error.message || "Terjadi kesalahan"}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("qr_invalid", (payload: any) => {
      setQrStatus({
        valid: false,
        qr: payload?.qr,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        reason: payload?.reason,
        message: payload?.message ?? "QR code invalid.",
        timestamp: payload?.timestamp,
      });
      setValidationMessage("QR code invalid. Please scan again.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty dependency array - socket events are set up once

  // Handle preset sending when QR is validated
  useEffect(() => {
    if (
      qrStatus?.valid && 
      qrStatus.loadSessionId &&
      qrStatus.plannedLiters &&
      qrStatus.plannedLiters > 0 &&
      !presetSent &&
      !isSendingPreset
    ) {
      handleBothValidated(qrStatus.loadSessionId, qrStatus.plannedLiters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrStatus?.valid, qrStatus?.loadSessionId, qrStatus?.plannedLiters, presetSent, isSendingPreset]);

  // Handle when both plate and QR are validated
  const handleBothValidated = async (sessionId: string, plannedLiters: number) => {
    if (isSendingPreset || presetSent) return;
    
    setIsSendingPreset(true);
    setValidationMessage("Validating order status and sending preset to fuel pump...");

    try {
      // First check if the session status is GATE_IN
      const sessionRes = await fetch(`/api/load-sessions/${sessionId}`);
      if (!sessionRes.ok) {
        throw new Error("Failed to fetch session");
      }
      const sessionData = await sessionRes.json();
      
      if (sessionData.status !== "GATE_IN") {
        setValidationMessage(`Order status is ${sessionData.status}. Only GATE_IN orders can start filling.`);
        setIsSendingPreset(false);
        return;
      }

      // Send preset to ESP32 via /api/bay/preset
      const presetRes = await fetch("/api/bay/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!presetRes.ok) {
        const errorData = await presetRes.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send preset");
      }

      const presetData = await presetRes.json();
      setPresetSent(true);
      setValidationMessage(`Preset sent successfully! Target: ${plannedLiters}L. Status changed to LOADING.`);
    } catch (err: any) {
      console.error("Error sending preset:", err);
      setValidationMessage(`Error: ${err.message || "Failed to send preset to fuel pump"}`);
    } finally {
      setIsSendingPreset(false);
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

  const resetValidation = () => {
    setQrStatus(null);
    setValidationMessage(null);
    setPresetSent(false);
    socketRef.current?.emit("set_mode", { mode: "qr" });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row">
        <section className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.5em] text-neutral-500">Fuel Bay</p>
          <h1 className="text-5xl font-semibold tracking-[0.3em] text-white">VALIDASI KENDARAAN</h1>
          <p className="text-base text-neutral-400">
            Scan QR code dari Surat Perintah untuk memulai pengisian bahan bakar.
          </p>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Instruksi</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>1. Pastikan kendaraan sudah melalui Gate In.</p>
              <p>2. Arahkan kamera ke QR code pada Surat Perintah.</p>
              <p>3. Sistem akan mengirim target pengisian ke fuel pump secara otomatis.</p>
              <p>4. Proses pengisian akan dimulai setelah preset terkirim.</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-neutral-400">Validasi Kendaraan</p>
              <h2 className="text-2xl font-semibold text-white">Fuel Bay Console</h2>
            </div>
            <Fuel className="h-10 w-10 text-primary" />
          </div>

          {/* Camera view */}
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-primary" />
                <p className="text-base font-semibold text-white">OCR Camera Stream</p>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400">
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${socketStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {socketStatus === "connected" ? "Terhubung" : "Menyambung..."}
              </div>
            </div>
            <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {videoFrame ? (
                <img
                  src={videoFrame}
                  alt="Live OCR camera feed"
                  className="h-full w-full object-cover scale-y-[-1]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  {socketStatus === "connected" ? "Menunggu stream kamera..." : "Menghubungkan ke kamera..."}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <span>Mode: QR</span>
              </div>
              <div className="flex items-center gap-2">
                <ScanQrCode className="h-4 w-4 text-primary" />
                <span>Arahkan ke QR code</span>
              </div>
            </div>
          </div>

          {/* Local webcam option */}
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-primary" />
                <p className="text-base font-semibold text-white">Webcam Lokal (Opsional)</p>
              </div>
              {!cameraOn ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isStartingCamera}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-black transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isStartingCamera ? "Memulai..." : "Aktifkan"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  Matikan
                </button>
              )}
            </div>
            {cameraError && (
              <p className="mt-2 text-xs text-amber-400">{cameraError}</p>
            )}
            {cameraOn && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <div className="relative h-48 w-full">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover scale-y-[-1]"
                    playsInline
                    muted
                    autoPlay
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation Status */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-400">Status Validasi</p>
            
            {/* QR Status */}
            <div className="rounded-xl border border-white/10 bg-black/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">QR Code</span>
                {qrStatus ? (
                  qrStatus.valid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      <XCircle className="h-3 w-3" /> Invalid
                    </span>
                  )
                ) : (
                  <span className="text-xs text-neutral-500">Pending</span>
                )}
              </div>
              {qrStatus && (
                <div className="space-y-1 text-xs text-neutral-300">
                  <p>QR: {qrStatus.qr ?? "-"}</p>
                  <p>Driver: {qrStatus.driverName ?? "-"}</p>
                  <p>Target: {qrStatus.plannedLiters ? `${qrStatus.plannedLiters}L` : "-"}</p>
                  <p>Time: {formatTime(qrStatus.timestamp)}</p>
                  {qrStatus.reason && (
                    <p className="text-amber-400">Reason: {qrStatus.reason}</p>
                  )}
                </div>
              )}
            </div>

            {/* Validation Message */}
            {validationMessage && (
              <div className={`rounded-xl border p-3 text-sm ${
                validationMessage.includes("Error") || validationMessage.includes("invalid")
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : validationMessage.includes("success") || validationMessage.includes("Preset sent")
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-primary/40 bg-primary/10 text-primary"
              }`}>
                {validationMessage}
                {isSendingPreset && <span className="ml-2 animate-pulse">...</span>}
              </div>
            )}

            {/* Reset Button */}
            {qrStatus && (
              <button
                type="button"
                onClick={resetValidation}
                className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Reset Validasi
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
