"use client";

import { useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Truck, Hash, Fuel, Factory, Plus } from "lucide-react";

export interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  capacity: string;
  owner: string;
}

interface AddVehicleFormProps {
  onAddVehicle: (vehicle: Vehicle) => void;
}

function AddVehicleForm({ onAddVehicle }: AddVehicleFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    id: "",
    licensePlate: "",
    type: "",
    capacity: "",
    owner: "",
  });

  const generateVehicleId = () => {
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
    return `VH-${randomNum}`;
  };

  const generateDummy = () => {
    const dummy = [
      { licensePlate: "B 5678 DEF", type: "Hino 500", capacity: "16 KL", owner: "PT Voltex Logistics" },
      { licensePlate: "B 9012 GHI", type: "Isuzu Giga", capacity: "14 KL", owner: "PT Energi Sentral" },
      { licensePlate: "B 3456 JKL", type: "Mercedes Axor", capacity: "18 KL", owner: "PT Armada Prima" },
    ];
    const item = dummy[Math.floor(Math.random() * dummy.length)];
    setFormData({
      id: generateVehicleId(),
      licensePlate: item.licensePlate,
      type: item.type,
      capacity: item.capacity,
      owner: item.owner,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Vehicle = {
      id: formData.id || generateVehicleId(),
      licensePlate: formData.licensePlate,
      type: formData.type,
      capacity: formData.capacity,
      owner: formData.owner,
    };
    onAddVehicle(payload);
    setFormData({ id: "", licensePlate: "", type: "", capacity: "", owner: "" });
    close();
  };

  return (
    <>
      <button
        onClick={open}
        className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
      >
        <Plus className="h-4 w-4" /> New Vehicle
      </button>

      <Modal isOpen={isOpen} onClose={close} title="Add Vehicle" size="lg">
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
            <div className="space-y-2">
              <label htmlFor="id" className="text-sm font-medium text-foreground">
                Vehicle ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="id"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="VH-0001"
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
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Hino 500 / Isuzu Giga"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="capacity" className="text-sm font-medium text-foreground">
                Tank Capacity
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="16 KL"
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
                id="owner"
                name="owner"
                value={formData.owner}
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
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Add Vehicle
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddVehicleForm;
