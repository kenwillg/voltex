import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// -------------------
// Configure ESP32 IP
// -------------------
// Make sure ESP32_GATE_IP is defined in your .env file
const ESP32_GATE_IP = process.env.ESP32_GATE_IP;

// -------------------
// Rate limiting to prevent duplicate scans
// -------------------
const recentScans = new Map<string, number>();
const SCAN_COOLDOWN_MS = 3000;

// helper to open a gate
async function openGate(direction: "entry" | "exit") {
	if (!ESP32_GATE_IP) {
		console.error("[ESP32] configuration error: ESP32_GATE_IP is not defined in environment variables.");
		return;
	}

	try {
		const url = `http://${ESP32_GATE_IP}/gate/open?direction=${direction}`;
		console.log("[ESP32] Send:", url);
		
		// Add a small timeout signal so Next.js doesn't hang if ESP is slow
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), 2000);

		const r = await fetch(url, { signal: controller.signal });
		clearTimeout(id);
		console.log("[ESP32] Response status:", r.status);
	} catch (err) {
		console.error("[ESP32] Failed to open gate:", err);
	}
}

export async function GET(req: NextRequest) {
	const qr = req.nextUrl.searchParams.get("qr") ?? "";
	const direction = (req.nextUrl.searchParams.get("direction") as "entry" | "exit") ?? "entry";

	// ... (Duplicate scan logic remains the same, omitted for brevity) ... 
	// [Paste your existing duplicate check logic here if you want]

	try {
		// Expected shape: VOLTEX|SPA|<spaNumber>|<sessionId>
		const parts = qr.split("|");

		// Safety check for malformed QRs
		if (parts.length !== 4 || parts[0] !== "VOLTEX" || parts[1] !== "SPA") {
			console.error(`[qr] Malformed QR: expected 4 parts, got ${parts.length}, parts=${JSON.stringify(parts)}`);
			return NextResponse.json({ 
				valid: false, 
				reason: "Malformed QR payload", 
				message: "Format QR tidak valid. Format yang benar: VOLTEX|SPA|<SPA_NUMBER>|<SESSION_ID>" 
			}, { status: 200 });
		}

		const [, , spaNumber, qrSessionId] = parts;
		console.log(`[qr] Processing: SPA=${spaNumber}, SessionId=${qrSessionId}`);

		// Validate UUID format (session ID should be a UUID)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const isValidUuid = uuidRegex.test(qrSessionId);
		
		if (!isValidUuid) {
			console.error(`[qr] Invalid session ID format: ${qrSessionId} (expected UUID)`);
			return NextResponse.json({
				valid: false,
				reason: "Invalid session ID format",
				message: `Format session ID tidak valid: "${qrSessionId}". QR code harus berformat: VOLTEX|SPA|<SPA_NUMBER>|<SESSION_UUID>. Pastikan menggunakan QR code yang benar dari sistem.`
			}, { status: 200 });
		}

		// 1) Locate the Load Session by ID
		let session;
		try {
			session = await prisma.loadSession.findUnique({
				where: { id: qrSessionId },
				include: {
					order: {
						include: {
							driver: true,
							vehicle: true,
						},
					},
				},
			});
		} catch (dbError: any) {
			console.error(`[qr] Database error when finding session:`, dbError);
			console.error(`[qr] Error details:`, {
				message: dbError.message,
				code: dbError.code,
				meta: dbError.meta
			});
			return NextResponse.json({
				valid: false,
				reason: "Database error",
				message: `Error saat mencari sesi: ${dbError.message || "Unknown error"}`,
				errorCode: dbError.code
			}, { status: 500 });
		}

		if (!session) {
			console.warn(`[qr] Session not found: ${qrSessionId} for SPA: ${spaNumber}`);
			return NextResponse.json(
				{ 
					valid: false, 
					reason: `Session ${qrSessionId} not found`, 
					message: `Sesi tidak ditemukan untuk session ID: ${qrSessionId}. Pastikan QR code yang digunakan valid dan sesuai dengan order yang benar.` 
				},
				{ status: 200 }
			);
		}

		const order = session.order;

		// 2) Validate that the session's order matches the SPA number from QR
		if (order.spNumber !== spaNumber) {
			console.log(`[qr] MISMATCH: QR SPA=${spaNumber}, Session Order SPA=${order.spNumber}`);
			return NextResponse.json(
				{
					valid: false,
					reason: `SPA mismatch`,
					message: `QR SPA (${spaNumber}) tidak sesuai dengan Sesi (${order.spNumber})`,
				},
				{ status: 200 }
			);
		}

		if (!order.driver) {
			return NextResponse.json(
				{ valid: false, reason: "No driver assigned", message: "Order belum ada driver" },
				{ status: 200 }
			);
		}

		const driver = order.driver;

		// 3) Handle Session State (Gate In / Gate Out)
		const now = new Date();
		let updatedSession = session;
		let transition: "GATE_IN" | "GATE_OUT" | null = null;

		if (direction === "entry") {
			if (session.status === "SCHEDULED") {
				// Update existing session to GATE_IN
				updatedSession = await prisma.loadSession.update({
					where: { id: session.id },
					data: { status: "GATE_IN", gateInAt: now },
					include: {
						order: {
							include: {
								driver: true,
								vehicle: true,
							},
						},
					},
				});
				transition = "GATE_IN";
			} else if (session.status === "GATE_IN" || session.status === "LOADING" || session.status === "LOADING_COMPLETED" || session.status === "GATE_OUT") {
				// Already inside or beyond
				return NextResponse.json({
					valid: true,
					driver: { name: driver.name, driverCode: driver.driverCode },
					message: `Kendaraan sudah di dalam (Status: ${session.status})`
				}, { status: 200 });
			} else {
				return NextResponse.json({ 
					valid: false, 
					message: `Status sesi tidak valid untuk Gate In: ${session.status}` 
				}, { status: 200 });
			}
		} else if (direction === "exit") {
			if (session.status === "GATE_OUT") {
				return NextResponse.json({
					valid: true,
					driver: { name: driver.name, driverCode: driver.driverCode },
					message: "Kendaraan sudah Gate Out"
				}, { status: 200 });
			}

			if (session.status === "GATE_IN" || session.status === "LOADING" || session.status === "LOADING_COMPLETED") {
				updatedSession = await prisma.loadSession.update({
					where: { id: session.id },
					data: { status: "GATE_OUT", gateOutAt: now },
					include: {
						order: {
							include: {
								driver: true,
								vehicle: true,
							},
						},
					},
				});
				transition = "GATE_OUT";
			} else {
				return NextResponse.json({ 
					valid: false, 
					message: `Flow invalid: status sesi ${session.status} tidak memungkinkan Gate Out` 
				}, { status: 200 });
			}
		}

		// 4) Open Gate (Fire and forget)
		// Note: This relies on ESP32_GATE_IP being set in .env
		openGate(direction);

		return NextResponse.json(
			{
				valid: true,
				driver: {
					id: driver.id,
					name: driver.name,
					driverCode: driver.driverCode,
					vehicle: { licensePlate: order.vehicle?.licensePlate ?? "" },
				},
				message: transition === "GATE_OUT" ? "Silakan Jalan" : "Silakan Masuk",
			},
			{ status: 200 }
		);

	} catch (err: any) {
		console.error("[qr] Unexpected error:", err);
		console.error("[qr] Error stack:", err?.stack);
		return NextResponse.json({ 
			valid: false, 
			message: "Server Error",
			reason: err?.message || "Unknown error",
			details: process.env.NODE_ENV === "development" ? err?.stack : undefined
		}, { status: 500 });
	}
}