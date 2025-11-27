"use client";

import { useEffect, useState } from "react";
import { InfoCard, Card } from "@/components/ui/card";
import { Settings, Bell, Shield, Database, Palette, Fuel, Clock, Droplets } from "lucide-react";
import BayForm, { BayPayload } from "@/components/forms/bay-form";

export default function SettingsPage() {
  const [bays, setBays] = useState<
    Array<{
      id: string;
      name: string;
      capacityLiters?: number;
      family?: string;
      description?: string;
      product?: string;
      isActive?: boolean;
    }>
  >([]);
  const [terminalCapacity, setTerminalCapacity] = useState<number | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; startTime: string; endTime: string; isActive: boolean }>>([]);
  const [newProduct, setNewProduct] = useState("");
  const [newShift, setNewShift] = useState({ name: "", startTime: "08:00", endTime: "16:00", isActive: true });
  const [savingTerminal, setSavingTerminal] = useState(false);

  const loadBays = async () => {
    try {
      const res = await fetch("/api/bays");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBays(
          data.map((bay: any) => ({
            id: bay.id,
            name: bay.name,
            capacityLiters: bay.capacityLiters,
            family: bay.family,
            description: bay.description,
            product: bay.product,
            isActive: bay.isActive,
          })),
        );
      }
    } catch {
      setBays([]);
    }
  };

  useEffect(() => {
    loadBays();
    loadTerminal();
    loadProducts();
    loadShifts();
  }, []);

  const handleSaveBay = async (payload: BayPayload, id?: string) => {
    if (id) {
      await fetch(`/api/bays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/bays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await loadBays();
  };

  const handleDeleteBay = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/bays/${id}`, { method: "DELETE" });
    await loadBays();
  };

  const loadTerminal = async () => {
    const res = await fetch("/api/terminal");
    const data = await res.json();
    setTerminalCapacity(typeof data?.capacityLiters === "number" ? data.capacityLiters : null);
  };

  const saveTerminal = async () => {
    setSavingTerminal(true);
    await fetch("/api/terminal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacityLiters: terminalCapacity }),
    });
    setSavingTerminal(false);
  };

  const loadProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (Array.isArray(data)) {
      setProducts(data.map((p: any) => ({ id: p.id ?? p.name, name: p.name })));
    }
  };

  const addProduct = async () => {
    if (!newProduct.trim()) return;
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProduct.trim() }),
    });
    setNewProduct("");
    await loadProducts();
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  };

  const loadShifts = async () => {
    const res = await fetch("/api/shifts");
    const data = await res.json();
    if (Array.isArray(data)) {
      setShifts(
        data.map((s: any) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
        })),
      );
    }
  };

  const addShift = async () => {
    if (!newShift.name.trim()) return;
    await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newShift.name,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        isActive: newShift.isActive,
      }),
    });
    setNewShift({ name: "", startTime: "08:00", endTime: "16:00", isActive: true });
    await loadShifts();
  };

  const deleteShift = async (id: string) => {
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    await loadShifts();
  };

  const settingsSections = [
    {
      title: "Notifications",
      description: "Alert preferences and delivery methods",
      icon: Bell,
      items: [
        "Email notifications",
        "SMS alerts for delays",
        "Dashboard notifications",
        "Report delivery schedule"
      ]
    },
    {
      title: "Security & Access",
      description: "User management and permissions",
      icon: Shield,
      items: [
        "User roles and permissions",
        "Password policies",
        "Session management",
        "Audit log settings"
      ]
    },
    {
      title: "Data Management",
      description: "Backup and data retention policies",
      icon: Database,
      items: [
        "Automatic backup schedule",
        "Data retention period",
        "Export preferences",
        "Archive management"
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure system preferences and manage settings</p>
      </div>

      <InfoCard
        title="Fuel Bay Configuration"
        description="Tambahkan bay, kapasitas total, dan produk utama"
        icon={Fuel}
        actions={<BayForm onSubmit={handleSaveBay} />}
      >
        <div className="space-y-2 text-sm">
          {bays.length === 0 && <p className="text-muted-foreground">Belum ada bay. Tambahkan melalui tombol di atas.</p>}
          {bays.map((bay) => (
            <div key={bay.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-2">
              <div>
                <p className="font-semibold text-foreground">{bay.name}</p>
                <p className="text-xs text-muted-foreground">
                  Kapasitas {bay.capacityLiters ? `${bay.capacityLiters / 1000} KL` : "-"} • Produk {bay.product || "-"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <BayForm
                  bay={{ id: bay.id, name: bay.name, capacityLiters: bay.capacityLiters, product: bay.product }}
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
                  onClick={() => handleDeleteBay(bay.id)}
                  className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      <InfoCard
        title="System Configuration"
        description="Core system settings and parameters"
        icon={Settings}
      >
        <div className="space-y-3">
          <Card variant="status" className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-foreground">Terminal capacity settings</p>
              <p className="text-xs text-muted-foreground">Total kapasitas manifold terminal</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1000"
                value={terminalCapacity ?? ""}
                onChange={(e) => setTerminalCapacity(Number(e.target.value))}
                className="w-28 rounded-xl border border-border/60 bg-background/60 px-3 py-1 text-sm"
                placeholder="30000"
              />
              <span className="text-xs text-muted-foreground">Liter</span>
              <button
                onClick={saveTerminal}
                className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-60"
                disabled={savingTerminal}
              >
                {savingTerminal ? "Saving..." : "Save"}
              </button>
            </div>
          </Card>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Loading bay configuration</p>
                <p className="text-xs text-muted-foreground">Kelola bay, kapasitas, dan produk utama</p>
              </div>
              <BayForm onSubmit={handleSaveBay} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {bays.map((bay) => (
                <div key={bay.id} className="rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{bay.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Kapasitas {bay.capacityLiters ? `${bay.capacityLiters / 1000} KL` : "-"} • Produk {bay.product || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BayForm
                        bay={{
                          id: bay.id,
                          name: bay.name,
                          capacityLiters: bay.capacityLiters,
                          family: bay.family,
                          description: bay.description,
                          product: bay.product,
                          isActive: bay.isActive,
                        }}
                        onSubmit={handleSaveBay}
                        renderTrigger={(open) => (
                          <button
                            onClick={open}
                            className="rounded-lg border border-border/60 px-3 py-1 text-xs text-foreground transition hover:border-primary/60 hover:text-primary"
                          >
                            Configure
                          </button>
                        )}
                      />
                      <button
                        onClick={() => handleDeleteBay(bay.id)}
                        className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {bays.length === 0 && <p className="text-xs text-muted-foreground">Belum ada bay.</p>}
            </div>
          </Card>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Operating hours and shifts</p>
                <p className="text-xs text-muted-foreground">Atur shift operasional</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{shift.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {shift.startTime} - {shift.endTime} {shift.isActive ? "(Active)" : "(Inactive)"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteShift(shift.id)}
                    className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Shift name"
                  value={newShift.name}
                  onChange={(e) => setNewShift((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                />
                <button
                  onClick={addShift}
                  className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                >
                  Add Shift
                </button>
              </div>
            </div>
          </Card>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Product type management</p>
                <p className="text-xs text-muted-foreground">Kelola daftar BBM</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {products.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-foreground"
                >
                  {p.name}
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    ×
                  </button>
                </span>
              ))}
              {products.length === 0 && <p className="text-xs text-muted-foreground">Belum ada produk.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Nama produk BBM"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="flex-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
              />
              <button
                onClick={addProduct}
                className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
              >
                Add
              </button>
            </div>
          </Card>
        </div>
      </InfoCard>

      <InfoCard
        title="Appearance"
        description="Customize the look and feel of your dashboard"
        icon={Palette}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="status" className="cursor-pointer hover:border-primary/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Dark Theme</p>
                <p className="text-xs text-muted-foreground">Current active theme</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-primary"></div>
            </div>
          </Card>
          <Card variant="status" className="cursor-pointer hover:border-primary/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Light Theme</p>
                <p className="text-xs text-muted-foreground">Switch to light mode</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-border"></div>
            </div>
          </Card>
        </div>
      </InfoCard>
    </div>
  );
}
