"use client";

import { useEffect, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Fuel, Hash, Plus } from "lucide-react";

export interface BayPayload {
  name: string;
  product?: string;
  family?: string;
  description?: string;
  capacityLiters?: number;
  isActive?: boolean;
}

interface BayFormProps {
  bay?: { id: string } & BayPayload;
  onSubmit: (payload: BayPayload, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

export default function BayForm({ bay, onSubmit, renderTrigger }: BayFormProps) {
  const { isOpen, open, close } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    product: "",
    family: "",
    description: "",
    capacityKl: "",
    isActive: true,
  });

  useEffect(() => {
    if (bay) {
      setFormData({
        name: bay.name || "",
        product: bay.product || "",
        family: bay.family || "",
        description: bay.description || "",
        capacityKl: bay.capacityLiters ? String(bay.capacityLiters / 1000) : "",
        isActive: bay.isActive ?? true,
      });
    } else {
      setFormData({ name: "", product: "", family: "", description: "", capacityKl: "", isActive: true });
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

  useEffect(() => {
    if (!isOpen) return;
    if (!formData.product && products.length) {
      setFormData((prev) => ({ ...prev, product: prev.product || products[0].name }));
    }
  }, [products, isOpen, formData.product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const selectedProduct = formData.product || products[0]?.name;
    const payload: BayPayload = {
      name: formData.name,
      product: selectedProduct || undefined,
      family: formData.family || undefined,
      description: formData.description || undefined,
      capacityLiters: formData.capacityKl ? Math.round(Number(formData.capacityKl) * 1000) : undefined,
      isActive: formData.isActive,
    };

    await onSubmit(payload, bay?.id);
    setIsSubmitting(false);
    close();
    setFormData({ name: "", product: "", family: "", description: "", capacityKl: "", isActive: true });
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
              <label htmlFor="product" className="text-sm font-medium text-foreground">
                Produk Utama
              </label>
              <select
                id="product"
                name="product"
                value={formData.product}
                onChange={(e) => handleChange(e as any)}
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
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

          <Card variant="status" className="p-4">
            <p className="text-sm font-medium text-foreground">Satu bay, satu produk</p>
            <p className="text-xs text-muted-foreground">Pilih produk utama untuk bay ini dan masukkan kapasitas total.</p>
          </Card>

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
