// app/api/ocr/validate-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// -------------------
// Configure ESP32 IP
// -------------------
const ESP32_GATE_IP = "192.168.112.78";

// -------------------
// Rate limiting to prevent duplicate scans
// -------------------
const recentScans = new Map<string, number>(); // key: qr, value: timestamp
const SCAN_COOLDOWN_MS = 3000; // 3 seconds cooldown between scans

// helper to open a gate
async function openGate(direction: "entry" | "exit") {
  try {
    const url = `http://${ESP32_GATE_IP}/gate/open?direction=${direction}`;
    console.log("[ESP32] Send:", url);
    const r = await fetch(url);
    console.log("[ESP32] Response status:", r.status);
  } catch (err) {
    console.error("[ESP32] Failed to open gate:", err);
  }
}

export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr") ?? "";
  const direction =
    (req.nextUrl.searchParams.get("direction") as "entry" | "exit") ??
    "entry"; // default entry

  console.log("validate-qr:", qr, "direction:", direction);

  // Check for duplicate scan within cooldown period
  const now = Date.now();
  const lastScan = recentScans.get(qr);
  if (lastScan && now - lastScan < SCAN_COOLDOWN_MS) {
    const remainingMs = SCAN_COOLDOWN_MS - (now - lastScan);
    console.log("[qr] Duplicate scan detected, cooldown remaining:", remainingMs, "ms");

    // Attempt to handle rapid duplicate scans gracefully
    // If the previous scan succeeded, we should return success again instead of error
    try {
      const parts = qr.split("|");
      if (parts.length === 4 && parts[0] === "VOLTEX" && parts[1] === "SPA") {
        const spaNumber = parts[2];
        const order = await prisma.order.findUnique({
          where: { spNumber: spaNumber },
          include: {
            driver: true,
            vehicle: true,
            loadSessions: {
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        });

        if (order && order.loadSessions.length > 0) {
          const session = order.loadSessions[0];
          const sessionUpdatedTime = new Date(session.updatedAt).getTime();
          // If updated within last 5 seconds (covering the cooldown period)
          if (now - sessionUpdatedTime < 5000) {
            return NextResponse.json(
              {
                valid: true,
                driver: {
                  id: order.driver.id,
                  name: order.driver.name,
                  driverCode: order.driver.driverCode,
                  vehicle: {
                    id: order.vehicle?.id ?? null,
                    licensePlate: order.vehicle?.licensePlate ?? "",
                  },
                },
                order: {
                  id: order.id,
                  spNumber: order.spNumber,
                  product: order.product,
                  plannedLiters: Number(order.plannedLiters ?? 0),
                },
                loadSession: {
                  id: session.id,
                  status: session.status,
                  gateInAt: session.gateInAt,
                  gateOutAt: session.gateOutAt ?? null,
                },
                reason: null,
                message: "Scan accepted (Duplicate)",
              },
              { status: 200 },
            );
          }
        }
      }
    } catch (e) {
      console.error("[qr] Error checking duplicate:", e);
    }

    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "Scan too frequent",
        message: `Tunggu ${Math.ceil(remainingMs / 1000)} detik sebelum scan ulang`,
      },
      { status: 200 },
    );
  }
  recentScans.set(qr, now);

  // Clean up old entries (older than 1 minute)
  for (const [key, timestamp] of recentScans.entries()) {
    if (now - timestamp > 60000) {
      recentScans.delete(key);
    }
  }

  try {
    // Expected shape: VOLTEX|SPA|<spaNumber>|<driverId>
    const parts = qr.split("|");
    if (parts.length !== 4 || parts[0] !== "VOLTEX" || parts[1] !== "SPA") {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: "Malformed QR payload",
        },
        { status: 200 },
      );
    }

    const [, , spaNumber, qrDriverId] = parts;
    console.log("[qr] parsed spaNumber =", spaNumber, "driverId =", qrDriverId);

    // 1) Locate the SPA/order directly from the payload
    const order = await prisma.order.findUnique({
      where: { spNumber: spaNumber },
      include: {
        driver: true,
        vehicle: true,
        loadSessions: {
          where: { status: { in: ["SCHEDULED", "GATE_IN", "LOADING"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    console.log("[qr] order found:", order ? "YES" : "NO");
    if (order) {
      console.log("[qr] order.driverId:", order.driverId, "qrDriverId:", qrDriverId);
      console.log("[qr] loadSessions count:", order.loadSessions.length);
    }

    if (!order) {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: `SPA ${spaNumber} not found`,
          message: `Order dengan SP Number ${spaNumber} tidak ditemukan di database`,
        },
        { status: 200 },
      );
    }

    if (!order.driverId) {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: "SPA is not assigned to a driver",
          message: `Order ${spaNumber} belum di-assign ke driver`,
        },
        { status: 200 },
      );
    }

    if (order.driverId !== qrDriverId) {
      console.log("[qr] DRIVER MISMATCH - Order driver:", order.driverId, "QR driver:", qrDriverId);
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: `Driver mismatch for SPA ${spaNumber}`,
          message: `QR code tidak sesuai dengan driver yang ditugaskan untuk order ${spaNumber}`,
        },
        { status: 200 },
      );
    }

    const driver = order.driver
      ? order.driver
      : await prisma.driver.findUnique({ where: { id: qrDriverId } });

    console.log("[qr] driver found:", driver ? driver.name : "NO");

    if (!driver) {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: "Driver not found in database",
          message: `Driver dengan ID ${qrDriverId} tidak ditemukan`,
        },
        { status: 200 },
      );
    }

    // 2) Pastikan driver dan order valid sebelum update apapun
    //    Ini memastikan tidak ada update status jika QR tidak valid

    // 3) Ensure/load a LoadSession and handle state transitions:
    //    SCHEDULED -> GATE_IN (scan pertama)
    //    GATE_IN or LOADING -> GATE_OUT (scan kedua)
    // 3) Ensure/load a LoadSession and handle state transitions:
    //    Strict separation based on 'direction' param:
    //    - direction=entry: Only allow SCHEDULED -> GATE_IN
    //    - direction=exit: Only allow GATE_IN/LOADING -> GATE_OUT

    const now = new Date();
    let session = order.loadSessions[0] ?? null;
    let transition: "GATE_IN" | "GATE_OUT" | null = null;

    if (direction === "entry") {
      // --- ENTRY LOGIC ---
      if (!session) {
        // No session exists, create one with GATE_IN
        session = await prisma.loadSession.create({
          data: { orderId: order.id, status: "GATE_IN", gateInAt: now },
        });
        transition = "GATE_IN";
      } else if (session.status === "SCHEDULED") {
        // First scan: SCHEDULED -> GATE_IN
        session = await prisma.loadSession.update({
          where: { id: session.id },
          data: { status: "GATE_IN", gateInAt: now },
        });
        transition = "GATE_IN";
      } else {
        // Already passed entry stage (GATE_IN, LOADING, etc.)
        // Do NOT transition to GATE_OUT here.
        // Just return current status.
        return NextResponse.json(
          {
            valid: true,
            driver: {
              id: driver.id,
              name: driver.name,
              driverCode: driver.driverCode,
              vehicle: {
                id: order.vehicle?.id ?? null,
                licensePlate: order.vehicle?.licensePlate ?? "",
              },
            },
            loadSession: session,
            reason: null,
            message: `Kendaraan sudah di dalam (Status: ${session.status}).`,
          },
          { status: 200 },
        );
      }
    } else if (direction === "exit") {
      // --- EXIT LOGIC ---
      if (session && (session.status === "GATE_IN" || session.status === "LOADING")) {
        // Allow exit
        session = await prisma.loadSession.update({
          where: { id: session.id },
          data: { status: "GATE_OUT", gateOutAt: now },
        });
        transition = "GATE_OUT";
      } else if (session && session.status === "GATE_OUT") {
        // Already out
        return NextResponse.json(
          {
            valid: true,
            driver: {
              id: driver.id,
              name: driver.name,
              driverCode: driver.driverCode,
              vehicle: {
                id: order.vehicle?.id ?? null,
                licensePlate: order.vehicle?.licensePlate ?? "",
              },
            },
            loadSession: session,
            reason: "Already Gate Out",
            message: "Kendaraan sudah Gate Out sebelumnya.",
          },
          { status: 200 },
        );
      } else {
        // Not ready for exit (e.g. SCHEDULED or no session)
        return NextResponse.json(
          {
            valid: false,
            driver: null,
            loadSession: session,
            reason: "Invalid Flow",
            message: "Kendaraan belum melakukan Gate In.",
          },
          { status: 200 },
        );
      }
    }

    // --------------------------
    // OPEN THE ESP32 GATE
    // --------------------------
    // Fire-and-forget to prevent blocking if ESP32 is offline
    openGate(direction).catch((err) => {
      console.warn(`[ESP32] Failed to open ${direction} gate (non-blocking):`, err.message);
    });

    // --------------------------
    // RETURN TO UI
    // --------------------------
    const message =
      transition === "GATE_OUT"
        ? "Gate out approved. Lanjut keluar."
        : "Gate entry approved. Lanjut ke proses berikutnya (set LOADING sebelum Gate Out).";

    return NextResponse.json(
      {
        valid: true,
        driver: {
          id: driver.id,
          name: driver.name,
          driverCode: driver.driverCode,
          vehicle: {
            id: order.vehicle?.id ?? null,
            licensePlate: order.vehicle?.licensePlate ?? "",
          },
        },
        order: {
          id: order.id,
          spNumber: order.spNumber,
          product: order.product,
          plannedLiters: Number(order.plannedLiters ?? 0),
        },
        loadSession: {
          id: session.id,
          status: session.status,
          gateInAt: session.gateInAt,
          gateOutAt: session.gateOutAt ?? null,
        },
        reason: null,
        message,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[qr] validate-qr error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[qr] Error details:", errorMsg);

    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "QR validation failed",
        message: `Error: ${errorMsg}`,
      },
      { status: 200 },
    );
  }
}
