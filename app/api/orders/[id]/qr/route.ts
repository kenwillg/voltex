import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Missing order id" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { driver: true },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Order not found" },
      { status: 404 },
    );
  }

  if (!order.driverId || !order.driver) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Order has no assigned driver" },
      { status: 400 },
    );
  }

  // Format: VOLTEX|SPA|<SPA_NUMBER>|<DRIVER_ID>
  const qr = `VOLTEX|SPA|${order.spNumber}|${order.driverId}`;

  return NextResponse.json(
    {
      ok: true,
      qr,
      meta: {
        spNumber: order.spNumber,
        driverId: order.driverId,
        driverName: order.driver.name,
      },
    },
    { status: 200 },
  );
}
