"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { ComponentStatus } from "@/lib/base-component";
import {
  buildQrPayload,
  generateQrCode,
  generateNumericPin,
  QrStage,
  sendPinEmail,
  sendQrEmail,
} from "@/lib/qr-service";

export type ScanStage = "gate-entry" | "gate-exit" | "fuel-bay";

export interface GateInfo {
  entry?: string;
  exit?: string;
}

export interface FuelInfo {
  slot: string;
  pin?: string;
  pinExpiresAt?: number;
  pinVerified?: boolean;
  startedAt?: string;
  finishedAt?: string;
}

export interface QrInfo {
  dataUrl?: string;
  issuedAt?: string;
  stage?: QrStage;
}

export interface DriverSession {
  orderId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  phone: string;
  company: string;
  licensePlate: string;
  product: string;
  plannedVolume: string;
  status: ComponentStatus;
  gate: GateInfo;
  fuel: FuelInfo;
  qr: QrInfo;
  lastEvent?: string;
}

interface ScanResult {
  success: boolean;
  stage: ScanStage;
  message: string;
  payload?: Record<string, string>;
  order?: DriverSession;
}

interface StatusContextValue {
  sessions: DriverSession[];
  getSession: (orderId: string) => DriverSession | undefined;
  generateDriverQr: (orderId: string, stage?: QrStage) => Promise<string>;
  emailDriverQr: (orderId: string, stage?: QrStage) => Promise<{ success: boolean; message: string }>;
  scanQrPayload: (raw: string, stage: ScanStage) => ScanResult;
  requestFuelPin: (orderId: string) => Promise<{ success: boolean; message: string; expiresAt: number }>;
  verifyFuelPin: (orderId: string, candidate: string) => { success: boolean; message: string; order?: DriverSession };
  startFueling: (orderId: string) => DriverSession | undefined;
  finishFueling: (orderId: string) => DriverSession | undefined;
}

const StatusContext = createContext<StatusContextValue | null>(null);

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
};

const initialSessions: DriverSession[] = [];

const formatTime = (dateIso?: string) => {
  if (!dateIso) return "-";
  return new Date(dateIso).toLocaleTimeString("id-ID", TIME_OPTIONS);
};

