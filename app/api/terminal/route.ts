import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.terminalSetting.findUnique({ where: { id: "default" } });
  return NextResponse.json(settings ?? { id: "default", capacityLiters: null });
}

export async function PUT(req: Request) {
  const payload = await req.json();
  const capacityLiters = payload.capacityLiters !== undefined ? Number(payload.capacityLiters) : null;

  const settings = await prisma.terminalSetting.upsert({
    where: { id: "default" },
    update: { capacityLiters: Number.isFinite(capacityLiters) ? capacityLiters : null },
    create: { id: "default", capacityLiters: Number.isFinite(capacityLiters) ? capacityLiters : null },
  });

  return NextResponse.json(settings);
}
