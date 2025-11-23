"use client";

import { useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { FileText, Truck, User, Fuel, Calendar, Plus, Copy, MapPin, Navigation } from "lucide-react";

interface Order {
  spNumber: string;
  licensePlate: string;
  driverId: string;
  product: string;
  planned: string;
  schedule: string;
  status: string;
  destinationName: string;
  destinationAddress: string;
  destinationCoords: string;
}

interface SelectOption<T = string> {
  value: T;
  label: string;
  meta?: Record<string, string>;
}

interface AddOrderFormProps {
  onAddOrder: (order: Order) => void;
  onRepeatOrder?: (order: Order) => void;
  existingOrder?: Order | null;
  driverOptions: SelectOption[];
  vehicleOptions: SelectOption[];
  spbuOptions: Array<SelectOption & { meta?: { address?: string; coords?: string } }>;
}

function AddOrderForm({ onAddOrder, onRepeatOrder, existingOrder, driverOptions, vehicleOptions, spbuOptions }: AddOrderFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    licensePlate: existingOrder?.licensePlate || vehicleOptions[0]?.value || "",
    driverId: existingOrder?.driverId || driverOptions[0]?.value || "",
    product: existingOrder?.product || "",
    planned: existingOrder?.planned || "",
    destinationName: existingOrder?.destinationName || spbuOptions[0]?.label || "",
    destinationAddress: existingOrder?.destinationAddress || spbuOptions[0]?.meta?.address || "",
    destinationCoords: existingOrder?.destinationCoords || spbuOptions[0]?.meta?.coords || "",
    schedule: "",
    status: "SCHEDULED"
  });

  const generateSpNumber = (): string => {
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `SP-${dateStr}${randomNum}`;
  };

  const generateDummyData = () => {
    const randomDriver = driverOptions[Math.floor(Math.random() * driverOptions.length)];
    const randomVehicle = vehicleOptions[Math.floor(Math.random() * vehicleOptions.length)];
    const randomSpbu = spbuOptions[Math.floor(Math.random() * spbuOptions.length)];
    const products = ["Pertalite", "Pertamax", "Pertamax Turbo", "Solar", "Dexlite"];
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      licensePlate: randomVehicle?.value || "",
      driverId: randomDriver?.value || "",
      product: randomProduct,
      planned: `${(7000 + Math.floor(Math.random() * 2000)).toLocaleString("id-ID")} L`,
      destinationName: randomSpbu?.label || "",
      destinationAddress: randomSpbu?.meta?.address || "",
      destinationCoords: randomSpbu?.meta?.coords || "",
      schedule: tomorrow.toISOString().slice(0, 16),
      status: "SCHEDULED"
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "destinationName") {
      const spbu = spbuOptions.find((option) => option.label === value);
      setFormData((prev) => ({
        ...prev,
        destinationName: value,
        destinationAddress: spbu?.meta?.address || "",
        destinationCoords: spbu?.meta?.coords || ""
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newOrder: Order = {
      spNumber: generateSpNumber(),
      licensePlate: formData.licensePlate,
      driverId: formData.driverId,
      product: formData.product,
      planned: formData.planned,
      schedule: new Date(formData.schedule).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: formData.status,
      destinationName: formData.destinationName,
      destinationAddress: formData.destinationAddress,
      destinationCoords: formData.destinationCoords
    };

    if (existingOrder && onRepeatOrder) {
      onRepeatOrder(newOrder);
    } else {
      onAddOrder(newOrder);
    }
    
    // Reset form
    setFormData({
      licensePlate: vehicleOptions[0]?.value || "",
      driverId: driverOptions[0]?.value || "",
      product: "",
      planned: "",
      destinationName: spbuOptions[0]?.label || "",
      destinationAddress: spbuOptions[0]?.meta?.address || "",
      destinationCoords: spbuOptions[0]?.meta?.coords || "",
      schedule: "",
      status: "SCHEDULED"
    });
    
    close();
  };

  const buttonTitle = existingOrder ? "Repeat Order" : "New Order";
  const modalTitle = existingOrder ? "Repeat Surat Perintah" : "Create New Surat Perintah";
  const ButtonIcon = existingOrder ? Copy : Plus;

  return (
    <>
      <button 
        onClick={() => {
          if (existingOrder) {
            // Pre-fill form with existing order data
            setFormData({
              licensePlate: existingOrder.licensePlate,
              driverId: existingOrder.driverId,
              product: existingOrder.product,
              planned: existingOrder.planned,
              destinationName: existingOrder.destinationName,
              destinationAddress: existingOrder.destinationAddress,
              destinationCoords: existingOrder.destinationCoords,
              schedule: "",
              status: "SCHEDULED"
            });
          }
          open();
        }}
        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
          existingOrder 
            ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <ButtonIcon className="h-4 w-4" /> {buttonTitle}
      </button>

      <Modal isOpen={isOpen} onClose={close} title={modalTitle} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="licensePlate" className="text-sm font-medium text-foreground">
                Pilih Kendaraan
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="licensePlate"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  required
                >
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle.value} value={vehicle.value}>
                      {vehicle.label} ({vehicle.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="driverId" className="text-sm font-medium text-foreground">
                Pilih Driver
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="driverId"
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  required
                >
                  {driverOptions.map((driver) => (
                    <option key={driver.value} value={driver.value}>
                      {driver.label} ({driver.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="destinationName" className="text-sm font-medium text-foreground">
                Tujuan SPBU
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="destinationName"
                  name="destinationName"
                  value={formData.destinationName}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  required
                >
                  {spbuOptions.map((option) => (
                    <option key={option.value ?? option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="destinationCoords" className="text-sm font-medium text-foreground">
                Koordinat (Lat, Long)
              </label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="destinationCoords"
                  name="destinationCoords"
                  value={formData.destinationCoords}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="-6.317210, 106.903220"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="destinationAddress" className="text-sm font-medium text-foreground">
              Alamat Lengkap
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                id="destinationAddress"
                name="destinationAddress"
                value={formData.destinationAddress}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Jl. Raya Cipayung No. 14, Jakarta Timur"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="product" className="text-sm font-medium text-foreground">
                Product Type
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="product"
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  required
                >
                  <option value="">Select Product</option>
                  <option value="Pertalite">Pertalite</option>
                  <option value="Pertamax">Pertamax</option>
                  <option value="Pertamax Turbo">Pertamax Turbo</option>
                  <option value="Solar">Solar</option>
                  <option value="Dexlite">Dexlite</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="planned" className="text-sm font-medium text-foreground">
                Planned Volume
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="planned"
                  name="planned"
                  value={formData.planned}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="8,000 L"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="schedule" className="text-sm font-medium text-foreground">
              Scheduled Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="datetime-local"
                id="schedule"
                name="schedule"
                value={formData.schedule}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          {!existingOrder && (
            <Card variant="status" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Quick Fill</p>
                  <p className="text-xs text-muted-foreground">Generate random order data</p>
                </div>
                <button
                  type="button"
                  onClick={generateDummyData}
                  className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
                >
                  Generate
                </button>
              </div>
            </Card>
          )}

          <div className="flex gap-3 pt-4">
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
              {existingOrder ? "Repeat Order" : "Create Order"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddOrderForm;
