import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.loadSession.findMany({
    include: {
      order: {
        include: {
          driver: true,
          vehicle: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}
