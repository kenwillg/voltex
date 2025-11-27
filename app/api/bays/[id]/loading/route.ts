// app/api/bays/[id]/loading/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoadStatus } from "@prisma/client";

// Next 16: params bisa berupa Promise, jadi perlu helper
type ParamsPromise =
  | { params: Promise<{ id: string }> }
  | { params: { id: string } };

async function resolveParams(ctx: ParamsPromise) {
  const raw = "params" in ctx ? (ctx as any).params : undefined;
  if (!raw) return undefined;
  // Kalau params itu Promise (dev mode / turbopack)
  if (typeof raw.then === "function") {
    return await raw;
  }
  return raw;
}

async function handleLoadingEvent(req: NextRequest, bayId: string) {
  if (!bayId) {
    return NextResponse.json(
      { message: "Missing bay id in route params" },
      { status: 400 },
    );
  }

  const url = req.nextUrl;
  const body = (await req.json().catch(() => ({}))) as any;

  const rawEvent = (
    body.event ??
    url.searchParams.get("event") ??
    ""
  )
    .toString()
    .toUpperCase();

  if (!["START", "STOP"].includes(rawEvent)) {
    return NextResponse.json(
      { message: "Invalid event, use START or STOP" },
      { status: 400 },
    );
  }

  // hard-coded default slot 1A kalau gak dikirim
  const slot: string =
    body.slot || url.searchParams.get("slot") || "1A";

  const litersRaw = body.liters ?? url.searchParams.get("liters");
  const liters =
    litersRaw !== undefined &&
    litersRaw !== null &&
    litersRaw !== ""
      ? Number(litersRaw)
      : null;

  // 1) Ambil bay
  const bay = await prisma.bay.findUnique({
    where: { id: bayId },
  });

  if (!bay) {
    return NextResponse.json(
      { message: "Bay not found" },
      { status: 404 },
    );
  }

  // 3) Cari loadSession aktif untuk bay ini
  const loadSession = await prisma.loadSession.findFirst({
    where: {
      bayId: bay.id,
      status: {
        in: [
          LoadStatus.SCHEDULED,
          LoadStatus.GATE_IN,
          LoadStatus.QUEUED,
          LoadStatus.LOADING,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!loadSession) {
    return NextResponse.json(
      {
        message:
          "No active loadSession for this bay. Make sure gate-in / assignment is done.",
      },
      { status: 404 },
    );
  }

  const now = new Date();

  // ==========================
  // START LOADING
  // ==========================
  if (rawEvent === "START") {
    const updated = await prisma.loadSession.update({
      where: { id: loadSession.id },
      data: {
        status: LoadStatus.LOADING,
        // jangan overwrite kalau sudah ada
        loadingStartAt: loadSession.loadingStartAt ?? now,
        bayId: bay.id,
      },
      include: {
        order: true,
        bay: true,
      },
    });

    return NextResponse.json({
      ok: true,
      event: "START",
      bayId: bay.id,
      slot,
      sessionId: updated.id,
      status: updated.status,
      loadingStartAt: updated.loadingStartAt,
    });
  }

  // ==========================
  // STOP LOADING
  // ==========================
  const updated = await prisma.loadSession.update({
    where: { id: loadSession.id },
    data: {
      status: LoadStatus.GATE_OUT, // atau LoadStatus.FINISHED kalau mau
      loadingEndAt: now,
      gateOutAt: loadSession.gateOutAt ?? now,
      actualLiters: liters ?? loadSession.actualLiters,
      bayId: bay.id,
    },
    include: {
      order: true,
      bay: true,
    },
  });

  return NextResponse.json({
    ok: true,
    event: "STOP",
    bayId: bay.id,
    slot,
    sessionId: updated.id,
    status: updated.status,
    loadingEndAt: updated.loadingEndAt,
    gateOutAt: updated.gateOutAt,
    actualLiters: updated.actualLiters,
  });
}

// POST untuk ESP32 / program
export async function POST(req: NextRequest, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  return handleLoadingEvent(req, params?.id ?? "");
}

// GET untuk manual test via browser
export async function GET(req: NextRequest, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  return handleLoadingEvent(req, params?.id ?? "");
}
