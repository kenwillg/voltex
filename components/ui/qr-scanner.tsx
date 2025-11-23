"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle, ScanQrCode, Video } from "lucide-react";
import { InfoCard } from "@/components/ui/card";
import { ScanStage, useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";

interface QrScannerProps {
  stage: ScanStage;
  title?: string;
  description?: string;
}

const stageHeadline: Record<ScanStage, string> = {
  "gate-entry": "Validate QR to allow trucks to enter terminal gate.",
  "gate-exit": "Scan QR before dispatching the truck out of the terminal.",
  "fuel-bay": "Ensure the QR & PIN are valid before unlocking the fuel bay.",
};

export function QrScanner({
  stage,
  title = "QR Scanner",
  description,
}: QrScannerProps) {
  const { sessions, scanQrPayload } = useStatusContext();
  const [payload, setPayload] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string>(
    sessions[0]?.orderId ?? "",
  );
  const [scanResult, setScanResult] = useState<ReturnType<
    typeof scanQrPayload
  > | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [nativeCameraActive, setNativeCameraActive] = useState(false);
  const [flaskBridgeActive, setFlaskBridgeActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const flaskVideoRef = useRef<HTMLVideoElement | null>(null);
  const [nativeStream, setNativeStream] = useState<MediaStream | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.orderId === selectedOrder),
    [sessions, selectedOrder],
  );

  const derivedDescription = description ?? stageHeadline[stage];

  const handlePopulatePayload = () => {
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

  const stopNativeCamera = useCallback(() => {
    if (nativeStream) {
      nativeStream.getTracks().forEach((track) => track.stop());
      setNativeStream(null);
    }
    setNativeCameraActive(false);
    setFlaskBridgeActive(false);
  }, [nativeStream]);

  const handleOpenNativeCamera = async () => {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This browser cannot access the camera. Try another device.",
        );
        return;
      }

      if (nativeStream) {
        stopNativeCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (nativeVideoRef.current) {
        nativeVideoRef.current.srcObject = stream;
        await nativeVideoRef.current.play();
      }
      setNativeStream(stream);
      setNativeCameraActive(true);
    } catch (error) {
      console.error("Unable to start camera", error);
      setCameraError(
        "Unable to start the device camera. Please allow access and try again.",
      );
    }
  };

  const handleOpenFlaskBridge = async () => {
    setCameraError("");
    if (!nativeStream) {
      setCameraError(
        "Start the native camera first, then mirror it through the Flask OCR stream.",
      );
      return;
    }

    if (flaskVideoRef.current) {
      flaskVideoRef.current.srcObject = nativeStream;
      await flaskVideoRef.current.play();
    }

    setFlaskBridgeActive(true);
  };

  const handleScan = () => {
    if (!payload.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      const result = scanQrPayload(payload, stage);
      setScanResult(result);
      setIsScanning(false);
    }, 300);
  };

  const statusBadgeClass = scanResult?.order?.status
    ? StatusManager.getStatusBadgeClass(scanResult.order.status)
    : "";

  useEffect(() => {
    return () => {
      stopNativeCamera();
    };
  }, [stopNativeCamera]);

  return (
    <InfoCard title={title} description={derivedDescription} icon={ScanQrCode}>
      <div className="space-y-5">
        <div className="rounded-3xl border border-border/60 bg-background/50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Step by step
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Prepare the gate camera workflow
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
                onClick={handleOpenNativeCamera}
              >
                1) Open native camera
              </button>
              <button
                type="button"
                className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleOpenFlaskBridge}
                disabled={!nativeCameraActive}
              >
                2) Mirror via Flask OCR
              </button>
              {nativeCameraActive && (
                <button
                  type="button"
                  className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
                  onClick={stopNativeCamera}
                >
                  Stop camera
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            First, launch the browser camera to scan the driver QR. Then mirror
            the same feed through the Flask backend stream (for the OCR service
            you will wire up later).
          </p>
          {cameraError && (
            <p className="mt-2 text-xs font-semibold text-rose-500">
              {cameraError}
            </p>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Native camera
              </p>
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 p-3">
                {nativeCameraActive ? (
                  <video
                    ref={nativeVideoRef}
                    className="h-48 w-full rounded-xl bg-black object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Awaiting permission to open the device camera.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Flask OCR bridge
              </p>
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 p-3">
                {flaskBridgeActive ? (
                  <video
                    ref={flaskVideoRef}
                    className="h-48 w-full rounded-xl bg-black object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    When your Flask stream is ready, the same camera feed will
                    appear here for OCR processing.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Use dummy payload
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  className="flex-1 rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
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
                  className="rounded-2xl border border-border/60 px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  onClick={handlePopulatePayload}
                >
                  Insert JSON
                </button>
              </div>
            </div>
            <textarea
              className="h-44 w-full rounded-2xl border border-border/70 bg-background/60 p-3 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              placeholder='Paste QR payload, e.g. {"order_id":"SP-240503","driver_id":"DRV-0142"}'
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning || !payload.trim()}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning ? "Validating..." : "Scan QR"}
            </button>
          </div>
          <div className="rounded-3xl border border-border/60 bg-background/50 p-5">
            {scanResult ? (
              <>
                <div className="flex items-center gap-2">
                  {scanResult.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                  )}
                  <p
                    className={`text-sm font-semibold ${scanResult.success ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {scanResult.message}
                  </p>
                </div>
                {scanResult.order ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-border/60 p-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Driver
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {scanResult.order.driverName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scanResult.order.licensePlate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass}`}
                      >
                        {
                          StatusManager.getStatusConfig(scanResult.order.status)
                            .label
                        }
                      </span>
                      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {scanResult.order.product} /{" "}
                        {scanResult.order.plannedVolume}
                      </span>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <p>
                        Gate Entry:{" "}
                        {scanResult.order.gate.entry
                          ? new Date(
                              scanResult.order.gate.entry,
                            ).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                      <p>
                        Gate Exit:{" "}
                        {scanResult.order.gate.exit
                          ? new Date(
                              scanResult.order.gate.exit,
                            ).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                      <p>Fuel Slot: {scanResult.order.fuel.slot}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No driver data returned. Ensure the payload matches an
                    existing order.
                  </p>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <p>Awaiting QR payload...</p>
                <p className="mt-2 text-xs">
                  Paste the dummy JSON and hit{" "}
                  <span className="font-semibold text-foreground">Scan QR</span>{" "}
                  to view driver identity.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </InfoCard>
  );
}
