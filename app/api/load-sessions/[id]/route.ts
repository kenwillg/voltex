import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await prisma.loadSession.findUnique({
    where: { id: params.id },
    include: {
      order: {
        include: {
          driver: true,
          vehicle: true,
        },
      },
      bay: true,
    },
  });

  if (!session) {
    return NextResponse.json({ message: "Load session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

