import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoadStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  
  try {
    const body = await req.json().catch(() => ({}));
    const actualLiters = body.actualLiters ? Number(body.actualLiters) : null;

    // Find the session
    const session = await prisma.loadSession.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Load session not found" },
        { status: 404 },
      );
    }

    // Only allow finishing if status is LOADING
    if (session.status !== LoadStatus.LOADING) {
      return NextResponse.json(
        {
          ok: false,
          message: `Cannot finish loading. Current status: ${session.status}. Expected: LOADING`,
        },
        { status: 400 },
      );
    }

    const now = new Date();

    // Update session to FINISHED
    const updated = await prisma.loadSession.update({
      where: { id: session.id },
      data: {
        status: LoadStatus.FINISHED,
        loadingEndAt: session.loadingEndAt ?? now,
        finishedAt: now,
        actualLiters: actualLiters !== null ? actualLiters : session.actualLiters,
      },
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

    return NextResponse.json(
      {
        ok: true,
        sessionId: updated.id,
        status: updated.status,
        actualLiters: updated.actualLiters ? Number(updated.actualLiters) : null,
        finishedAt: updated.finishedAt,
        message: "Loading finished successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[finish] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || "Failed to finish loading",
      },
      { status: 500 },
    );
  }
}

