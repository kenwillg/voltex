import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  const rawCapacity = payload.capacityLiters ?? payload.capacity;
  const capacityLiters = rawCapacity !== undefined && rawCapacity !== null && !Number.isNaN(Number(rawCapacity))
    ? Number(rawCapacity)
    : null;
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        licensePlate: payload.licensePlate,
        vehicleType: payload.vehicleType ?? null,
        capacityLiters,
        ownerName: payload.ownerName ?? null,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(vehicle);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update vehicle" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.vehicle.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete vehicle" }, { status: 400 });
  }
}
