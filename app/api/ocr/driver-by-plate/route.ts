// app/api/ocr/driver-by-plate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const plate = req.nextUrl.searchParams.get('plate') ?? '';
  console.log('driver-by-plate lookup:', plate);

  // For now just echo back a fake driver so OCR flow doesn't fail.
  // Later you can wire this to your real DB / Prisma.
  if (!plate) {
    return NextResponse.json(
      { driver: null, loadSession: null },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      driver: {
        id: 'dummy-driver-id',
        name: 'Demo Driver',
        driverCode: 'DRV-DEMO',
        vehicle: {
          id: 'dummy-vehicle-id',
          licensePlate: plate,
        },
      },
      loadSession: null,
    },
    { status: 200 },
  );
}
