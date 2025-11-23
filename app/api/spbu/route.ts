import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const spbuList = await prisma.spbu.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(spbuList);
}

export async function POST(req: Request) {
  const payload = await req.json();

  const spbu = await prisma.spbu.create({
    data: {
      code: payload.code,
      name: payload.name,
      address: payload.address,
      coords: payload.coords,
      isActive: payload.isActive ?? true,
    },
  });

  return NextResponse.json(spbu, { status: 201 });
}
