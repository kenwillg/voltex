// app/api/bay/preset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoadStatus } from "@prisma/client";

// ==============================
// ESP32 BAY CONFIG
// ==============================
//
// For now: single bay controller.
// Later you can map session.order.product / bayId → different IPs.
const ESP32_BAY_IP = process.env.ESP32_BAY_IP;

// Helper to push preset to bay controller
async function sendPresetToBay(opts: {
  sessionId: string;
  plannedLiters: number;
}) {
  const url = `http://${ESP32_BAY_IP}/session`;

  try {
    console.log(`[ESP32 BAY] Sending to ${url}:`, { sessionId: opts.sessionId, plannedLiters: opts.plannedLiters });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: opts.sessionId,
        plannedLiters: opts.plannedLiters,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await res.text().catch(() => "");
    console.log("[ESP32 BAY] POST /session =>", res.status, text);
    return { ok: res.ok, status: res.status, raw: text };
  } catch (err: any) {
    console.error("[ESP32 BAY] Failed to send preset:", err);
    
    // More detailed error information
    let errorMsg = String(err);
    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      errorMsg = "Timeout: ESP32 did not respond within 15 seconds. Check if ESP32 is online and accessible.";
    } else if (err.message?.includes("ECONNREFUSED") || err.message?.includes("ENOTFOUND")) {
      errorMsg = `Connection refused: Cannot reach ESP32 at ${url}. Check IP address and network connectivity.`;
    } else if (err.message?.includes("ETIMEDOUT")) {
      errorMsg = "Network timeout: ESP32 is not responding. Check network connection.";
    }
    
    return { ok: false, error: errorMsg, errorType: err.name };
  }
}

// Shared handler for GET/POST
async function handlePreset(req: NextRequest) {
  // sessionId can come from query or JSON body
  const url = req.nextUrl;
  const body = (await req.json().catch(() => ({}))) as any;

  const sessionId =
    (body.sessionId as string) ||
    url.searchParams.get("sessionId") ||
    "";

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, message: "Missing sessionId" },
      { status: 400 },
    );
  }

  // 1) Find loadSession + order
  const session = await prisma.loadSession.findUnique({
    where: { id: sessionId },
    include: {
      order: true,
      bay: true,
    },
  });

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "LoadSession not found" },
      { status: 404 },
    );
  }

  // Only allow GATE_IN status to start filling
  if (session.status !== LoadStatus.GATE_IN) {
    return NextResponse.json(
      {
        ok: false,
        message: `Order status must be GATE_IN to start filling. Current status: ${session.status}`,
      },
      { status: 400 },
    );
  }

  if (!session.order) {
    return NextResponse.json(
      { ok: false, message: "Session has no linked order" },
      { status: 400 },
    );
  }

  // plannedLiters is Decimal(12,2) in Prisma – convert to JS number
  const plannedLiters = session.order.plannedLiters
    ? Number(session.order.plannedLiters)
    : 0;

  if (!plannedLiters || plannedLiters <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Order has no valid plannedLiters",
      },
      { status: 400 },
    );
  }

  // 2) Update status to LOADING when we preset
  const updated = await prisma.loadSession.update({
    where: { id: session.id },
    data: {
      status: LoadStatus.LOADING,
      loadingStartAt: session.loadingStartAt ?? new Date(),
      // bayId stays as-is; you assign bay elsewhere in your flow
    },
    include: {
      order: true,
      bay: true,
    },
  });

  // 3) Push preset to ESP32 bay controller
  const espResult = await sendPresetToBay({
    sessionId: updated.id,
    plannedLiters,
  });

  return NextResponse.json(
    {
      ok: true,
      sessionId: updated.id,
      status: updated.status,
      bay: updated.bay
        ? { id: updated.bay.id, name: updated.bay.name }
        : null,
      order: {
        id: updated.order.id,
        spNumber: updated.order.spNumber,
        product: updated.order.product,
        plannedLiters,
      },
      esp32: espResult,
    },
    { status: 200 },
  );
}

export async function GET(req: NextRequest) {
  return handlePreset(req);
}

export async function POST(req: NextRequest) {
  return handlePreset(req);
}
