"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Fuel, GaugeCircle, Users, Warehouse, Plus } from "lucide-react";
import { InfoCard } from "@/components/ui/card";
import { useStatusContext } from "@/contexts/status-context";
import { StatusManager } from "@/lib/base-component";
import BayForm, { BayPayload, BaySlot } from "@/components/forms/bay-form";

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

  const parseVolume = (value?: string) => {
    if (!value) return 0;
    const numeric = value.replace(/[^\d]/g, "");
    return Number(numeric) || 0;
  };

  const formatVolumeLabel = (value: number) => `${value.toLocaleString("id-ID")} L`;

const getBayName = (slot?: string) => {
  if (!slot) return undefined;
  const match = slot.match(/Bay\s*(\d+)/i);
  return match ? `Bay ${match[1]}` : undefined;
};

type BaySlotConfig = {
  slot: string;
  product: string;
  capacity: number;
};

type BayConfiguration = {
  bay: string;
  family: string;
  description: string;
  capacity: number;
  slots: BaySlotConfig[];
  id?: string;
};

export default function FuelBayPage() {
  const { sessions } = useStatusContext();
  const [bayConfigurations, setBayConfigurations] = useState<BayConfiguration[]>([]);
  const [loadingBays, setLoadingBays] = useState(true);
  const [terminalCapacity, setTerminalCapacity] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const loadBays = async () => {
    setLoadingBays(true);
    try {
      const res = await fetch("/api/bays");
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        setBayConfigurations(
          data.map((bay: any) => ({
            id: bay.id,
            bay: bay.name,
            family: bay.family || "Flexible",
            description: bay.description || "-",
            capacity: bay.capacityLiters || 0,
            slots: Array.isArray(bay.slots)
              ? bay.slots.map((slot: any) => ({
                  slot: slot.slot,
                  product: slot.product,
                  capacity: slot.capacityLiters ?? 0,
                }))
              : [],
          })),
        );
      } else {
        setBayConfigurations(defaultBayConfigs);
      }
    } catch {
      setBayConfigurations(defaultBayConfigs);
    } finally {
      setLoadingBays(false);
    }
  };

  useEffect(() => {
    loadBays();
    (async () => {
      try {
        const termRes = await fetch("/api/terminal");
        const termData = await termRes.json();
        setTerminalCapacity(typeof termData?.capacityLiters === "number" ? termData.capacityLiters : null);
      } catch {
        setTerminalCapacity(null);
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      }
    })();
  }, []);

  const defaultBayConfigs: BayConfiguration[] = [
    {
      bay: "Bay 1",
      family: "Bensin",
      description: "Dedicated gasoline manifold",
      capacity: 24_000,
      slots: [
        { slot: "1A", product: "Pertalite", capacity: 8_000 },
        { slot: "1B", product: "Pertamax", capacity: 8_000 },
        { slot: "1C", product: "Pertamax Turbo", capacity: 8_000 },
      ],
    },
    {
      bay: "Bay 2",
      family: "Diesel / Solar",
      description: "High-flow diesel pumps",
      capacity: 20_000,
      slots: [
        { slot: "2A", product: "Solar", capacity: 10_000 },
        { slot: "2B", product: "Dexlite", capacity: 10_000 },
      ],
    },
    {
      bay: "Bay 3",
      family: "Flexible",
      description: "Backup manifold, configurable per shift",
      capacity: 18_000,
      slots: [
        { slot: "3A", product: "Pertalite", capacity: 9_000 },
        { slot: "3B", product: "Solar", capacity: 9_000 },
      ],
    },
  ];

  const activeSessions = useMemo(
    () =>
      sessions.filter((session) =>
        ["LOADING", "GATE_IN", "SCHEDULED"].includes(session.status),
      ),
    [sessions],
  );

  const highlighted = activeSessions[0] ?? sessions[0];

  const bayUsage = useMemo(() => {
    const base = bayConfigurations.reduce<Record<string, { planned: number; active: number }>>((acc, config) => {
      acc[config.bay] = { planned: 0, active: 0 };
      return acc;
    }, {});

    sessions.forEach((session) => {
      const bayName = getBayName(session.fuel.slot);
      if (!bayName || !base[bayName]) {
        return;
      }
      const planned = parseVolume(session.plannedVolume);
      base[bayName].planned += planned;
      if (session.status === "LOADING") {
        base[bayName].active += planned;
      }
    });

    return base;
  }, [sessions, bayConfigurations]);

  const capacityTotals = useMemo(
    () => {
      const baysCapacity = bayConfigurations.reduce((sum, config) => sum + config.capacity, 0);
      const totalCapacity = terminalCapacity ?? baysCapacity;
      const orderScheduled = orders
        .filter((o) => ["SCHEDULED", "GATE_IN"].includes(o.status ?? o.loadSessions?.[0]?.status ?? ""))
        .reduce((sum, o) => sum + Number(o.plannedLiters ?? 0), 0);
      const orderLoading = orders
        .filter((o) => (o.status ?? o.loadSessions?.[0]?.status ?? "") === "LOADING")
        .reduce((sum, o) => sum + Number(o.plannedLiters ?? 0), 0);

      return { totalCapacity, totalPlannedVolume: orderScheduled, totalLoadingVolume: orderLoading };
    },
    [bayConfigurations, sessions, terminalCapacity, orders],
  );

  const handleSaveBay = async (payload: BayPayload, id?: string) => {
    const slots = payload.slots?.map((slot) => ({
      slot: slot.slot,
      product: slot.product,
      capacityLiters: slot.capacityLiters,
    }));

    if (id) {
      await fetch(`/api/bays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, slots }),
      });
    } else {
      await fetch("/api/bays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, slots }),
      });
    }
    await loadBays();
  };

  const handleDeleteBay = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/bays/${id}`, { method: "DELETE" });
    await loadBays();
  };

  if (!highlighted) {
    const bays = bayConfigurations.length ? bayConfigurations : defaultBayConfigs;
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">Distribution Monitoring</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Fuel Bay Monitoring</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada sesi loading. Tambahkan surat perintah atau konfigurasi bay untuk mulai memantau aktivitas.
          </p>
        </div>

        <InfoCard
          title="Ringkasan Kapasitas"
          description="Kapasitas terminal dan alokasi volume"
          icon={GaugeCircle}
        >
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Metric label="Kapasitas Terminal" value={formatVolumeLabel(capacityTotals.totalCapacity)} />
            <Metric label="Volume Terjadwal" value={formatVolumeLabel(capacityTotals.totalPlannedVolume)} />
            <Metric label="Sedang Mengisi" value={formatVolumeLabel(capacityTotals.totalLoadingVolume)} />
          </div>
        </InfoCard>

        <InfoCard
          title="Fuel Bay Configuration"
          description="Tambahkan bay, kapasitas, dan slot produk"
          icon={Warehouse}
          actions={
            <BayForm
              onSubmit={handleSaveBay}
              renderTrigger={(open) => (
                <button
                  onClick={open}
                  className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
                >
                  <Plus className="h-4 w-4" /> New Bay
                </button>
              )}
            />
          }
        >
          {bays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada sesi aktif. Buat order di halaman Orders untuk melihat daftar loading di sini.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {bays.map((config) => (
                <div key={config.bay} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{config.bay}</p>
                      <p className="text-lg font-semibold text-foreground">{config.family}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {config.slots.length} slot • {formatVolumeLabel(config.capacity)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{config.description}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {config.slots.map((slot) => (
                      <div
                        key={`${config.bay}-${slot.slot}`}
                        className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
                      >
                        <div>
                          <span className="block font-semibold text-foreground">Bay {slot.slot}</span>
                          <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">{slot.product}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatVolumeLabel(slot.capacity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">Fuel Distribution</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Fuel Bay Monitoring</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Semua driver menerima QR & PIN otomatis ketika surat perintah dibuat. Halaman ini hanya menampilkan aktivitas
          pengisian terkini tanpa kontrol manual.
        </p>
      </div>

      <InfoCard
        title="Ringkasan Kapasitas"
        description="Kapasitas terminal dan alokasi volume"
        icon={GaugeCircle}
      >
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <Metric label="Kapasitas Terminal" value={formatVolumeLabel(capacityTotals.totalCapacity)} />
          <Metric label="Volume Terjadwal" value={formatVolumeLabel(capacityTotals.totalPlannedVolume)} />
          <Metric label="Sedang Mengisi" value={formatVolumeLabel(capacityTotals.totalLoadingVolume)} />
        </div>
      </InfoCard>

      <InfoCard
        title="Bay utilization"
        description="Ringkasan sesi antrian, pengisian, dan selesai"
        icon={Users}
        actions={
          <BayForm
            onSubmit={handleSaveBay}
            renderTrigger={(open) => (
              <button
                onClick={open}
                className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" /> New Bay
              </button>
            )}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <Metric label="Sedang Mengisi" value={sessions.filter((s) => s.status === "LOADING").length} />
          <Metric label="Menunggu Bay" value={sessions.filter((s) => ["GATE_IN", "SCHEDULED"].includes(s.status)).length} />
          <Metric label="Selesai Hari Ini" value={sessions.filter((s) => s.status === "GATE_OUT").length} />
        </div>
      </InfoCard>

      <InfoCard
        title="Kapasitas BBM"
        description="Perbandingan kapasitas manifold dengan permintaan hari ini"
        icon={GaugeCircle}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Metric label="Total Kapasitas" value={formatVolumeLabel(capacityTotals.totalCapacity)} />
            <Metric label="Volume Terjadwal" value={formatVolumeLabel(capacityTotals.totalPlannedVolume)} />
            <Metric label="Sedang Mengisi" value={formatVolumeLabel(capacityTotals.totalLoadingVolume)} />
          </div>
          <div className="space-y-4">
            {bayConfigurations.map((config) => {
              const usage = bayUsage[config.bay] ?? { planned: 0, active: 0 };
              const plannedPct = config.capacity ? Math.min(100, Math.round((usage.planned / config.capacity) * 100)) : 0;
              const activePct = config.capacity ? Math.min(100, Math.round((usage.active / config.capacity) * 100)) : 0;
              return (
                <div key={`capacity-${config.bay}`} className="rounded-3xl border border-border/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{config.bay}</p>
                      <p className="text-xs text-muted-foreground">Kapasitas {formatVolumeLabel(config.capacity)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">{formatVolumeLabel(usage.planned)}</p>
                      <span>Terjadwal</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${plannedPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {plannedPct}% terpakai • {formatVolumeLabel(usage.active)} ({activePct}%) sedang berlangsung
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </InfoCard>

      <InfoCard
        title="Bay & product assignment"
        description="Mapping slot fisik terhadap jenis BBM yang tersedia"
        icon={Warehouse}
      >
        {/* <div className="flex items-center justify-between pb-3 text-xs text-muted-foreground">
          <p>Konfigurasi bay dan slot dapat diubah kapan saja.</p>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">CRUD Ready</span>
        </div> */}
        <div className="grid gap-4 md:grid-cols-3">
          {(loadingBays ? defaultBayConfigs : bayConfigurations).map((config) => {
            const usage = bayUsage[config.bay] ?? { planned: 0, active: 0 };
            const plannedPct = config.capacity ? Math.min(100, Math.round((usage.planned / config.capacity) * 100)) : 0;
            return (
              <div key={config.bay} className="rounded-3xl border border-border/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{config.bay}</p>
                    <p className="text-lg font-semibold text-foreground">{config.family}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {config.slots.length} slot • {formatVolumeLabel(config.capacity)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{config.description}</p>
                <div className="mt-3 rounded-2xl border border-dashed border-border/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Terjadwal</p>
                  <p className="text-sm font-semibold text-foreground">{formatVolumeLabel(usage.planned)}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${plannedPct}%` }} />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {config.slots.map((slot) => (
                    <div
                      key={slot.slot}
                      className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2"
                    >
                      <div>
                        <span className="block font-semibold text-foreground">Bay {slot.slot}</span>
                        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">{slot.product}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatVolumeLabel(slot.capacity)}</span>
                    </div>
                  ))}
                </div>
                {config.id && (
                  <div className="mt-3 flex gap-2">
                    <BayForm
                      bay={{
                        id: config.id,
                        name: config.bay,
                        family: config.family,
                        description: config.description,
                        capacityLiters: config.capacity,
                        slots: config.slots.map((s) => ({
                          slot: s.slot,
                          product: s.product,
                          capacityLiters: s.capacity,
                        })) as BaySlot[],
                        isActive: true,
                      }}
                      onSubmit={handleSaveBay}
                      renderTrigger={(open) => (
                        <button
                          onClick={open}
                          className="rounded-lg border border-border/60 px-3 py-1 text-xs text-foreground transition hover:border-primary/60 hover:text-primary"
                        >
                          Edit
                        </button>
                      )}
                    />
                    <button
                      onClick={() => handleDeleteBay(config.id)}
                      className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </InfoCard>

      <InfoCard
        title="Live bay roster"
        description="Monitoring status setiap surat perintah yang aktif"
        icon={Fuel}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">Driver</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Gate In</th>
                <th className="pb-3 pr-4 font-medium">Bay Slot</th>
                <th className="pb-3 pr-4 font-medium">Loading</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.orderId} className="border-t border-border/60 text-sm">
                  <td className="py-3 pr-4 font-semibold text-foreground">{session.orderId}</td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-foreground">{session.driverName}</div>
                    <div className="text-xs text-muted-foreground">{session.licensePlate}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${StatusManager.getStatusBadgeClass(session.status)}`}
                    >
                      {StatusManager.getStatusConfig(session.status).label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatTime(session.gate.entry)}</td>
                  <td className="py-3 pr-4">{session.fuel.slot || "-"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {session.fuel.startedAt ? `${formatTime(session.fuel.startedAt)} - ${formatTime(session.fuel.finishedAt)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>

      <InfoCard
        title="Highlighted session"
        description="Detail lengkap order paling kritis saat ini"
        icon={Clock}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Driver</p>
            <p className="text-xl font-semibold text-foreground">{highlighted.driverName}</p>
            <p className="text-sm text-muted-foreground">{highlighted.licensePlate} · {highlighted.driverId}</p>
            <p className="text-xs text-muted-foreground">{highlighted.driverEmail}</p>
            <p className="text-xs text-muted-foreground">{highlighted.company}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-3xl border border-border/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Produk</p>
              <p className="text-lg font-semibold text-foreground">{highlighted.product}</p>
              <p className="text-xs text-muted-foreground">Planned {highlighted.plannedVolume}</p>
            </div>
            <div className="rounded-3xl border border-border/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${StatusManager.getStatusBadgeClass(highlighted.status)}`}
              >
                {StatusManager.getStatusConfig(highlighted.status).label}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                Gate In {formatTime(highlighted.gate.entry)} · Loading {formatTime(highlighted.fuel.startedAt)} · Selesai {formatTime(highlighted.fuel.finishedAt)}
              </p>
            </div>
          </div>
        </div>
      </InfoCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  const display = typeof value === "number" ? value.toLocaleString("id-ID") : value;
  return (
    <div className="rounded-3xl border border-border/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{display}</p>
    </div>
  );
}
