// app/api/ocr/validate-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParsedQr = {
  driverId: string;
  driverCode: string;
};

function parseDriverQr(qr: string): ParsedQr | null {
  // Expected format: VOLTEX|DRIVER|<driverId>|<driverCode>
  const parts = qr.split("|");
  if (parts.length !== 4) return null;

  const [prefix, type, driverId, driverCode] = parts;
  if (prefix !== "VOLTEX" || type !== "DRIVER") return null;
  if (!driverId || !driverCode) return null;

  return { driverId, driverCode };
}

export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr") ?? "";
  console.log("validate-qr:", qr);

  if (!qr) {
    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "Missing QR parameter",
      },
      { status: 200 },
    );
  }

  const parsed = parseDriverQr(qr);
  if (!parsed) {
    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "Invalid QR format",
      },
      { status: 200 },
    );
  }

  const { driverId, driverCode } = parsed;

  // --- 1) Verify driver identity from QR ---
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver || !driver.isActive || driver.driverCode !== driverCode) {
    return NextResponse.json(
      {
        valid: false,
        driver: null,
        loadSession: null,
        reason: "Driver not found or driver code mismatch",
      },
      { status: 200 },
    );
  }

  // --- 2) Find today's active order (SP) for this driver ---
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const order = await prisma.order.findFirst({
    where: {
      driverId: driver.id,
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      // If later you want per-order QR, you can add:
      // qrCodeValue: qr,
      // qrExpiresAt: { gt: now },
    },
    include: {
      vehicle: true,
      loadSessions: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

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
        reason: "No active order for this driver today",
      },
      { status: 200 },
    );
  }

  // --- 3) Find an active load session and mark as GATE_IN on first scan ---
  const ACTIVE_STATUSES = ["SCHEDULED", "GATE_IN", "QUEUED", "LOADING"] as const;

  const existingSession =
    order.loadSessions.find((ls) => ACTIVE_STATUSES.includes(ls.status)) ??
    null;

  let updatedSession = existingSession;

  // If session exists and is still SCHEDULED → gate in now
  if (existingSession && existingSession.status === "SCHEDULED") {
    updatedSession = await prisma.loadSession.update({
      where: { id: existingSession.id },
      data: {
        status: "GATE_IN",
        gateInAt: now,
      },
    });
  }

  // If no session exists at all (shouldn't happen if you always create one),
  // you could create it here. Optional:
  if (!updatedSession) {
    updatedSession = await prisma.loadSession.create({
      data: {
        orderId: order.id,
        status: "GATE_IN",
        gateInAt: now,
      },
    });
  }

  // --- 4) Return payload to Python / Gate UI ---
  return NextResponse.json(
    {
      valid: true,
      reason: null,
      driver: {
        id: driver.id,
        name: driver.name,
        driverCode: driver.driverCode,
        vehicle: {
          id: order.vehicle.id,
          licensePlate: order.vehicle.licensePlate,
        },
      },
      loadSession: {
        id: updatedSession.id,
        status: updatedSession.status,
        orderId: updatedSession.orderId,
        gateInAt: updatedSession.gateInAt,
      },
    },
    { status: 200 },
  );
}
