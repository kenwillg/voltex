import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function PUT(req: Request, { params }: Params) {
  const payload = await req.json();
  try {
    const product = await prisma.productType.update({
      where: { id: params.id },
      data: {
        name: payload.name,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update product type" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await prisma.productType.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete product type" }, { status: 400 });
  }
}
