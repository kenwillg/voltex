import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function formatNotes(payload: any) {
  if (!payload?.destinationName && !payload?.destinationAddress && !payload?.destinationCoords) return null;
  return JSON.stringify({
    destinationName: payload.destinationName,
    destinationAddress: payload.destinationAddress,
    destinationCoords: payload.destinationCoords,
  });
}

function parseNotes(notes?: string | null) {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch (error) {
    return {};
  }
}

function formatSpNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "");
  const randomNum = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `SP-${dateStr}${randomNum}`;
}

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      driver: true,
      vehicle: true,
      spbu: true,
      loadSessions: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  const mapped = orders.map((order) => {
    const destination = order.spbu
      ? {
          destinationName: order.spbu.name,
          destinationAddress: order.spbu.address,
          destinationCoords: order.spbu.coords,
        }
      : parseNotes(order.notes ?? undefined);
    const status = order.loadSessions[0]?.status || "SCHEDULED";
    return {
      ...order,
      status,
      destination,
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const payload = await req.json();

  const plannedLiters = typeof payload.plannedLiters === "string"
    ? payload.plannedLiters.replace(/[^0-9.]/g, "")
    : payload.plannedLiters;

  const order = await prisma.order.create({
    data: {
      spNumber: payload.spNumber || formatSpNumber(),
      spbuId: payload.spbuId,
      vehicleId: payload.vehicleId,
      driverId: payload.driverId,
      product: payload.product,
      plannedLiters: new Prisma.Decimal(plannedLiters || 0),
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(),
      notes: formatNotes(payload),
    },
    include: {
      driver: true,
      vehicle: true,
      spbu: true,
    },
  });

  // Always ensure an initial load session is created
  await prisma.loadSession.create({
    data: {
      orderId: order.id,
      status: "SCHEDULED",
    },
  });

  return NextResponse.json(order, { status: 201 });
}
