// app/api/ocr/validate-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// -------------------
// Configure ESP32 IP
// -------------------
const ESP32_GATE_IP = "192.168.112.78";

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

  try {
    // Expected shape: VOLTEX|DRIVER|<driverId>|<driverCode>
    const parts = qr.split("|");
    if (parts.length !== 4 || parts[0] !== "VOLTEX" || parts[1] !== "DRIVER") {
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

    const [, , driverId, qrDriverCode] = parts;
    console.log("[qr] parsed driverId =", driverId, "code =", qrDriverCode);

    // 1) Find driver and confirm code
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: "Driver not found",
        },
        { status: 200 },
      );
    }

    if (driver.driverCode && driver.driverCode !== qrDriverCode) {
      return NextResponse.json(
        {
          valid: false,
          driver: null,
          loadSession: null,
          reason: `Driver code mismatch (DB: ${driver.driverCode}, QR: ${qrDriverCode})`,
        },
        { status: 200 },
      );
    }

    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    // 2) Get today's order and active loadSession
    const todayOrder = await prisma.order.findFirst({
      where: {
        driverId: driver.id,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        vehicle: true,
        loadSessions: {
          where: { status: { in: ["SCHEDULED", "GATE_IN"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // 3) fallback
    const fallbackOrder = !todayOrder
      ? await prisma.order.findFirst({
          where: { driverId: driver.id },
          include: {
            vehicle: true,
            loadSessions: {
              where: { status: { in: ["SCHEDULED", "GATE_IN"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { scheduledAt: "desc" },
        })
      : null;

    const order = todayOrder ?? fallbackOrder;

    if (!order) {
      return NextResponse.json(
        {
          valid: false,
          driver: {
            id: driver.id,
            name: driver.name,
            driverCode: driver.driverCode,
          },
          loadSession: null,
          reason: "Driver has no orders in the system",
        },
        { status: 200 },
      );
    }

    if (!todayOrder) {
      return NextResponse.json(
        {
          valid: false,
          driver: {
            id: driver.id,
            name: driver.name,
            driverCode: driver.driverCode,
          },
          loadSession: null,
          reason: `Driver has an order (SP ${order.spNumber}) but not scheduled *today*.`,
        },
        { status: 200 },
      );
    }

    // 4) Ensure/load a LoadSession and mark GATE_IN
    const now = new Date();
    let session = order.loadSessions[0] ?? null;

    if (!session) {
      session = await prisma.loadSession.create({
        data: { orderId: order.id, status: "GATE_IN", gateInAt: now },
      });
    } else if (!session.gateInAt) {
      session = await prisma.loadSession.update({
        where: { id: session.id },
        data: { status: "GATE_IN", gateInAt: now },
      });
    } else if (session.status === "SCHEDULED") {
      session = await prisma.loadSession.update({
        where: { id: session.id },
        data: { status: "GATE_IN" },
      });
    }

    // --------------------------
    // 🚧 OPEN THE ESP32 GATE 🚧
    // --------------------------
    openGate(direction);

    // --------------------------
    // RETURN TO UI
    // --------------------------
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
        loadSession: {
          id: session.id,
          status: session.status,
          gateInAt: session.gateInAt,
        },
        reason: null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[qr] validate-qr error:", err);
    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "Exception during validation",
      },
      { status: 200 },
    );
  }
}