export function StatusProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<DriverSession[]>(initialSessions);

  const updateSession = useCallback(
    (orderId: string, recipe: (current: DriverSession) => DriverSession): DriverSession | undefined => {
      let snapshot: DriverSession | undefined;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.orderId !== orderId) {
            return session;
          }
          snapshot = recipe(session);
          return snapshot;
        }),
      );
      return snapshot;
    },
    [],
  );

  const getSession = useCallback(
    (orderId: string) => sessions.find((session) => session.orderId === orderId),
    [sessions],
  );

  const markGateEntry = useCallback(
    (orderId: string) => {
      const eventTime = new Date().toISOString();
      return updateSession(orderId, (session) => ({
        ...session,
        status: session.status === "SCHEDULED" ? "GATE_IN" : session.status,
        gate: {
          ...session.gate,
          entry: eventTime,
        },
        lastEvent: `Gate entry recorded at ${formatTime(eventTime)}`,
      }));
    },
    [updateSession],
  );

  const markGateExit = useCallback(
    (orderId: string) => {
      const eventTime = new Date().toISOString();
      return updateSession(orderId, (session) => ({
        ...session,
        status: "FINISHED",
        gate: {
          ...session.gate,
          exit: eventTime,
        },
        fuel: {
          ...session.fuel,
          finishedAt: session.fuel.finishedAt || eventTime,
        },
        lastEvent: `Gate exit recorded at ${formatTime(eventTime)}`,
      }));
    },
    [updateSession],
  );

  const startFueling = useCallback(
    (orderId: string) => {
      const eventTime = new Date().toISOString();
      return updateSession(orderId, (session) => {
        if (!session.fuel.pinVerified) {
          return session;
        }

        return {
          ...session,
          status: "LOADING",
          fuel: {
            ...session.fuel,
            startedAt: session.fuel.startedAt || eventTime,
          },
          lastEvent: `Fuel loading started at ${formatTime(eventTime)}`,
        };
      });
    },
    [updateSession],
  );

  const finishFueling = useCallback(
    (orderId: string) => {
      const eventTime = new Date().toISOString();
      return updateSession(orderId, (session) => ({
        ...session,
        status: "GATE_OUT",
        fuel: {
          ...session.fuel,
          finishedAt: eventTime,
        },
        lastEvent: `Fuel loading finished at ${formatTime(eventTime)}`,
      }));
    },
    [updateSession],
  );

  const generateDriverQr = useCallback(
    async (orderId: string, stage: QrStage = "UNIVERSAL") => {
      const session = getSession(orderId);
      if (!session) {
        throw new Error("Order not found");
      }

      const payload = buildQrPayload(orderId, session.driverId, stage, session.status);
      const dataUrl = await generateQrCode(payload);
      updateSession(orderId, (current) => ({
        ...current,
        qr: {
          dataUrl,
          issuedAt: payload.issued_at,
          stage,
        },
        lastEvent: `QR refreshed (${stage})`,
      }));
      return dataUrl;
    },
    [getSession, updateSession],
  );

  const emailDriverQr = useCallback(
    async (orderId: string, stage: QrStage = "UNIVERSAL") => {
      const session = getSession(orderId);
      if (!session) {
        throw new Error("Order not found");
      }

      const qr = await generateDriverQr(orderId, stage);
      const result = await sendQrEmail(session.driverEmail, orderId, session.driverName, qr);
      return { success: result.success, message: result.message };
    },
    [generateDriverQr, getSession],
  );

  const requestFuelPin = useCallback(
    async (orderId: string) => {
      const session = getSession(orderId);
      if (!session) {
        throw new Error("Order not found");
      }
      const pin = generateNumericPin(6);
      const result = await sendPinEmail(session.driverEmail, session.driverName, orderId, pin);
      updateSession(orderId, (current) => ({
        ...current,
        fuel: {
          ...current.fuel,
          pin,
          pinExpiresAt: result.expiresAt,
          pinVerified: false,
        },
        lastEvent: "PIN dispatched via email",
      }));
      return { success: result.success, message: result.message, expiresAt: result.expiresAt };
    },
    [getSession, updateSession],
  );

  const verifyFuelPin = useCallback(
    (orderId: string, candidate: string) => {
      const session = getSession(orderId);
      if (!session || !session.fuel.pin) {
        return { success: false, message: "PIN not requested yet" };
      }

      if (session.fuel.pinExpiresAt && session.fuel.pinExpiresAt < Date.now()) {
        return { success: false, message: "PIN already expired" };
      }

      if (session.fuel.pin !== candidate) {
        return { success: false, message: "Incorrect PIN" };
      }

      const updated = updateSession(orderId, (current) => ({
        ...current,
        fuel: {
          ...current.fuel,
          pinVerified: true,
        },
        lastEvent: "PIN verified",
      }));

      return { success: true, message: "PIN verified", order: updated };
    },
    [getSession, updateSession],
  );

  const scanQrPayload = useCallback(
    (raw: string, stage: ScanStage): ScanResult => {
      try {
        const payload = JSON.parse(raw);
        const { order_id, driver_id } = payload || {};
        if (!order_id || !driver_id) {
          return { success: false, stage, message: "QR payload missing identifiers" };
        }

        const session = getSession(order_id);
        if (!session) {
          return { success: false, stage, message: "Order is not registered", payload };
        }

        if (session.driverId !== driver_id) {
          return { success: false, stage, message: "Driver ID mismatch", payload };
        }

        let result: DriverSession | undefined;
        let message = "";

        if (stage === "gate-entry") {
          result = markGateEntry(order_id);
          message = "Gate entry approved";
        } else if (stage === "gate-exit") {
          result = markGateExit(order_id);
          message = "Gate exit approved";
        } else {
          if (!session.fuel.pinVerified) {
            return { success: false, stage, message: "Fuel PIN not verified yet", payload, order: session };
          }
          result = startFueling(order_id);
          message = "Fuel bay access granted";
        }

        return {
          success: true,
          stage,
          payload,
          message,
          order: result ?? session,
        };
      } catch {
        return { success: false, stage, message: "Invalid QR payload format" };
      }
    },
    [getSession, markGateEntry, markGateExit, startFueling],
  );

  const value = useMemo<StatusContextValue>(
    () => ({
      sessions,
      getSession,
      generateDriverQr,
      emailDriverQr,
      scanQrPayload,
      requestFuelPin,
      verifyFuelPin,
      startFueling,
      finishFueling,
    }),
    [
      sessions,
      getSession,
      generateDriverQr,
      emailDriverQr,
      scanQrPayload,
      requestFuelPin,
      verifyFuelPin,
      startFueling,
      finishFueling,
    ],
  );

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useStatusContext() {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatusContext must be used inside StatusProvider");
  }
  return context;
}
