import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateDriverCode() {
  const randomNum = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `DRV-${randomNum}`;
}

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const payload = await req.json();
  const driverCode = payload.driverCode || generateDriverCode();

  const driver = await prisma.driver.create({
    data: {
      driverCode,
      name: payload.name,
      phone: payload.phone || null,
      licenseId: payload.license || null,
      email: payload.email || null,
      isActive: payload.isActive ?? true,
    },
  });

  return NextResponse.json(driver, { status: 201 });
}
