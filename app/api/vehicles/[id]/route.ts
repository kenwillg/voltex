import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await req.json();
    const rawCapacity = payload.capacityLiters ?? payload.capacity;
    const capacityLiters = rawCapacity !== undefined && rawCapacity !== null && rawCapacity !== "" && !Number.isNaN(Number(rawCapacity))
      ? Number(rawCapacity)
      : null;
    
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        licensePlate: payload.licensePlate,
        vehicleType: payload.vehicleType && payload.vehicleType.trim() !== "" ? payload.vehicleType : null,
        capacityLiters,
        ownerName: payload.ownerName && payload.ownerName.trim() !== "" ? payload.ownerName : null,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Vehicle update error:", error);
    return NextResponse.json({ 
      message: "Failed to update vehicle", 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete vehicle" }, { status: 400 });
  }
}
