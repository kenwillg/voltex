import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  const spbu = await prisma.spbu.findUnique({
    where: { id: params.id },
  });

  if (!spbu) {
    return NextResponse.json({ error: "SPBU not found" }, { status: 404 });
  }

  return NextResponse.json(spbu);
}

export async function PUT(req: Request, { params }: Params) {
  const payload = await req.json();
  const targetId = params.id || payload.id;

  if (!targetId && !payload.code) {
    return NextResponse.json({ error: "Missing SPBU identifier" }, { status: 400 });
  }

  const spbu = await prisma.spbu.update({
    where: {
      ...(targetId ? { id: targetId } : {}),
      ...(payload.code ? { code: payload.code } : {}),
    },
    data: {
      code: payload.code,
      name: payload.name,
      address: payload.address,
      coords: payload.coords,
      isActive: payload.isActive ?? true,
    },
  });

  return NextResponse.json(spbu);
}

export async function DELETE(_req: Request, { params }: Params) {
  await prisma.spbu.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
