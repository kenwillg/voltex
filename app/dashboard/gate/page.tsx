"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  ChevronRight,
  CircleDashed,
  History,
  Radio,
  ShieldCheck,
  Video,
  XCircle,
} from "lucide-react";
import io, { Socket } from "socket.io-client";

import { InfoCard } from "@/components/ui/card";

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

interface ExpectedOrder {
  id: string;
  spNumber: string;
  driverName: string;
  licensePlate: string;
  scheduledAt: string;
  product: string;
  plannedLiters: string;
  status: string;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_OCR_SOCKET_URL ?? "http://localhost:8000";

// how long a recognized plate must stay before auto-QR (seconds)
const PLATE_LOCK_SECONDS = 2;

const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatFullTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

export default function GatePage() {
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [gateDirection, setGateDirection] = useState<GateDirection>(null);
  const [detectionMode, setDetectionMode] =
    useState<DetectionMode>("plate");
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [plateStatus, setPlateStatus] = useState<PlateStatus | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(
    null,
  );

  // countdown in seconds (null = no countdown running)
  const [plateLockCountdown, setPlateLockCountdown] = useState<
    number | null
  >(null);

  // expected orders for today (right panel)
  const [expectedOrders, setExpectedOrders] = useState<ExpectedOrder[]>(
    [],
  );

  // --- socket wiring ----------------------------------------------------------------
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[gate] socket connected", socket.id);
      setSocketStatus("connected");
    });

    socket.on("disconnect", (reason: string) => {
      console.log("[gate] socket disconnected", reason);
      setSocketStatus("disconnected");
      setVideoFrame(null);
    });

    socket.on("connect_error", (err: any) => {
      console.error("[gate] connect_error", err);
      setSocketStatus("disconnected");
    });

    socket.on(
      "connection_status",
      (payload: { mode?: DetectionMode; message?: string }) => {
        if (payload?.mode) setDetectionMode(payload.mode);
        setControlMessage(payload?.message ?? null);
      },
    );

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
        licensePlate:
          payload?.driver?.vehicle?.licensePlate ?? payload?.plate,
        message:
          payload?.message ??
          "Plate recognized. Hold steady for 2 seconds to confirm.",
        timestamp: payload?.timestamp,
      });
      setControlMessage(
        payload?.message ??
          "Plate recognized. Hold steady for 2 seconds to auto-switch to QR.",
      );
      setQrStatus(null);
      // allow a new countdown to start
      setPlateLockCountdown(null);
    });

    socket.on("plate_unrecognized", (payload: any) => {
      setPlateStatus({
        recognized: false,
        plate: payload?.plate,
        confidence: payload?.confidence,
        message:
          payload?.message ?? "Plate not found in today’s schedule.",
        timestamp: payload?.timestamp,
      });
      setControlMessage(
        payload?.message ??
          "No matching vehicle; re-attempt plate scan or switch camera.",
      );
      setQrStatus(null);
      setPlateLockCountdown(null);
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
      setPlateLockCountdown(null);
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
      setControlMessage(
        payload?.message ?? "QR not recognized; verify driver code.",
      );
      setPlateLockCountdown(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // --- expected orders (today only) -------------------------------------------------
  useEffect(() => {
    const loadExpected = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filtered: ExpectedOrder[] = data
          .filter((o: any) => {
            const when = new Date(o.scheduledAt);
            return when >= todayStart && when < tomorrow;
          })
          .map((o: any) => ({
            id: o.id,
            spNumber: o.spNumber,
            driverName: o.driver?.name ?? "-",
            licensePlate: o.vehicle?.licensePlate ?? "-",
            scheduledAt: o.scheduledAt,
            product: o.product,
            plannedLiters: o.plannedLiters?.toString() ?? "-",
            status: o.status ?? "SCHEDULED",
          }));

        setExpectedOrders(filtered);
      } catch (err) {
        console.error("Failed to load expected orders", err);
      }
    };

    loadExpected();
  }, []);

  // --- helpers ----------------------------------------------------------------------
  const requestModeChange = (mode: DetectionMode) => {
    if (!socketRef.current) return;
    socketRef.current.emit("set_mode", { mode });
    setDetectionMode(mode);
  };

  const startCameraForGate = (direction: GateDirection) => {
    setGateDirection(direction);
    setPlateStatus(null);
    setQrStatus(null);
    setControlMessage(
      direction
        ? `Camera armed for gate ${direction}. License plate step first.`
        : null,
    );
    setPlateLockCountdown(null);
    requestModeChange("plate");
    socketRef.current?.emit("start_stream");
  };

  // Manual override
  const proceedToQrStep = () => {
    if (!plateStatus?.recognized) {
      setControlMessage("License plate must be validated before scanning QR.");
      return;
    }
    setControlMessage("Switching to QR validation. Present driver QR to camera.");
    setQrStatus(null);
    setPlateLockCountdown(null);
    requestModeChange("qr");
  };

  const toggleModeManually = () => {
    const nextMode: DetectionMode =
      detectionMode === "qr" ? "plate" : "qr";
    setControlMessage(
      `Manually switching to ${nextMode.toUpperCase()} detection.`,
    );
    setPlateLockCountdown(null);
    requestModeChange(nextMode);
  };

  // --- auto-advance plate → QR ------------------------------------------------------
  useEffect(() => {
    if (!plateStatus?.recognized || detectionMode !== "plate") {
      setPlateLockCountdown(null);
      return;
    }

    // if countdown already running, don't restart
    if (plateLockCountdown !== null) return;

    const startTime = performance.now();
    let frameId: number;

    const tick = () => {
      const elapsedMs = performance.now() - startTime;
      const remainingMs = Math.max(
        0,
        PLATE_LOCK_SECONDS * 1000 - elapsedMs,
      );
      const remainingSec = remainingMs / 1000;
      setPlateLockCountdown(remainingSec);

      if (remainingMs <= 0) {
        setPlateLockCountdown(null);
        setControlMessage("Plate locked – switching to QR validation.");
        setQrStatus(null);
        requestModeChange("qr");
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateStatus?.plate, plateStatus?.recognized, detectionMode]);

  const lockProgress =
    plateLockCountdown !== null
      ? Math.min(
          1,
          Math.max(
            0,
            (PLATE_LOCK_SECONDS - plateLockCountdown) /
              PLATE_LOCK_SECONDS,
          ),
        )
      : 0;

  const socketBadge = (() => {
    if (socketStatus === "connected")
      return "bg-emerald-500/10 text-emerald-500";
    if (socketStatus === "connecting")
      return "bg-amber-500/10 text-amber-500";
    return "bg-rose-500/10 text-rose-500";
  })();

  // --- UI ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">
            Terminal Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Gate Entry &amp; Exit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Single-console view to arm the gate camera, run license plate OCR,
            then confirm the driver’s QR code before opening the barrier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${socketBadge}`}
          >
            <Radio className="h-4 w-4" />
            {socketStatus === "connected"
              ? "WS Connected"
              : socketStatus === "connecting"
              ? "Connecting"
              : "Disconnected"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2">
            <Badge className="h-4 w-4" />
            Mode: {detectionMode.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* left: gate remote */}
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
                  onClick={() =>
                    startCameraForGate(direction as GateDirection)
                  }
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
            {/* camera view */}
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/70">
              {videoFrame ? (
                <img
                  src={videoFrame}
                  alt="Live gate camera feed"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                  Waiting for camera stream...
                </div>
              )}
            </div>

            {/* step control */}
            <div className="space-y-4 rounded-3xl border border-border/70 bg-background/60 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Step Control
                </p>
                <button
                  type="button"
                  onClick={() => requestModeChange("plate")}
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Force Plate Mode
                </button>
              </div>

              <div className="space-y-3">
                {/* Plate check card */}
                <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Plate Check
                    </span>
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
                      <span className="text-xs text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Plate: {plateStatus?.plate ?? "-"}</p>
                    <p>Driver: {plateStatus?.driverName ?? "-"}</p>
                    <p>
                      Confidence:{" "}
                      {plateStatus?.confidence
                        ? `${(plateStatus.confidence * 100).toFixed(1)}%`
                        : "-"}
                    </p>
                    <p>
                      Timestamp: {formatFullTime(plateStatus?.timestamp)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    {plateStatus?.message ?? "Awaiting plate detection."}
                  </p>

                  {/* 2s locking bar */}
                  {plateStatus?.recognized &&
                    detectionMode === "plate" &&
                    plateLockCountdown !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Locking plate...</span>
                          <span>{plateLockCountdown.toFixed(1)}s</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-100"
                            style={{ width: `${lockProgress * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                  {/* manual override still available */}
                  <button
                    type="button"
                    onClick={proceedToQrStep}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground transition hover:bg-primary/90"
                  >
                    Continue to QR Check
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* QR card */}
                <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      QR Verification
                    </span>
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
                      <span className="text-xs text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>QR: {qrStatus?.qr ?? "-"}</p>
                    <p>Driver: {qrStatus?.driverName ?? "-"}</p>
                    <p>Plate: {qrStatus?.licensePlate ?? "-"}</p>
                    <p>
                      Timestamp: {formatFullTime(qrStatus?.timestamp)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    {qrStatus?.message ??
                      "Awaiting QR read after plate validation."}
                  </p>
                  {qrStatus?.reason && (
                    <p className="text-xs text-rose-500">
                      Reason: {qrStatus.reason}
                    </p>
                  )}
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
              {controlMessage && (
                <p className="text-xs text-muted-foreground">
                  {controlMessage}
                </p>
              )}
            </div>
          </div>
        </InfoCard>

        {/* right: expected orders for today */}
        <InfoCard
          title="Expected Arrivals Today"
          description="All trucks with a scheduled order for today"
          icon={History}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">SP Number</th>
                  <th className="pb-3 pr-4 font-medium">Driver</th>
                  <th className="pb-3 pr-4 font-medium">Vehicle</th>
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Planned</th>
                  <th className="pb-3 pr-4 font-medium">Scheduled</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {expectedOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-border/60 text-sm"
                  >
                    <td className="py-3 pr-4 font-semibold text-foreground">
                      {o.spNumber}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">
                        {o.driverName}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.licensePlate}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.product}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.plannedLiters} L
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatFullTime(o.scheduledAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {expectedOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      No scheduled orders for today yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
