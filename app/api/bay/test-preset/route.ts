// Test endpoint for ESP32 bay preset - allows testing with manual parameters
// Usage: GET /api/bay/test-preset?sessionId=<UUID>&plannedLiters=<number>
//   or: POST /api/bay/test-preset with JSON body { sessionId, plannedLiters }
import { NextRequest, NextResponse } from "next/server";

const ESP32_BAY_IP = process.env.ESP32_BAY_IP;

async function sendPresetToBay(opts: {
  sessionId: string;
  plannedLiters: number;
}) {
  if (!ESP32_BAY_IP) {
    return { ok: false, error: "ESP32_BAY_IP not configured in environment variables" };
  }

  const url = `http://${ESP32_BAY_IP}/session`;

  try {
    console.log(`[ESP32 BAY TEST] Sending to ${url}:`, { sessionId: opts.sessionId, plannedLiters: opts.plannedLiters });
    
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
    console.log("[ESP32 BAY TEST] POST /session =>", res.status, text);
    return { ok: res.ok, status: res.status, raw: text };
  } catch (err: any) {
    console.error("[ESP32 BAY TEST] Failed to send preset:", err);
    
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

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "TEST-SESSION-123";
  const plannedLitersParam = req.nextUrl.searchParams.get("plannedLiters");
  
  let plannedLiters = 10; // default
  if (plannedLitersParam) {
    const parsed = Number.parseFloat(plannedLitersParam);
    if (!Number.isNaN(parsed) && parsed > 0) {
      plannedLiters = parsed;
    }
  }

  const result = await sendPresetToBay({ sessionId, plannedLiters });

  return NextResponse.json(
    {
      ok: result.ok,
      test: true,
      request: {
        sessionId,
        plannedLiters,
        esp32Url: ESP32_BAY_IP ? `http://${ESP32_BAY_IP}/session` : "Not configured",
      },
      response: result,
      message: result.ok
        ? `Successfully sent preset to ESP32: ${plannedLiters}L for session ${sessionId}`
        : `Failed to send preset: ${result.error || "Unknown error"}`,
    },
    { status: result.ok ? 200 : 500 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = (body.sessionId as string) || "TEST-SESSION-123";
    const plannedLiters = body.plannedLiters 
      ? Number(body.plannedLiters) 
      : 10;

    if (plannedLiters <= 0 || Number.isNaN(plannedLiters)) {
      return NextResponse.json(
        { ok: false, message: "plannedLiters must be a positive number" },
        { status: 400 }
      );
    }

    const result = await sendPresetToBay({ sessionId, plannedLiters });

    return NextResponse.json(
      {
        ok: result.ok,
        test: true,
        request: {
          sessionId,
          plannedLiters,
          esp32Url: ESP32_BAY_IP ? `http://${ESP32_BAY_IP}/session` : "Not configured",
        },
        response: result,
        message: result.ok
          ? `Successfully sent preset to ESP32: ${plannedLiters}L for session ${sessionId}`
          : `Failed to send preset: ${result.error || "Unknown error"}`,
      },
      { status: result.ok ? 200 : 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: `Error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

