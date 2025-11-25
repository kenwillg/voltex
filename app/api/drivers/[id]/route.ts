import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) return NextResponse.json({ message: "Driver not found" }, { status: 404 });
  return NextResponse.json(driver);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  try {
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        name: payload.name,
        phone: payload.phone || null,
        email: payload.email || null,
        licenseId: payload.license || null,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update driver" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete driver" }, { status: 400 });
  }
}
