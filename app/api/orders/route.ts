import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

function formatNotes(payload: any) {
  if (!payload?.destinationName && !payload?.destinationAddress && !payload?.destinationCoords) return null;
  return JSON.stringify({
    destinationName: payload.destinationName,
    destinationAddress: payload.destinationAddress,
    destinationCoords: payload.destinationCoords,
  });
}

function parseNotes(notes?: string | null) {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch (error) {
    return {};
  }
}

function formatSpNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "");
  const randomNum = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `SP-${dateStr}${randomNum}`;
}

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      driver: true,
      vehicle: true,
      spbu: true,
      loadSessions: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  const mapped = orders.map((order) => {
    const destination = order.spbu
      ? {
          destinationName: order.spbu.name,
          destinationAddress: order.spbu.address,
          destinationCoords: order.spbu.coords,
        }
      : parseNotes(order.notes ?? undefined);
    const status = order.loadSessions[0]?.status || "SCHEDULED";
    return {
      ...order,
      status,
      destination,
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const payload = await req.json();

  const plannedLiters = typeof payload.plannedLiters === "string"
    ? payload.plannedLiters.replace(/[^0-9.]/g, "")
    : payload.plannedLiters;

  const order = await prisma.order.create({
    data: {
      spNumber: payload.spNumber || formatSpNumber(),
      spbuId: payload.spbuId,
      vehicleId: payload.vehicleId,
      driverId: payload.driverId,
      product: payload.product,
      plannedLiters: new Prisma.Decimal(plannedLiters || 0),
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(),
      notes: formatNotes(payload),
    },
    include: {
      driver: true,
      vehicle: true,
      spbu: true,
    },
  });

  // Always ensure an initial load session is created
  await prisma.loadSession.create({
    data: {
      orderId: order.id,
      status: "SCHEDULED",
    },
  });

  let spaPdfPath: string | null = null;
  try {
    spaPdfPath = await generateAndUploadSpaPdf(order, payload);
  } catch (error) {
    console.error("Failed to generate/upload SPA PDF", error);
  }

  return NextResponse.json({ ...order, spaPdfPath }, { status: 201 });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function generateAndUploadSpaPdf(order: any, payload: any) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const pdfBytes = await buildSpaPdf(order, payload);

  const fileName = `SPA-${order.spNumber}.pdf`;
  const path = `spa/${fileName}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return path;
}

function formatDateId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTimeId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

async function buildSpaPdf(order: any, payload: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const width = page.getWidth();
  let cursorY = 780;

  const headerFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const plannedLiters = Number(order.plannedLiters ?? payload.plannedLiters ?? 0);
  const vehiclePlate = order.vehicle?.licensePlate || payload.vehiclePlate || "-";
  const driverName = order.driver?.name || payload.driverName || "-";
  const transporter = driverName;
  const destinationName = order.spbu?.name || payload.destinationName || "-";
  const destinationAddress = (
    payload.destinationAddress ||
    order.spbu?.address ||
    "-"
  );
  const supplyPoint = "Terminal BBM PT Voltex Logistics";
  const supplyAddress =
    "Jl. Laksamana Malahayati No.42, RW 03, Pondok Kelapa, Duren Sawit, Jakarta Timur, DKI Jakarta, 13450, Indonesia";
  const scheduledDate = order.scheduledAt ? new Date(order.scheduledAt) : new Date();

  const logoPath = path.join(process.cwd(), "public", "voltex-logo-dark.png");
  let logoImage = null;
  try {
    const logoBytes = await fs.readFile(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.warn("Logo not found or failed to load", error);
  }

  const drawText = (
    text: string,
    opts: { x?: number; y?: number; size?: number; font?: any; color?: any } = {},
  ) => {
    const { x = 60, y = cursorY, size = 12, font = bodyFont, color = rgb(0, 0, 0) } = opts;
    page.drawText(text, { x, y, size, font, color });
  };

  const drawWrapped = (
    text: string,
    opts: { x?: number; y?: number; size?: number; font?: any; color?: any; maxWidth?: number; lineHeight?: number } = {},
  ) => {
    const { x = 60, y = cursorY, size = 12, font = bodyFont, color = rgb(0, 0, 0), maxWidth = width - 120, lineHeight = 16 } = opts;
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, size);
      if (candidateWidth > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);

    lines.forEach((line, idx) => {
      page.drawText(line, { x, y: y - idx * lineHeight, size, font, color });
    });

    return y - lines.length * lineHeight;
  };

  const wrapText = (text: string, maxWidth: number, size = 11) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = bodyFont.widthOfTextAtSize(candidate, size);
      if (candidateWidth > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });

    if (current) lines.push(current);
    return lines;
  };

  const drawFieldRow = (label: string, value: string) => {
    const size = 11;
    const lineHeight = 14;
    const labelX = 60;
    const colonX = 195;
    const valueX = 210;
    const maxWidth = width - valueX - 40;

    const segments = value.split("\n").flatMap((part) => wrapText(part, maxWidth, size));

    segments.forEach((line, idx) => {
      const y = cursorY - idx * lineHeight;
      if (idx === 0) {
        drawText(label, { x: labelX, y, size });
        drawText(":", { x: colonX, y, size });
      }
      drawText(line, { x: valueX, y, size });
    });

    cursorY -= Math.max(segments.length, 1) * lineHeight;
  };

  const formatDateFullId = (date: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  const formatTimeDots = (date: Date) => formatTimeId(date).replace(/:/g, ".");

  if (logoImage) {
    const desiredWidth = 120;
    const scale = desiredWidth / logoImage.width;
    const logoDims = { width: desiredWidth, height: logoImage.height * scale };
    page.drawImage(logoImage, {
      x: width - logoDims.width - 32,
      y: page.getHeight() - logoDims.height - 32,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  drawText("SURAT PERINTAH ANGKUT BBM", { x: 60, y: cursorY, size: 15, font: headerFont });
  cursorY -= 20;
  drawText(`No. SPA: ${order.spNumber}`, { x: 60, y: cursorY, size: 12, font: headerFont });
  cursorY -= 26;

  drawText("Kepada:", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 14;
  drawText(driverName, { x: 60, y: cursorY, size: 11 });
  cursorY -= 20;

  drawText("Perintah:", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 14;
  cursorY = drawWrapped(
    "Harap Saudara melaksanakan pengangkutan BBM dengan rincian berikut.",
    { x: 60, y: cursorY, maxWidth: width - 80, lineHeight: 14, size: 11 },
  ) - 14;

  drawText("Detail Pengambilan", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 15;
  drawFieldRow("Tanggal", formatDateFullId(scheduledDate));
  drawFieldRow("Waktu", formatTimeDots(scheduledDate));
  drawFieldRow("Tempat Pengambilan", `${supplyPoint}\n${supplyAddress}`);
  drawFieldRow("Quantity", plannedLiters ? `${Intl.NumberFormat("id-ID").format(plannedLiters)} Liter` : "-");
  drawFieldRow("PO Text", payload.poText || "-");
  cursorY -= 8;

  drawText("Informasi Tujuan", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 15;
  drawFieldRow("SPPBE Tujuan", destinationName);
  drawFieldRow("Alamat Tujuan", destinationAddress);
  cursorY -= 8;

  drawText("Informasi Kendaraan", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 15;
  drawFieldRow("Nama Pengangkut", transporter);
  drawFieldRow("Nomor Mobil", vehiclePlate);
  cursorY -= 8;

  drawText("Keterangan Tambahan", { x: 60, y: cursorY, size: 11, font: headerFont });
  cursorY -= 15;
  drawFieldRow("Status", "Disetujui");
  drawFieldRow(
    "Catatan",
    "SPA ini dicetak melalui sistem SPA Online - Domestic Gas PT Pertamina (Persero).",
  );
  drawFieldRow(
    "Dokumen",
    "Dokumen ini sah meskipun tanpa tanda tangan pejabat berwenang.",
  );
  cursorY -= 6;

  return await pdfDoc.save();
}
