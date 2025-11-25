"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "lucide-react";
import { ChevronRight, CircleDashed, History, Radio, ShieldCheck, Video, XCircle } from "lucide-react";
import io, { Socket } from "socket.io-client";

import { InfoCard } from "@/components/ui/card";
import { useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

type GateDirection = "entry" | "exit" | null;
type DetectionMode = "plate" | "qr" | "idle";

interface PlateStatus {
  recognized: boolean;
  plate?: string;
  confidence?: number;
  driverName?: string;
  driverCode?: string;
  licensePlate?: string;
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

const SOCKET_URL = process.env.NEXT_PUBLIC_OCR_SOCKET_URL ?? "http://localhost:8000";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

const formatFullTime = (value?: string) =>
  value ? new Date(value).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

export default function GatePage() {
  const { sessions } = useStatusContext();

  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [gateDirection, setGateDirection] = useState<GateDirection>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("plate");
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [plateStatus, setPlateStatus] = useState<PlateStatus | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);

  const orderedSessions = useMemo(() => {
    const copy = [...sessions];
    return copy.sort((a, b) => {
      const timeA = a.gate.entry ? new Date(a.gate.entry).getTime() : 0;
      const timeB = b.gate.entry ? new Date(b.gate.entry).getTime() : 0;
      return timeB - timeA;
    });
  }, [sessions]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connection_status", (payload: { mode?: DetectionMode; message?: string }) => {
      if (payload?.mode) setDetectionMode(payload.mode);
      setControlMessage(payload?.message ?? null);
    });
    socket.on("mode_changed", (payload: { mode?: DetectionMode }) => {
      if (payload?.mode) setDetectionMode(payload.mode);
    });
    socket.on("video_feed", (payload: { frame?: string }) => {
      if (payload?.frame) setVideoFrame(payload.frame);
    });
    socket.on("driver_detected", (payload: any) => {
      setPlateStatus({
        recognized: true,
        plate: payload?.plate,
        confidence: payload?.confidence,
        driverName: payload?.driver?.name,
        driverCode: payload?.driver?.driverCode,
        licensePlate: payload?.driver?.vehicle?.licensePlate ?? payload?.plate,
        message: payload?.message ?? "Driver identified",
        timestamp: payload?.timestamp,
      });
      setControlMessage(payload?.message ?? "License plate validated. Proceed to QR when ready.");
      setQrStatus(null);
    });
    socket.on("plate_unrecognized", (payload: any) => {
      setPlateStatus({
        recognized: false,
        plate: payload?.plate,
        confidence: payload?.confidence,
        message: payload?.message ?? "Plate not found in schedule",
        timestamp: payload?.timestamp,
      });
      setControlMessage(payload?.message ?? "No matching driver; re-attempt plate scan or switch camera.");
      setQrStatus(null);
    });
    socket.on("qr_valid", (payload: any) => {
      setQrStatus({
        valid: true,
        qr: payload?.qr,
        driverName: payload?.driver?.name,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        message: payload?.message ?? "QR confirmed",
        timestamp: payload?.timestamp,
      });
      setControlMessage(payload?.message ?? "Driver authenticated via QR.");
    });
    socket.on("qr_invalid", (payload: any) => {
      setQrStatus({
        valid: false,
        qr: payload?.qr,
        licensePlate: payload?.driver?.vehicle?.licensePlate,
        reason: payload?.reason,
        message: payload?.message ?? "QR failed validation",
        timestamp: payload?.timestamp,
      });
      setControlMessage(payload?.message ?? "QR not recognized; verify driver code.");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const requestModeChange = (mode: DetectionMode) => {
    if (!socketRef.current) return;
    socketRef.current.emit("set_mode", { mode });
    setDetectionMode(mode);
  };

  const startCameraForGate = (direction: GateDirection) => {
    setGateDirection(direction);
    setPlateStatus(null);
    setQrStatus(null);
    setControlMessage(direction ? `Camera armed for gate ${direction}. License plate step first.` : null);
    requestModeChange("plate");
    socketRef.current?.emit("start_stream");
  };

  const proceedToQrStep = () => {
    if (!plateStatus?.recognized) {
      setControlMessage("License plate must be validated before scanning QR.");
      return;
    }
    setControlMessage("Switching to QR validation. Present driver QR to camera.");
    setQrStatus(null);
    requestModeChange("qr");
  };

  const toggleModeManually = () => {
    const nextMode: DetectionMode = detectionMode === "qr" ? "plate" : "qr";
    setControlMessage(`Manually switching to ${nextMode.toUpperCase()} detection.`);
    requestModeChange(nextMode);
  };

  const socketBadge = (() => {
    if (socketStatus === "connected") return "bg-emerald-500/10 text-emerald-500";
    if (socketStatus === "connecting") return "bg-amber-500/10 text-amber-500";
    return "bg-rose-500/10 text-rose-500";
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">Terminal Access</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Gate Entry & Exit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Single-console view to arm the gate camera, run license plate OCR, then confirm the driver’s QR code before opening the barrier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${socketBadge}`}>
            <Radio className="h-4 w-4" />
            {socketStatus === "connected" ? "WS Connected" : socketStatus === "connecting" ? "Connecting" : "Disconnected"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2">
            <Badge className="h-4 w-4" />
            Mode: {detectionMode.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="Gate Remote"
          description="Choose entry or exit, then let the camera run plate OCR followed by QR validation."
          icon={Video}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {["entry", "exit"].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => startCameraForGate(direction as GateDirection)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    gateDirection === direction
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/70 text-foreground hover:border-primary"
                  }`}
                >
                  Gate {direction === "entry" ? "Entry" : "Exit"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 uppercase tracking-[0.25em]">
                <CircleDashed className="h-4 w-4 text-primary" />
                2-Step: Plate → QR
              </span>
              <button
                type="button"
                onClick={toggleModeManually}
                className="rounded-2xl border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-foreground transition hover:border-primary"
              >
                Manual Toggle
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/70">
              {videoFrame ? (
                <img
                  src={`data:image/jpeg;base64,${videoFrame}`}
                  alt="Live gate camera feed"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                  Waiting for camera stream...
                </div>
              )}
            </div>
            <div className="space-y-4 rounded-3xl border border-border/70 bg-background/60 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Step Control</p>
                <button
                  type="button"
                  onClick={() => requestModeChange("plate")}
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Force Plate Mode
                </button>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Plate Check</span>
                    {plateStatus ? (
                      plateStatus.recognized ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                          <ShieldCheck className="h-4 w-4" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
                          <XCircle className="h-4 w-4" /> Unknown
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Plate: {plateStatus?.plate ?? "-"}</p>
                    <p>Driver: {plateStatus?.driverName ?? "-"}</p>
                    <p>Confidence: {plateStatus?.confidence ? `${(plateStatus.confidence * 100).toFixed(1)}%` : "-"}</p>
                    <p>Timestamp: {formatFullTime(plateStatus?.timestamp)}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">{plateStatus?.message ?? "Awaiting plate detection."}</p>
                  <button
                    type="button"
                    onClick={proceedToQrStep}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground transition hover:bg-primary/90"
                  >
                    Continue to QR Check
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">QR Verification</span>
                    {qrStatus ? (
                      qrStatus.valid ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                          <ShieldCheck className="h-4 w-4" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
                          <XCircle className="h-4 w-4" /> Invalid
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>QR: {qrStatus?.qr ?? "-"}</p>
                    <p>Driver: {qrStatus?.driverName ?? "-"}</p>
                    <p>Plate: {qrStatus?.licensePlate ?? "-"}</p>
                    <p>Timestamp: {formatFullTime(qrStatus?.timestamp)}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">{qrStatus?.message ?? "Awaiting QR read after plate validation."}</p>
                  {qrStatus?.reason && <p className="text-xs text-rose-500">Reason: {qrStatus.reason}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Active detection: {detectionMode.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => requestModeChange("qr")}
                      className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Force QR Mode
                    </button>
                  </div>
                </div>
              </div>
              {controlMessage && <p className="text-xs text-muted-foreground">{controlMessage}</p>}
            </div>
          </div>
        </InfoCard>

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
    </div>
  );
}
