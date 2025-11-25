import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const shifts = await prisma.shift.findMany({
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(shifts);
}

export async function POST(req: Request) {
  const payload = await req.json();

  try {
    const shift = await prisma.shift.create({
      data: {
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create shift" }, { status: 400 });
  }
}
