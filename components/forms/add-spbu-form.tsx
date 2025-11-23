"use client";

import { useEffect, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, Building2, Plus } from "lucide-react";

export interface Spbu {
  id: string;
  code: string;
  name: string;
  address: string;
  coords: string;
}

export type SpbuInput = Omit<Spbu, "id">;

interface AddSpbuFormProps {
  spbu?: Spbu;
  onSubmit: (spbu: SpbuInput, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

function AddSpbuForm({ spbu, onSubmit, renderTrigger }: AddSpbuFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    coords: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(spbu);

  useEffect(() => {
    if (spbu) {
      setFormData({
        code: spbu.code,
        name: spbu.name,
        address: spbu.address,
        coords: spbu.coords,
      });
    }
  }, [spbu]);

  const sampleSpbu = [
    { code: "34.13102", name: "Lenteng Agung", address: "Jl. Lenteng Agung Raya No. 25, Jakarta Selatan", coords: "-6.336510, 106.820110" },
    { code: "31.17602", name: "Pondok Gede", address: "Jl. Raya Pondok Gede No. 88, Bekasi", coords: "-6.268540, 106.924110" },
    { code: "34.16906", name: "Kalimalang", address: "Jl. Inspeksi Saluran Kalimalang, Bekasi", coords: "-6.250210, 106.941410" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = () => {
    const pick = sampleSpbu[Math.floor(Math.random() * sampleSpbu.length)];
    setFormData({
      code: pick.code,
      name: pick.name,
      address: pick.address,
      coords: pick.coords,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: SpbuInput = {
      code: formData.code,
      name: formData.name,
      address: formData.address,
      coords: formData.coords,
    };

    try {
      await onSubmit(payload, spbu?.id);
      setFormData({ code: "", name: "", address: "", coords: "" });
      close();
    } finally {
      setIsSubmitting(false);
    }
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
          <Plus className="h-4 w-4" /> New SPBU
        </button>
      )}

      <Modal isOpen={isOpen} onClose={close} title={isEdit ? "Ubah SPBU" : "Tambah SPBU"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-foreground">
                Kode SPBU
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="34.17107"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nama SPBU
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="SPBU Cipayung"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-foreground">
              Alamat Lengkap
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              rows={3}
              placeholder="Jl. Raya ..."
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="coords" className="text-sm font-medium text-foreground">
              Koordinat (Lat, Long)
            </label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="coords"
                name="coords"
                value={formData.coords}
                onChange={handleChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="-6.317210, 106.903220"
                required
              />
            </div>
          </div>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Quick Fill</p>
                <p className="text-xs text-muted-foreground">Generate sample SPBU data</p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
              >
                Generate
              </button>
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
              {isEdit ? "Update SPBU" : "Simpan SPBU"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddSpbuForm;
