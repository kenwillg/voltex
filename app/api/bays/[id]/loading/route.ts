// app/api/bays/[id]/loading/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsPromise =
  | { params: Promise<{ id?: string }> }
  | { params: { id?: string } };

const resolveParams = async (maybePromise: ParamsPromise) => {
  const raw = "params" in maybePromise ? (maybePromise as any).params : undefined;
  return raw && typeof raw.then === "function" ? await raw : raw;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function POST(req: Request, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  const bayId = params?.id;
  if (!bayId) {
    return NextResponse.json(
      { message: "Missing bay id in route" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const event = body?.event as "START" | "STOP" | undefined;
  const litersRaw = body?.liters;
  const liters = litersRaw !== undefined ? Number(litersRaw) : null;

  if (!event || (event !== "START" && event !== "STOP")) {
    return NextResponse.json(
      { message: "Invalid or missing event (START | STOP)" },
      { status: 400 },
    );
  }

  // Ensure bay exists
  const bay = await prisma.bay.findUnique({ where: { id: bayId } });
  if (!bay) {
    return NextResponse.json({ message: "Bay not found" }, { status: 404 });
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  // For START: we expect something like GATE_IN / QUEUED / SCHEDULED at this bay (or unassigned).
  // For STOP: we expect LOADING.
  const statusFilter =
    event === "START"
      ? { in: ["SCHEDULED", "GATE_IN", "QUEUED", "LOADING"] as any }
      : { in: ["LOADING"] as any };

  const session = await prisma.loadSession.findFirst({
    where: {
      bayId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: statusFilter,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      order: true,
      bay: true,
    },
  });

  if (!session) {
    return NextResponse.json(
      {
        message:
          event === "START"
            ? "No active session at this bay to start loading"
            : "No LOADING session at this bay to stop",
      },
      { status: 404 },
    );
  }

  const now = new Date();

  if (event === "START") {
    const updated = await prisma.loadSession.update({
      where: { id: session.id },
      data: {
        status: "LOADING",
        loadingStartAt: session.loadingStartAt ?? now,
        bayId: bayId,
      },
      include: { order: true, bay: true },
    });

    return NextResponse.json(
      {
        message: "Loading started",
        loadSession: updated,
      },
      { status: 200 },
    );
  }

  // STOP
  const updated = await prisma.loadSession.update({
    where: { id: session.id },
    data: {
      status: "FINISHED", // or "GATE_OUT" depending on your flow
      loadingEndAt: now,
      actualLiters:
        liters !== null && Number.isFinite(liters)
          ? liters
          : session.actualLiters, // keep old if null
    },
    include: { order: true, bay: true },
  });

  return NextResponse.json(
    {
      message: "Loading stopped",
      loadSession: updated,
    },
    { status: 200 },
  );
}
