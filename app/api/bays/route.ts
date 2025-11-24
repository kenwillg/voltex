import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bays = await prisma.bay.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(bays);
}

export async function POST(req: Request) {
  const payload = await req.json();
  const capacityLiters = payload.capacityLiters !== undefined ? Number(payload.capacityLiters) : null;

  try {
    const bay = await prisma.bay.create({
      data: {
        name: payload.name,
        family: payload.family || null,
        description: payload.description || null,
        capacityLiters: Number.isFinite(capacityLiters) ? capacityLiters : null,
        slots: payload.slots || null,
        isActive: payload.isActive ?? true,
      },
    });

    return NextResponse.json(bay, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Bay name already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Failed to create bay" }, { status: 400 });
  }
}
