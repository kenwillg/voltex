// app/api/ocr/driver-by-plate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoadStatus } from "@prisma/client";

// --- Helpers ------------------------------------------------------

function normalizePlate(raw: string): string {
  // Strip everything except letters/digits, uppercase
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function getTodayKey() {
  // Just date part YYYY-MM-DD in local server time
  return new Date().toISOString().slice(0, 10);
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Roughly "active" load-session statuses
const ACTIVE_STATUSES: LoadStatus[] = [
  "SCHEDULED",
  "GATE_IN",
  "QUEUED",
  "LOADING",
];

// --- Simple in-memory cache for today’s schedule -------------------

type CachedItem = {
  plateNorm: string;
  orderId: string;
  driverId: string;
  driverName: string;
  driverCode: string | null;
  vehicleId: string;
  licensePlate: string;
  loadSessionId: string | null;
  loadStatus: LoadStatus | null;
};

let cachedDateKey: string | null = null;
let cachedSchedule: CachedItem[] = [];

async function refreshTodaySchedule() {
  const { start, end } = getTodayRange();
  const dateKey = getTodayKey();

  // Load today’s orders with driver + vehicle + loadSessions
  const orders = await prisma.order.findMany({
    where: {
      scheduledAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      driver: true,
      vehicle: true,
      loadSessions: {
        orderBy: { createdAt: "desc" },
        take: 1, // latest session
      },
    },
  });

  cachedSchedule = orders
    .filter((o) => !!o.vehicle)
    .map((o) => {
      const plateNorm = normalizePlate(o.vehicle!.licensePlate);
      const session = o.loadSessions[0] ?? null;

      return {
        plateNorm,
        orderId: o.id,
        driverId: o.driverId,
        driverName: o.driver.name,
        driverCode: o.driver.driverCode,
        vehicleId: o.vehicleId,
        licensePlate: o.vehicle!.licensePlate,
        loadSessionId: session?.id ?? null,
        loadStatus: session?.status ?? null,
      };
    });

  cachedDateKey = dateKey;
  console.log(
    `[ocr] refreshed schedule cache for ${dateKey}, ${cachedSchedule.length} vehicles`,
  );
}

async function getTodaySchedule(): Promise<CachedItem[]> {
  const todayKey = getTodayKey();
  if (cachedDateKey !== todayKey || cachedSchedule.length === 0) {
    await refreshTodaySchedule();
  }
  return cachedSchedule;
}

// Fuzzy-ish match: accept exact match, or missing/extra one char at the end
function platesRoughlyMatch(dbPlateNorm: string, ocrPlateNorm: string): boolean {
  if (dbPlateNorm === ocrPlateNorm) return true;

  // Example: DB = B1067NBF, OCR = B1067NB  (missing F)
  if (
    dbPlateNorm.startsWith(ocrPlateNorm) ||
    ocrPlateNorm.startsWith(dbPlateNorm)
  ) {
    const diff = Math.abs(dbPlateNorm.length - ocrPlateNorm.length);
    if (diff <= 1) return true;
  }

  return false;
}

// --- GET handler --------------------------------------------------

export async function GET(req: NextRequest) {
  const rawPlate = req.nextUrl.searchParams.get("plate") ?? "";
  console.log("driver-by-plate lookup (raw):", rawPlate);

  const plateNorm = normalizePlate(rawPlate);
  if (!plateNorm) {
    return NextResponse.json(
      { driver: null, loadSession: null },
      { status: 200 },
    );
  }

  const schedule = await getTodaySchedule();

  const match = schedule.find((item) =>
    platesRoughlyMatch(item.plateNorm, plateNorm),
  );

  if (!match) {
    console.log(
      `driver-by-plate: no match for OCR "${plateNorm}" among ${schedule.length} vehicles`,
    );
    return NextResponse.json(
      {
        driver: null,
        loadSession: null,
        reason: "No scheduled vehicle for this plate today",
      },
      { status: 200 },
    );
  }

  console.log(
    `driver-by-plate: matched OCR "${plateNorm}" -> "${match.licensePlate}" (order ${match.orderId})`,
  );

  return NextResponse.json(
    {
      driver: {
        id: match.driverId,
        name: match.driverName,
        driverCode: match.driverCode,
        vehicle: {
          id: match.vehicleId,
          licensePlate: match.licensePlate,
        },
      },
      loadSession: match.loadSessionId
        ? {
            id: match.loadSessionId,
            orderId: match.orderId,
            status: match.loadStatus,
          }
        : null,
    },
    { status: 200 },
  );
}
