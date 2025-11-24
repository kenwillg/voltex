import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.productType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const payload = await req.json();
  try {
    const product = await prisma.productType.create({
      data: {
        name: payload.name,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create product type" }, { status: 400 });
  }
}
