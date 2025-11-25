import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePlate(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// B1067NBF -> "B 1067 NBF"
function normalizedToPretty(normalized: string): string {
  const m = normalized.match(/^([A-Z]+)(\d+)([A-Z]+)?$/);
  if (!m) return normalized; // fallback, just return as-is

  const [, prefix, digits, suffix] = m;
  return suffix ? `${prefix} ${digits} ${suffix}` : `${prefix} ${digits}`;
}

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

export async function GET(req: NextRequest) {
  const rawPlate = req.nextUrl.searchParams.get("plate") ?? "";
  console.log("driver-by-plate lookup (raw):", rawPlate);

  const plateNorm = normalizePlate(rawPlate);
  console.log("driver-by-plate lookup (normalized):", plateNorm);

  if (!plateNorm) {
    return NextResponse.json(
      {
        driver: null,
        loadSession: null,
        message: "No plate detected",
      },
      { status: 200 },
    );
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  // ---------- FAST PATH: strict match on formatted plate ----------
  const prettyPlate = normalizedToPretty(plateNorm);

  let matchedOrder =
    await prisma.order.findFirst({
      where: {
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        vehicle: {
          licensePlate: {
            equals: prettyPlate,
          },
        },
      },
      include: {
        driver: true,
        vehicle: true,
        loadSessions: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

  // ---------- FALLBACK: fuzzy JS match over today's orders ----------
  if (!matchedOrder) {
    console.log(
      "[driver-by-plate] strict match failed, falling back to fuzzy scan...",
    );

    const todaysOrders = await prisma.order.findMany({
      where: {
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        driver: true,
        vehicle: true,
        loadSessions: true,
      },
    });

    let fuzzyMatch: (typeof todaysOrders)[number] | null = null;

    for (const order of todaysOrders) {
      const dbPlateNorm = normalizePlate(order.vehicle?.licensePlate);
      if (!dbPlateNorm) continue;

      // exact normalized match
      if (dbPlateNorm === plateNorm) {
        fuzzyMatch = order;
        break;
      }

      // soft match if OCR misses/extra chars
      if (
        !fuzzyMatch &&
        (dbPlateNorm.startsWith(plateNorm) ||
          plateNorm.startsWith(dbPlateNorm))
      ) {
        fuzzyMatch = order;
        // don't break; we still want to allow an exact match later in the loop
      }
    }

    matchedOrder = fuzzyMatch;
  }

  // ---------- No match at all ----------
  if (!matchedOrder) {
    return NextResponse.json(
      {
        driver: null,
        loadSession: null,
        message: `Unscheduled / unknown vehicle: ${plateNorm}`,
      },
      { status: 200 },
    );
  }

  const { driver, vehicle, loadSessions } = matchedOrder;

  return NextResponse.json(
    {
      driver: driver
        ? {
            id: driver.id,
            name: driver.name,
            driverCode: driver.driverCode,
            vehicle: {
              id: vehicle?.id ?? null,
              licensePlate: vehicle?.licensePlate ?? "",
            },
          }
        : null,
      loadSession: loadSessions[0] ?? null,
      message: driver
        ? `Welcome, ${driver.name}!`
        : `Vehicle ${vehicle?.licensePlate ?? prettyPlate} scheduled for today.`,
    },
    { status: 200 },
  );
}
