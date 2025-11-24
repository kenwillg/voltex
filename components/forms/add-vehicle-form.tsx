"use client";

import { useEffect, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Truck, Hash, Fuel, Factory, Plus } from "lucide-react";

export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType?: string;
  capacityLiters?: number;
  ownerName?: string;
}

interface AddVehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (vehicle: Omit<Vehicle, "id">, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

function AddVehicleForm({ vehicle, onSubmit, renderTrigger }: AddVehicleFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "",
    capacityKl: "",
    ownerName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        licensePlate: vehicle.licensePlate || "",
        vehicleType: vehicle.vehicleType || "",
        capacityKl: vehicle.capacityLiters ? String(vehicle.capacityLiters / 1000) : "",
        ownerName: vehicle.ownerName || "",
      });
    }
  }, [vehicle]);

  const generateDummy = () => {
    const dummy = [
      { licensePlate: "B 5678 DEF", vehicleType: "Hino 500", capacityKl: "16", ownerName: "PT Voltex Logistics" },
      { licensePlate: "B 9012 GHI", vehicleType: "Isuzu Giga", capacityKl: "14", ownerName: "PT Energi Sentral" },
      { licensePlate: "B 3456 JKL", vehicleType: "Mercedes Axor", capacityKl: "18", ownerName: "PT Armada Prima" },
    ];
    const item = dummy[Math.floor(Math.random() * dummy.length)];
    setFormData({
      licensePlate: item.licensePlate,
      vehicleType: item.vehicleType,
      capacityKl: item.capacityKl,
      ownerName: item.ownerName,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        licensePlate: formData.licensePlate,
        vehicleType: formData.vehicleType,
        capacityLiters: formData.capacityKl ? Math.round(parseFloat(formData.capacityKl) * 1000) : undefined,
        ownerName: formData.ownerName,
      }, vehicle?.id);
      setFormData({ licensePlate: "", vehicleType: "", capacityKl: "", ownerName: "" });
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
          <Plus className="h-4 w-4" /> New Vehicle
        </button>
      )}

      <Modal isOpen={isOpen} onClose={close} title={vehicle ? "Edit Vehicle" : "Add Vehicle"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="licensePlate" className="text-sm font-medium text-foreground">
                License Plate
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="licensePlate"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="B 1234 ABC"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-foreground">
                Unit Type
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Hino 500 / Isuzu Giga"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="capacity" className="text-sm font-medium text-foreground">
                Tank Capacity (KL)
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="capacityKl"
                  name="capacityKl"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.capacityKl}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="16"
                  required
                />
              </div>
            </div>
          </div>

            <div className="space-y-2">
              <label htmlFor="owner" className="text-sm font-medium text-foreground">
                Fleet Owner
              </label>
              <div className="relative">
                <Factory className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="PT Voltex Logistics"
                  required
                />
            </div>
          </div>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Quick Fill</p>
                <p className="text-xs text-muted-foreground">Auto-populate with sample fleet data</p>
              </div>
              <button
                type="button"
                onClick={generateDummy}
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
              {isSubmitting ? "Saving..." : vehicle ? "Update Vehicle" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddVehicleForm;
