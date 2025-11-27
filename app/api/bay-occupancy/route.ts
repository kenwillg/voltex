import { NextRequest, NextResponse } from "next/server";

// Simple in-memory state per slot
type SlotState = {
  present: boolean;
  firstSeen: number | null;
  lastPing: number | null;
};

const SLOT_STATE = new Map<string, SlotState>();

const OCCUPIED_THRESHOLD_MS = 2000; // >2s present → considered "occupied"
const STALE_TIMEOUT_MS = 5000; // if no ping >5s → clear

function computeState(slot: string) {
  const now = Date.now();
  const state = SLOT_STATE.get(slot);
  if (!state) {
    return {
      slot,
      present: false,
      occupied: false,
      firstSeenAt: null,
      lastPingAt: null,
    };
  }

  // auto clear if stale
  if (state.lastPing && now - state.lastPing > STALE_TIMEOUT_MS) {
    SLOT_STATE.delete(slot);
    return {
      slot,
      present: false,
      occupied: false,
      firstSeenAt: null,
      lastPingAt: null,
    };
  }

  const occupied =
    state.present &&
    state.firstSeen != null &&
    now - state.firstSeen >= OCCUPIED_THRESHOLD_MS;

  return {
    slot,
    present: state.present,
    occupied,
    firstSeenAt: state.firstSeen,
    lastPingAt: state.lastPing,
  };
}

export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get("slot") ?? "1A";
  return NextResponse.json(computeState(slot));
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const body = (await req.json().catch(() => ({}))) as any;

  const slot: string =
    body.slot || url.searchParams.get("slot") || "1A";

  const presentParam =
    body.present ?? url.searchParams.get("present") ?? "0";

  const present =
    presentParam === true ||
    presentParam === "true" ||
    presentParam === "1";

  const now = Date.now();
  let state = SLOT_STATE.get(slot);
  if (!state) {
    state = { present: false, firstSeen: null, lastPing: null };
  }

  if (present) {
    if (!state.present) {
      // baru muncul
      state.firstSeen = now;
    }
    state.present = true;
    state.lastPing = now;
  } else {
    // hilang
    state.present = false;
    state.firstSeen = null;
    state.lastPing = now;
  }

  SLOT_STATE.set(slot, state);
  return NextResponse.json(computeState(slot));
}
