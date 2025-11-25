"use client";

import { useEffect, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Fuel, Hash, Plus, Trash2 } from "lucide-react";

export interface BaySlot {
  slot: string;
  product: string;
  capacityLiters?: number;
}

export interface BayPayload {
  name: string;
  family?: string;
  description?: string;
  capacityLiters?: number;
  slots?: BaySlot[];
  isActive?: boolean;
}

interface BayFormProps {
  bay?: { id: string } & BayPayload;
  onSubmit: (payload: BayPayload, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

const parseSlotsText = (text: string): BaySlot[] => {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [slot, product, capacity] = line.split("|").map((v) => v.trim());
      return {
        slot,
        product,
        capacityLiters: capacity ? Math.round(Number(capacity) * 1000) : undefined,
      };
    })
    .filter((item) => item.slot && item.product);
};

const slotsToText = (slots?: BaySlot[]) => {
  if (!slots?.length) return "";
  return slots
    .map((s) => `${s.slot} | ${s.product} | ${s.capacityLiters ? s.capacityLiters / 1000 : ""}`)
    .join("\n");
};

export default function BayForm({ bay, onSubmit, renderTrigger }: BayFormProps) {
  const { isOpen, open, close } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    family: "",
    description: "",
    capacityKl: "",
    isActive: true,
  });
  const [slots, setSlots] = useState<BaySlot[]>([]);

  useEffect(() => {
    if (bay) {
      setFormData({
        name: bay.name || "",
        family: bay.family || "",
        description: bay.description || "",
        capacityKl: bay.capacityLiters ? String(bay.capacityLiters / 1000) : "",
        isActive: bay.isActive ?? true,
      });
      setSlots(
        bay.slots?.map((s) => ({
          slot: s.slot,
          product: s.product,
          capacityLiters: s.capacityLiters,
        })) || []
      );
    } else {
      setSlots([]);
    }
  }, [bay]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data.map((p: any) => ({ id: p.id ?? p.name, name: p.name })));
        }
      } catch {
        setProducts([]);
      }
    })();
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const updateSlot = (index: number, key: keyof BaySlot, value: string) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === index
          ? {
              ...slot,
              [key]:
                key === "capacityLiters" ? (value ? Math.round(parseFloat(value) * 1000) : undefined) : value,
            }
          : slot
      )
    );
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { slot: "", product: products[0]?.name || "", capacityLiters: undefined }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalSlotCapacity = slots.reduce((sum, slot) => sum + (slot.capacityLiters || 0), 0);
  const capacityLiters = formData.capacityKl ? Math.round(Number(formData.capacityKl) * 1000) : 0;
  const remainingCapacity = capacityLiters - totalSlotCapacity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload: BayPayload = {
      name: formData.name,
      family: formData.family || undefined,
      description: formData.description || undefined,
      capacityLiters: formData.capacityKl ? Math.round(Number(formData.capacityKl) * 1000) : undefined,
      slots: slots.filter((s) => s.slot && s.product),
      isActive: formData.isActive,
    };

    await onSubmit(payload, bay?.id);
    setIsSubmitting(false);
    close();
    setFormData({ name: "", family: "", description: "", capacityKl: "", isActive: true });
    setSlots([]);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <button
          onClick={open}
          className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-4 w-4" /> New Bay
        </button>
      )}

      <Modal isOpen={isOpen} onClose={close} title={bay ? "Edit Fuel Bay" : "Add Fuel Bay"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Bay Name
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Bay 1"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="family" className="text-sm font-medium text-foreground">
                Product Family
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="family"
                  name="family"
                  value={formData.family}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Bensin / Diesel"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="capacityKl" className="text-sm font-medium text-foreground">
                Kapasitas Manifold (KL)
              </label>
              <input
                id="capacityKl"
                name="capacityKl"
                type="number"
                min="0"
                step="0.1"
                value={formData.capacityKl}
                onChange={handleChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Deskripsi
              </label>
              <input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Manifold utama bensin"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Slot & Produk</p>
                <p className="text-xs text-muted-foreground">
                  Tambah slot dengan kapasitas per slot. Sisa kapasitas bay:{" "}
                  <span className={remainingCapacity < 0 ? "text-destructive" : "text-primary"}>
                    {(remainingCapacity / 1000).toFixed(1)} KL
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition"
              >
                <Plus className="h-4 w-4" /> Add slot
              </button>
            </div>
            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={`${slot.slot || "slot"}-${idx}`} className="grid gap-2 rounded-2xl border border-border/60 p-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Slot Name</label>
                    <input
                      type="text"
                      value={slot.slot}
                      onChange={(e) => updateSlot(idx, "slot", e.target.value)}
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      placeholder="1A"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Product</label>
                    <select
                      value={slot.product}
                      onChange={(e) => updateSlot(idx, "product", e.target.value)}
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      required
                    >
                      <option value="">{products.length ? "Pilih produk" : "Loading..."}</option>
                      {(products.length ? products : [{ id: "fallback", name: "Pertalite" }]).map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Kapasitas Slot (KL)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={slot.capacityLiters ? slot.capacityLiters / 1000 : ""}
                        onChange={(e) => updateSlot(idx, "capacityLiters", e.target.value)}
                        className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                        placeholder="8"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="rounded-full border border-destructive/40 p-2 text-destructive hover:bg-destructive/10 transition"
                        aria-label="Remove slot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada slot. Klik "Add slot" untuk menambahkan.</p>
              )}
            </div>
          </div>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Status</p>
                <p className="text-xs text-muted-foreground">Bay aktif dan dapat dijadwalkan</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border border-border/70 text-primary focus:ring-primary/20"
                />
                Aktif
              </label>
            </div>
          </Card>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : bay ? "Update Bay" : "Add Bay"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
