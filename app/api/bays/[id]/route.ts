import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsPromise = { params: Promise<{ id?: string }> } | { params: { id?: string } };

const resolveParams = async (maybePromise: ParamsPromise) => {
  // Next.js may pass params as a Promise in app router
  const raw = "params" in maybePromise ? (maybePromise as any).params : undefined;
  return raw && typeof raw.then === "function" ? await raw : raw;
};

export async function GET(_: Request, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  const bay = await prisma.bay.findUnique({ where: { id: params?.id } });
  if (!bay) return NextResponse.json({ message: "Bay not found" }, { status: 404 });
  return NextResponse.json(bay);
}

export async function PUT(req: Request, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  const payload = await req.json();
  const capacityLiters = payload.capacityLiters !== undefined ? Number(payload.capacityLiters) : null;
  const targetId = params?.id || payload.id;

  if (!targetId && !payload.name) {
    return NextResponse.json({ message: "Missing bay identifier" }, { status: 400 });
  }

  try {
    const existing = await prisma.bay.findFirst({
      where: {
        OR: [
          targetId ? { id: targetId } : undefined,
          payload.name ? { name: payload.name } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (!existing) {
      return NextResponse.json({ message: "Bay not found" }, { status: 404 });
    }

    const bay = await prisma.bay.update({
      where: {
        id: existing.id,
      },
      data: {
        name: payload.name,
        family: payload.family || null,
        description: payload.description || null,
        capacityLiters: Number.isFinite(capacityLiters) ? capacityLiters : null,
        slots: payload.slots || null,
        isActive: payload.isActive ?? true,
      },
    });
    return NextResponse.json(bay);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update bay" }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: ParamsPromise) {
  const params = await resolveParams(ctx);
  if (!params?.id) return NextResponse.json({ message: "Missing bay id" }, { status: 400 });

  try {
    await prisma.bay.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete bay" }, { status: 400 });
  }
}
