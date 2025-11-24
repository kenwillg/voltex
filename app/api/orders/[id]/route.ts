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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { driver: true, vehicle: true, spbu: true, loadSessions: true },
  });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  const plannedLiters = typeof payload.plannedLiters === "string"
    ? payload.plannedLiters.replace(/[^0-9.]/g, "")
    : payload.plannedLiters;

  try {
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        spNumber: payload.spNumber,
        spbuId: payload.spbuId,
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        product: payload.product,
        plannedLiters: plannedLiters !== undefined ? new Prisma.Decimal(plannedLiters || 0) : undefined,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
        notes: formatNotes(payload),
      },
      include: { driver: true, vehicle: true, spbu: true },
    });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update order" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.order.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete order" }, { status: 400 });
  }
}
