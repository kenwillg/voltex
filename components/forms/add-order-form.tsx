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

interface AddOrderFormProps {
  onAddOrder: (order: Order) => void;
  onRepeatOrder?: (order: Order) => void;
  existingOrder?: Order | null;
}

function AddOrderForm({ onAddOrder, onRepeatOrder, existingOrder }: AddOrderFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    licensePlate: existingOrder?.licensePlate || "",
    driverId: existingOrder?.driverId || "",
    product: existingOrder?.product || "",
    planned: existingOrder?.planned || "",
    destinationName: existingOrder?.destinationName || "",
    destinationAddress: existingOrder?.destinationAddress || "",
    destinationCoords: existingOrder?.destinationCoords || "",
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
    const dummyOrders = [
      { 
        licensePlate: "B 1234 ABC", 
        driverId: "DRV-0145", 
        product: "Pertalite", 
        planned: "8,500 L",
        destinationName: "SPBU 34.13102 - Lenteng Agung",
        destinationAddress: "Jl. Lenteng Agung Raya No. 25, Jakarta Selatan",
        destinationCoords: "-6.336510, 106.820110"
      },
      { 
        licensePlate: "B 5678 DEF", 
        driverId: "DRV-0152", 
        product: "Solar", 
        planned: "7,200 L",
        destinationName: "SPBU 31.17104 - Cakung",
        destinationAddress: "Jl. Raya Bekasi Km 24, Cakung, Jakarta Timur",
        destinationCoords: "-6.192470, 106.939820"
      },
      { 
        licensePlate: "B 9012 GHI", 
        driverId: "DRV-0167", 
        product: "Pertamax", 
        planned: "9,000 L",
        destinationName: "SPBU 34.16906 - Kalimalang",
        destinationAddress: "Jl. Inspeksi Saluran Kalimalang, Bekasi",
        destinationCoords: "-6.250210, 106.941410"
      },
      { 
        licensePlate: "B 3456 JKL", 
        driverId: "DRV-0183", 
        product: "Pertamax Turbo", 
        planned: "6,800 L",
        destinationName: "SPBU 31.17202 - Bambu Apus",
        destinationAddress: "Jl. Bambu Apus Raya No. 3, Jakarta Timur",
        destinationCoords: "-6.301120, 106.894320"
      },
      { 
        licensePlate: "B 7890 MNO", 
        driverId: "DRV-0194", 
        product: "Dexlite", 
        planned: "8,200 L",
        destinationName: "SPBU 34.40723 - BSD City",
        destinationAddress: "Jl. BSD Grand Boulevard, Tangerang",
        destinationCoords: "-6.301710, 106.654980"
      }
    ];
    
    const randomOrder = dummyOrders[Math.floor(Math.random() * dummyOrders.length)];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      licensePlate: randomOrder.licensePlate,
      driverId: randomOrder.driverId,
      product: randomOrder.product,
      planned: randomOrder.planned,
      destinationName: randomOrder.destinationName,
      destinationAddress: randomOrder.destinationAddress,
      destinationCoords: randomOrder.destinationCoords,
      schedule: tomorrow.toISOString().slice(0, 16),
      status: "SCHEDULED"
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
      licensePlate: "",
      driverId: "",
      product: "",
      planned: "",
      destinationName: "",
      destinationAddress: "",
      destinationCoords: "",
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
                License Plate
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="licensePlate"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="B 1234 ABC"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="driverId" className="text-sm font-medium text-foreground">
                Driver ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="driverId"
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="DRV-0XXX"
                  required
                />
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
                <input
                  type="text"
                  id="destinationName"
                  name="destinationName"
                  value={formData.destinationName}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="SPBU 34.17107 - Cipayung"
                  required
                />
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
