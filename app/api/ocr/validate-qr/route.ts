import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qr = searchParams.get("qr") ?? "";

  console.log("validate-qr:", qr);

  // TEMP: always invalid
  // Later: decode "<driverId>DRV-XXXX", check driver + driverCode + active load session.
  return NextResponse.json(
    {
      valid: false,
      driver: null,
      loadSession: null,
      reason: "Stub endpoint – implement Prisma lookup",
    },
    { status: 200 }
  );
}
