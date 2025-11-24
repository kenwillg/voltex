"use client";

import { useEffect, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { User, Phone, CreditCard, Plus, Mail } from "lucide-react";

interface AddDriverFormProps {
  driver?: {
    id: string;
    name: string;
    phone: string;
    license: string;
    email: string;
    isActive: boolean;
  };
  onSubmit: (driver: {
    name: string;
    phone: string;
    license: string;
    email: string;
    isActive: boolean;
  }, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

function AddDriverForm({ driver, onSubmit, renderTrigger }: AddDriverFormProps) {
  const { isOpen, open, close } = useModal();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    license: "",
    email: "",
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || "",
        phone: driver.phone || "",
        license: driver.license || "",
        email: driver.email || "",
        isActive: driver.isActive,
      });
    }
  }, [driver]);

  const generateDummyData = () => {
    const dummyDrivers = [
      { name: "Ahmad Wijaya", phone: "+62 812-3456-789", license: "SIM B1 20234567", email: "ahmad.wijaya@mail.com" },
      { name: "Siti Nurhaliza", phone: "+62 813-7890-123", license: "SIM B1 19876543", email: "siti.nurhaliza@mail.com" },
      { name: "Budi Santoso", phone: "+62 815-4567-890", license: "SIM B2 21098765", email: "budi.santoso@mail.com" },
      { name: "Maria Magdalena", phone: "+62 817-8901-234", license: "SIM B1 18765432", email: "maria.magdalena@mail.com" },
      { name: "Joko Widodo", phone: "+62 819-2345-678", license: "SIM B2 22109876", email: "joko.widodo@mail.com" },
      { name: "Dewi Sartika", phone: "+62 821-5678-901", license: "SIM B1 17654321", email: "dewi.sartika@mail.com" },
      { name: "Andi Surya", phone: "+62 822-9012-345", license: "SIM B1 23210987", email: "andi.surya@mail.com" }
    ];
    
    const randomDriver = dummyDrivers[Math.floor(Math.random() * dummyDrivers.length)];
    setFormData({
      name: randomDriver.name,
      phone: randomDriver.phone,
      license: randomDriver.license,
      email: randomDriver.email,
      isActive: true
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await onSubmit(
      {
        name: formData.name,
        phone: formData.phone,
        license: formData.license,
        email: formData.email,
        isActive: formData.isActive,
      },
      driver?.id
    );
    
    // Reset form
    setFormData({
      name: "",
      phone: "",
      license: "",
      email: "",
      isActive: true
    });
    
    setIsSubmitting(false);
    close();
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
          <Plus className="h-4 w-4" /> New Driver
        </button>
      )}

      <Modal isOpen={isOpen} onClose={close} title={driver ? "Edit Driver" : "Add New Driver"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Enter driver name"
                  required
                />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              placeholder="driver@email.com"
              required
            />
          </div>
        </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="+62 8XX-XXXX-XXX"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="license" className="text-sm font-medium text-foreground">
              License Number
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                id="license"
                name="license"
                value={formData.license}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="SIM B1 XXXXXXXX"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border border-border/70 text-primary focus:ring-primary/20"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-foreground">
              Active Driver
            </label>
          </div>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Quick Fill</p>
                <p className="text-xs text-muted-foreground">Generate random driver data</p>
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
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : driver ? "Update Driver" : "Add Driver"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddDriverForm;
