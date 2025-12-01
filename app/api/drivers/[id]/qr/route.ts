import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      qr: null,
      reason: "Driver QR is deprecated. Generate QR per SPA instead.",
    },
    { status: 410 },
  );
}
