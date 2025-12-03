// Connectivity check endpoint for ESP32 bay
// Usage: GET /api/bay/ping
import { NextRequest, NextResponse } from "next/server";

const ESP32_BAY_IP = process.env.ESP32_BAY_IP;

export async function GET(req: NextRequest) {
  if (!ESP32_BAY_IP) {
    return NextResponse.json(
      {
        ok: false,
        message: "ESP32_BAY_IP not configured",
        esp32Url: null,
      },
      { status: 500 }
    );
  }

  const url = `http://${ESP32_BAY_IP}/`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for ping
    
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await res.text().catch(() => "");
    
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      message: res.ok ? "ESP32 is reachable" : "ESP32 responded with error",
      response: text.substring(0, 100), // First 100 chars
      esp32Url: url,
    });
  } catch (err: any) {
    let errorMsg = "Unknown error";
    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      errorMsg = "Timeout: ESP32 did not respond within 5 seconds";
    } else if (err.message?.includes("ECONNREFUSED")) {
      errorMsg = "Connection refused: ESP32 is not accepting connections";
    } else if (err.message?.includes("ENOTFOUND")) {
      errorMsg = "Host not found: Check IP address";
    } else {
      errorMsg = String(err);
    }

    return NextResponse.json({
      ok: false,
      message: errorMsg,
      error: err.message,
      esp32Url: url,
    }, { status: 500 });
  }
}

