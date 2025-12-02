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
		// Expected shape: VOLTEX|SPA|<spaNumber>|<driverCode>
		const parts = qr.split("|");

		// Safety check for malformed QRs
		if (parts.length !== 4 || parts[0] !== "VOLTEX" || parts[1] !== "SPA") {
			return NextResponse.json({ valid: false, reason: "Malformed QR payload" }, { status: 200 });
		}

		const [, , spaNumber, qrDriverCode] = parts; // Renamed qrDriverId to qrDriverCode for clarity
		console.log(`[qr] Processing: SPA=${spaNumber}, DriverCode=${qrDriverCode}`);

		// 1) Locate the Order
		const order = await prisma.order.findUnique({
			where: { spNumber: spaNumber },
			include: {
				driver: true,
				vehicle: true,
				loadSessions: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		});

		if (!order) {
			return NextResponse.json(
				{ valid: false, reason: `SPA ${spaNumber} not found`, message: "Order tidak ditemukan" },
				{ status: 200 }
			);
		}

		if (!order.driver) {
			return NextResponse.json(
				{ valid: false, reason: "No driver assigned", message: "Order belum ada driver" },
				{ status: 200 }
			);
		}

		// ---------------------------------------------------------
		// 🔴 LOGIC FIX (As applied previously)
		// ---------------------------------------------------------
		// Compare order.driver.driverCode vs the QR code
		if (order.driver.driverCode !== qrDriverCode) {
			console.log(`[qr] MISMATCH: Order expects ${order.driver.driverCode}, QR scanned ${qrDriverCode}`);
			return NextResponse.json(
				{
					valid: false,
					reason: `Driver mismatch`,
					message: `QR (${qrDriverCode}) tidak sesuai dengan Order (${order.driver.driverCode})`,
				},
				{ status: 200 }
			);
		}
		// ---------------------------------------------------------

		const driver = order.driver;

		// 3) Handle Session State (Gate In / Gate Out)
		const now = new Date();
		let session = order.loadSessions[0] ?? null;
		let transition: "GATE_IN" | "GATE_OUT" | null = null;

		if (direction === "entry") {
			if (!session) {
				// Create new session
				session = await prisma.loadSession.create({
					data: { orderId: order.id, status: "GATE_IN", gateInAt: now },
				});
				transition = "GATE_IN";
			} else if (session.status === "SCHEDULED") {
				// Update existing
				session = await prisma.loadSession.update({
					where: { id: session.id },
					data: { status: "GATE_IN", gateInAt: now },
				});
				transition = "GATE_IN";
			} else {
				// Already inside
				return NextResponse.json({
					valid: true,
					driver: { name: driver.name, driverCode: driver.driverCode },
					message: `Kendaraan sudah di dalam (Status: ${session.status})`
				}, { status: 200 });
			}
		} else if (direction === "exit") {
			if (!session) return NextResponse.json({ valid: false, message: "Sesi tidak ditemukan" }, { status: 200 });

			if (session.status === "GATE_OUT") {
				return NextResponse.json({
					valid: true,
					driver: { name: driver.name, driverCode: driver.driverCode },
					message: "Kendaraan sudah Gate Out"
				}, { status: 200 });
			}

			if (session.status === "GATE_IN" || session.status === "LOADING") {
				session = await prisma.loadSession.update({
					where: { id: session.id },
					data: { status: "GATE_OUT", gateOutAt: now },
				});
				transition = "GATE_OUT";
			} else {
				return NextResponse.json({ valid: false, message: "Flow invalid (belum gate in)" }, { status: 200 });
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