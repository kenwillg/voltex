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

export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr") ?? "";
  console.log("validate-qr:", qr);

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

    console.log("[qr] driver from DB =", driver);

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

    // 2) Try to find *today's* order first
    const todayOrder = await prisma.order.findFirst({
      where: {
        driverId: driver.id,
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        vehicle: true,
        loadSessions: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    // 3) If none for today, fall back to latest order (for debugging / safety)
    const fallbackOrder = !todayOrder
      ? await prisma.order.findFirst({
          where: { driverId: driver.id },
          include: {
            vehicle: true,
            loadSessions: true,
          },
          orderBy: { scheduledAt: "desc" },
        })
      : null;

    const order = todayOrder ?? fallbackOrder;

    console.log("[qr] todayOrder =", todayOrder?.id, "fallbackOrder =", fallbackOrder?.id);

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

    // If we fell back to a non-today order, be explicit in reason
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
          reason: `Driver has an order (SP ${order.spNumber}) but not scheduled *today* on the backend. Check timezones / driverId mapping.`,
        },
        { status: 200 },
      );
    }

    const now = new Date();

    // 4) Ensure/load a LoadSession and mark it as GATE_IN
    let session = order.loadSessions[0];

    if (!session) {
      session = await prisma.loadSession.create({
        data: {
          orderId: order.id,
          status: "GATE_IN",
          gateInAt: now,
        },
      });
    } else if (!session.gateInAt) {
      session = await prisma.loadSession.update({
        where: { id: session.id },
        data: {
          status: "GATE_IN",
          gateInAt: now,
        },
      });
    } else if (session.status === "SCHEDULED") {
      session = await prisma.loadSession.update({
        where: { id: session.id },
        data: {
          status: "GATE_IN",
        },
      });
    }

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
