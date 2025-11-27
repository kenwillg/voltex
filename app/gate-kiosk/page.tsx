"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

export default function GateKioskPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError("Tidak dapat mengakses kamera. Izinkan akses lalu muat ulang halaman.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white">
      <div className="w-full max-w-5xl space-y-4 text-center">
        <div className="flex items-center justify-center gap-2 text-neutral-300">
          <Camera className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold uppercase tracking-[0.4em]">Gate Kiosk</p>
        </div>
        <h1 className="text-3xl font-semibold">Arahkan QR ke Kamera</h1>
        <p className="text-sm text-neutral-400">
          Kamera aktif untuk pemindaian QR. Pastikan memberi izin kamera dan pencahayaan cukup.
        </p>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
          <video
            ref={videoRef}
            className="h-[65vh] w-full object-cover"
            playsInline
            muted
          />
        </div>
        {error && <p className="text-sm text-amber-400">{error}</p>}
      </div>
    </div>
  );
}
