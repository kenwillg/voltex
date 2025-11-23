import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const payload = await req.json();

  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: payload.licensePlate,
      vehicleType: payload.vehicleType || null,
      ownerName: payload.ownerName || null,
      isActive: payload.isActive ?? true,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
