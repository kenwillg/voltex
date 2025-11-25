// app/api/drivers/[id]/qr/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> }   // ⬅ params is a Promise now
) {
  const { id } = await ctx.params;   // ⬅ unwrap it

  if (!id) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Missing driver id" },
      { status: 400 }
    );
  }

  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver || !driver.driverCode) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Driver not found or driverCode missing" },
      { status: 404 }
    );
  }

  const qr = `VOLTEX|DRIVER|${driver.id}|${driver.driverCode}`;

  return NextResponse.json({ ok: true, qr }, { status: 200 });
}
