import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ message: "Shift not found" }, { status: 404 });
  return NextResponse.json(shift);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  try {
    const shift = await prisma.shift.update({
      where: { id: params.id },
      data: {
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(shift);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update shift" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.shift.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete shift" }, { status: 400 });
  }
}
