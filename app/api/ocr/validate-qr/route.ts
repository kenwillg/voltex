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
			return NextResponse.json({ valid: false, reason: "Malformed QR payload" }, { status: 200 });
		}

		const [, , spaNumber, qrSessionId] = parts;
		console.log(`[qr] Processing: SPA=${spaNumber}, SessionId=${qrSessionId}`);

		// 1) Locate the Load Session by ID
		const session = await prisma.loadSession.findUnique({
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

		if (!session) {
			return NextResponse.json(
				{ valid: false, reason: `Session ${qrSessionId} not found`, message: "Sesi tidak ditemukan" },
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

	} catch (err) {
		console.error("[qr] Error:", err);
		return NextResponse.json({ valid: false, message: "Server Error" }, { status: 500 });
	}
}