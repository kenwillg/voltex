// app/api/drivers/[id]/qr/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const driverId = params.id;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver || !driver.driverCode) {
    return NextResponse.json(
      { ok: false, qr: null, reason: "Driver not found or driverCode missing" },
      { status: 404 },
    );
  }

  const qr = `VOLTEX|DRIVER|${driver.id}|${driver.driverCode}`;

  return NextResponse.json(
    {
      ok: true,
      qr,
      driver: {
        id: driver.id,
        name: driver.name,
        driverCode: driver.driverCode,
      },
    },
    { status: 200 },
  );
}
