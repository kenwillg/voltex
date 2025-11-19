import QRCode from "qrcode";
import { ComponentStatus } from "@/lib/base-component";

export type QrStage = "UNIVERSAL" | "GATE_ENTRY" | "GATE_EXIT" | "FUEL_BAY";

export interface QrPayload {
  order_id: string;
  driver_id: string;
  stage: QrStage;
  status: ComponentStatus;
  issued_at: string;
  token: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
  preview?: string;
}

export interface PinDispatchResult extends EmailResult {
  pin: string;
  expiresAt: number;
}

const QR_DEFAULTS: QRCode.QRCodeToDataURLOptions = {
  type: "image/png",
  width: 360,
  margin: 1,
  errorCorrectionLevel: "H",
  color: {
    dark: "#111111",
    light: "#ffffff",
  },
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function buildQrPayload(
  orderId: string,
  driverId: string,
  stage: QrStage,
  status: ComponentStatus,
): QrPayload {
  return {
    order_id: orderId,
    driver_id: driverId,
    stage,
    status,
    issued_at: new Date().toISOString(),
    token: generateSecureToken(24),
  };
}

export async function generateQrCode(payload: QrPayload): Promise<string> {
  const serialized = JSON.stringify(payload);
  return QRCode.toDataURL(serialized, QR_DEFAULTS);
}

export async function sendQrEmail(
  to: string,
  orderId: string,
  driverName: string,
  qrDataUrl: string,
): Promise<EmailResult> {
  await delay(600);
  return {
    success: true,
    message: `QR for ${orderId} dispatched to ${to}`,
    preview: [
      `To: ${to}`,
      `Subject: Gate QR for ${orderId}`,
      "",
      `Hi ${driverName},`,
      "Use the attached QR for gate entry, exit, and fuel bay validation.",
      "",
      `Data URL: ${qrDataUrl.slice(0, 42)}...`,
    ].join("\n"),
  };
}

export function generateSecureToken(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function generateNumericPin(length = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export async function sendPinEmail(
  to: string,
  driverName: string,
  orderId: string,
  pin: string,
  ttlMs = 5 * 60 * 1000,
): Promise<PinDispatchResult> {
  await delay(500);
  const expiresAt = Date.now() + ttlMs;
  return {
    success: true,
    message: `PIN ${pin} sent to ${to}`,
    preview: [
      `To: ${to}`,
      `Subject: Fuel bay PIN for ${orderId}`,
      "",
      `Hi ${driverName},`,
      `PIN ${pin} is valid for ${Math.round(ttlMs / 60000)} minutes.`,
    ].join("\n"),
    pin,
    expiresAt,
  };
}
