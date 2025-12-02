import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
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

  // Ensure SP number uniqueness (retry if conflict)
  const makeOrder = async (spNumber: string) =>
    prisma.order.create({
      data: {
        spNumber,
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

  let order;
  let attempts = 0;
  let spNumber = payload.spNumber || formatSpNumber();

  while (attempts < 3) {
    try {
      order = await makeOrder(spNumber);
      break;
    } catch (err: any) {
      // P2002 = unique constraint
      if (err?.code === "P2002" && err?.meta?.target?.includes("sp_number")) {
        attempts += 1;
        spNumber = formatSpNumber();
        continue;
      }
      throw err;
    }
  }

  if (!order) {
    throw new Error("Failed to create order after retries");
  }

  // Always ensure an initial load session is created
  const loadSession = await prisma.loadSession.create({
    data: {
      orderId: order.id,
      status: "SCHEDULED",
    },
  });

  let spaPdfPath: string | null = null;
  let qrCodePath: string | null = null;
  let pdfBytes: Uint8Array | null = null;

  try {
    const pdfResult = await generateAndUploadSpaPdf(order, payload);
    spaPdfPath = pdfResult.path;
    pdfBytes = pdfResult.pdfBytes;
    qrCodePath = await generateAndUploadQrCode(order, loadSession.id);

    await prisma.order.update({
      where: { id: order.id },
      data: { spaPdfPath, qrCodePath } as any,
    });
  } catch (error) {
    console.error("Failed to generate/upload documents", error);
  }

  // Fire-and-forget Brevo email (best effort)
  dispatchOrderEmail(order, spaPdfPath, pdfBytes, qrCodePath).catch((err) =>
    console.error("Brevo send failed:", err),
  );

  return NextResponse.json({ ...order, spaPdfPath, qrCodePath }, { status: 201 });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
const brevoSenderName = process.env.BREVO_SENDER_NAME || "Voltex Dispatch";

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

  return { path, pdfBytes };
}

async function generateAndUploadQrCode(order: any, sessionId: string) {
  if (!supabaseUrl || !supabaseKey) return null;

  // Format: VOLTEX|SPA|<SPA_NUMBER>|<SESSION_ID>
  const qrContent = `VOLTEX|SPA|${order.spNumber}|${sessionId}`;

  // Generate QR as Buffer
  const qrBuffer = await QRCode.toBuffer(qrContent, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 512,
  });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileName = `QR-${order.spNumber}.png`;
  const path = `qr-spa/${fileName}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(path, qrBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error("Failed to upload QR", error);
    throw error;
  }

  return path;
}

async function dispatchOrderEmail(
  order: any,
  spaPdfPath: string | null,
  pdfBytes: Uint8Array | null,
  qrCodePath: string | null,
) {
  if (!brevoApiKey || !brevoSenderEmail) {
    console.warn("[Brevo] Not configured; skip email dispatch.");
    return;
  }

  const recipientEmail = order?.driver?.email || order?.driverEmail || null;
  if (!recipientEmail) {
    console.warn(`[Brevo] No driver email found for ${order.spNumber}; skip email dispatch.`);
    return;
  }

  // Get the load session for QR generation
  const loadSession = await prisma.loadSession.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
  });

  if (!loadSession) {
    console.warn(`[Brevo] No load session found for ${order.spNumber}; skipping QR in email.`);
    return;
  }

  const qrPayload = `VOLTEX|SPA|${order.spNumber}|${loadSession.id}`;

  // Generate QR code as Buffer for attachment
  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 512,
  });

  const attachments: Array<{ content: string; name: string }> = [];

  // Attach PDF if available
  if (pdfBytes) {
    attachments.push({
      content: Buffer.from(pdfBytes).toString("base64"),
      name: `SPA-${order.spNumber}.pdf`,
    });
  }

  // Attach QR code
  if (qrBuffer) {
    attachments.push({
      content: qrBuffer.toString("base64"),
      name: `QR-${order.spNumber}.png`,
    });
  }

  const schedule = order.scheduledAt ? new Date(order.scheduledAt) : new Date();
  const scheduleFormatted = schedule.toLocaleString("id-ID", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const spaLink =
    supabaseUrl && spaPdfPath
      ? `${supabaseUrl}/storage/v1/object/public/documents/${spaPdfPath}`
      : null;
  const qrLink =
    supabaseUrl && qrCodePath
      ? `${supabaseUrl}/storage/v1/object/public/documents/${qrCodePath}`
      : null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Surat Perintah ${order.spNumber}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1e293b; padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .header p { color: #94a3b8; margin: 8px 0 0; font-size: 13px; }
        .content { padding: 40px 32px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f8fafc; padding-bottom: 12px; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 13px; color: #64748b; }
        .value { font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; }
        .alert { background-color: #f8fafc; border-left: 3px solid #3b82f6; padding: 16px; border-radius: 4px; font-size: 13px; line-height: 1.6; color: #475569; }
        .btn-container { margin-top: 8px; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; margin-right: 12px; margin-bottom: 8px; }
        .btn:hover { background-color: #1e293b; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 11px; color: #94a3b8; margin: 4px 0; line-height: 1.5; }
        .footer strong { color: #64748b; font-weight: 600; }
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; margin-top: 0 !important; border-radius: 0 !important; }
          .content { padding: 24px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>Voltex Dispatch</h1>
          <p>Surat Perintah Angkut BBM</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="section">
            <p style="margin: 0; font-size: 15px; color: #0f172a; line-height: 1.6;">
              Yth. <strong>${order.driver?.name ?? "Driver"}</strong>,
            </p>
            <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #475569;">
              Berikut adalah rincian penugasan pengangkutan BBM Anda. Mohon pelajari detail di bawah ini dengan seksama.
            </p>
          </div>

          <!-- Details -->
          <div class="section">
            <div class="section-title">Detail Penugasan</div>
            
            <div class="row">
              <span class="label">Nomor SPA</span>
              <span class="value"> ${order.spNumber}</span>
            </div>
            <div class="row">
              <span class="label">Jadwal Muat</span>
              <span class="value"> ${scheduleFormatted}</span>
            </div>
            <div class="row">
              <span class="label">Kendaraan</span>
              <span class="value"> ${order.vehicle?.licensePlate ?? "-"}</span>
            </div>
            <div class="row">
              <span class="label">Produk</span>
              <span class="value"> ${order.product}</span>
            </div>
            <div class="row">
              <span class="label">Volume Rencana</span>
              <span class="value"> ${Number(order.plannedLiters || 0).toLocaleString("id-ID")} Liter</span>
            </div>
          </div>

          <!-- Instructions -->
          <div class="section">
            <div class="section-title">Instruksi & Catatan</div>
            <div class="alert">
              <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                <li style="margin-bottom: 4px;">Pastikan kelengkapan surat jalan dan kondisi kendaraan sebelum berangkat.</li>
                <li style="margin-bottom: 4px;">Tunjukkan QR Code kepada petugas saat memasuki area terminal/depot.</li>
                <li>Patuhi seluruh prosedur keselamatan (K3) selama proses loading dan unloading.</li>
              </ul>
            </div>
          </div>

          <!-- Attachments -->
          <div class="section" style="margin-bottom: 0;">
            <div class="section-title">Dokumen Lampiran</div>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
              Silakan unduh dokumen digital berikut untuk keperluan administrasi:
            </p>
            <div class="btn-container">
              ${spaLink ? `<a href="${spaLink}" class="btn" target="_blank">Unduh SPA (PDF)</a>` : ''}
              ${qrLink ? `<a href="${qrLink}" class="btn" target="_blank">Unduh QR Code</a>` : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>PT VOLTEX LOGISTICS</strong></p>
          <p>Fuel Distribution Management System</p>
          <p style="margin-top: 12px;">Email ini dibuat secara otomatis oleh sistem. Mohon tidak membalas email ini.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    sender: { email: brevoSenderEmail, name: brevoSenderName },
    to: [{ email: recipientEmail, name: order?.driver?.name || "Driver" }],
    subject: `Surat Perintah ${order.spNumber}`,
    htmlContent,
    textContent: `
VOLTEX Dispatch System - Surat Perintah Angkut BBM

Yth. ${order.driver?.name ?? "Driver"},

Anda diperintahkan untuk melakukan pengangkutan BBM sesuai dengan detail berikut:

DETAIL SURAT PERINTAH
========================
SP Number    : ${order.spNumber}
Driver       : ${order.driver?.name ?? "-"} (${order.driver?.driverCode ?? "-"})
Kendaraan    : ${order.vehicle?.licensePlate ?? "-"}
Produk BBM   : ${order.product}
Volume       : ${Number(order.plannedLiters || 0).toLocaleString("id-ID")} Liter
Jadwal       : ${scheduleFormatted}

INSTRUKSI PENTING
========================
1. Pastikan kendaraan dalam kondisi baik sebelum berangkat
2. Tunjukkan QR Code yang terlampir saat masuk dan keluar gate
3. Ikuti prosedur loading sesuai SOP yang berlaku
4. Hubungi dispatcher jika terdapat kendala atau perubahan

LAMPIRAN DOKUMEN
========================
${spaLink ? `SPA PDF: ${spaLink}\n` : ""}${qrLink ? `QR Code: ${qrLink}\n` : ""}
Dokumen Surat Perintah dan QR Code telah dilampirkan pada email ini.

Selamat bertugas dan hati-hati di jalan!

---
PT VOLTEX LOGISTICS
Automation Fuel Distribution Management System
Email ini dikirim secara otomatis oleh sistem.
      `.trim(),
    attachment: attachments, // Brevo API uses "attachment" not "attachments"
  };

  console.log(`[Brevo] Sending email to ${recipientEmail} for ${order.spNumber}...`);

  // Debug: Check API Key
  if (brevoApiKey) {
    const maskedKey = `${brevoApiKey.substring(0, 4)}...${brevoApiKey.substring(brevoApiKey.length - 4)}`;
    console.log(`[Brevo] Using Key: ${maskedKey} (Length: ${brevoApiKey.length})`);
  } else {
    console.error("[Brevo] API Key is missing or empty!");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Brevo] Failed to send email: ${res.status} ${errText}`);
    throw new Error(`Brevo API error ${res.status}: ${errText}`);
  }

  const result = await res.json();
  console.log(`[Brevo] Email sent successfully. Message ID: ${result.messageId || 'N/A'}`);
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
  drawFieldRow("Jenis BBM", payload.product || order.product || "-");
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
    "SPA ini dicetak melalui sistem SPA Online - Domestic Gas PT Voltex Logistics.",
  );
  drawFieldRow(
    "Dokumen",
    "Dokumen ini sah meskipun tanpa tanda tangan pejabat berwenang.",
  );
  cursorY -= 6;

  return await pdfDoc.save();
}
