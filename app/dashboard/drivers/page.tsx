"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddDriverForm from "@/components/forms/add-driver-form";
import { Users } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";
import QRCode from "qrcode"; // ⬅ NEW

interface Driver {
  id: string; // DB id
  code: string; // Display / driver code
  name: string;
  email: string;
  phone: string;
  license: string;
  isActive: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("name");

  // --- QR modal state ---
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDriver, setQrDriver] = useState<Driver | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      const response = await fetch("/api/drivers");
      const data = await response.json();
      const mapped: Driver[] = data.map((driver: any) => ({
        id: driver.id,
        code: driver.driverCode || driver.id,
        name: driver.name,
        email: driver.email || "-",
        phone: driver.phone || "-",
        license: driver.licenseId || "-",
        isActive: driver.isActive,
      }));

      setDrivers(mapped);
    };

    fetchDrivers();
  }, []);

  // when qrValue changes + modal is open, draw it into canvas
  useEffect(() => {
    if (!qrOpen || !qrValue || !qrCanvasRef.current) return;

    QRCode.toCanvas(qrCanvasRef.current, qrValue, {
      width: 256,
      margin: 1,
    }).catch((err) => {
      console.error("QR render error:", err);
      setQrError("Failed to render QR code");
    });
  }, [qrOpen, qrValue]);

  // Handle search changes
  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    setSearchField(field);
  };

  // Filtered drivers based on both header filters and search
  const filteredDrivers = useMemo(() => {
    let filtered = [...drivers];

    // Apply header filters first
    if (combinedFilters.status && Array.isArray(combinedFilters.status)) {
      filtered = filtered.filter((driver) =>
        combinedFilters.status.includes(driver.isActive ? "active" : "inactive"),
      );
    }

    if (combinedFilters.licenseClass) {
      filtered = filtered.filter((driver) =>
        driver.license.includes(combinedFilters.licenseClass),
      );
    }

    if (combinedFilters.experience) {
      // proxy via license
      filtered = filtered.filter((driver) => {
        if (combinedFilters.experience === "junior") return driver.license.includes("SIM A");
        if (combinedFilters.experience === "senior") return driver.license.includes("SIM B2");
        if (combinedFilters.experience === "mid-level") return driver.license.includes("SIM B1");
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((driver) => {
        switch (searchField) {
          case "name":
            return driver.name.toLowerCase().includes(term);
          case "id":
            return driver.code.toLowerCase().includes(term);
          case "license":
            return driver.license.toLowerCase().includes(term);
          case "email":
            return driver.email.toLowerCase().includes(term);
          default:
            return (
              driver.name.toLowerCase().includes(term) ||
              driver.id.toLowerCase().includes(term)
            );
        }
      });
    }

    return filtered;
  }, [drivers, combinedFilters, searchTerm, searchField]);

  const handleAddDriver = async (newDriver: Omit<Driver, "id" | "code">) => {
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDriver),
    });

    const created = await response.json();

    setDrivers((prev) => [
      {
        id: created.id,
        code: created.driverCode || created.id,
        name: created.name,
        phone: created.phone || "-",
        license: created.licenseId || "-",
        email: created.email || "-",
        isActive: created.isActive,
      },
      ...prev,
    ]);
  };

  const handleSaveDriver = async (driver: Omit<Driver, "id" | "code">, id?: string) => {
    if (id) {
      await fetch(`/api/drivers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driver),
      });
    } else {
      await handleAddDriver(driver);
      return;
    }

    const response = await fetch("/api/drivers");
    const data = await response.json();
    const mapped: Driver[] = data.map((driver: any) => ({
      id: driver.id,
      code: driver.driverCode || driver.id,
      name: driver.name,
      email: driver.email || "-",
      phone: driver.phone || "-",
      license: driver.licenseId || "-",
      isActive: driver.isActive,
    }));
    setDrivers(mapped);
  };

  const handleDeleteDriver = async (id: string) => {
    await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  };

  // --- QR helpers ---
  const openQrForDriver = async (driver: Driver) => {
    setQrDriver(driver);
    setQrOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrValue(null);

    try {
      const res = await fetch(`/api/drivers/${driver.id}/qr`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.qr) {
        throw new Error(data.reason || "Failed to fetch QR code");
      }
      setQrValue(data.qr as string);
    } catch (err: any) {
      console.error(err);
      setQrError(err.message || "Failed to fetch QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setQrOpen(false);
    setQrDriver(null);
    setQrValue(null);
    setQrError(null);
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${qrDriver?.code || "driver-qr"}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Driver Management</h1>
        <p className="text-muted-foreground">
          Manage driver roster and identity information
        </p>
      </div>

      {/* Dynamic Search */}
      <DynamicSearch
        currentPath={pathname}
        onSearchChange={handleSearchChange}
        className="max-w-md"
      />

      <InfoCard
        title="Driver Directory"
        description={`Active roster and identity information (${filteredDrivers.length} of ${drivers.length} drivers)`}
        icon={Users}
        actions={<AddDriverForm onSubmit={handleSaveDriver} />}
      >
        <Table
          columns={[
            {
              key: "code",
              label: "Driver ID",
              render: (value) => (
                <span className="font-semibold text-foreground">{value}</span>
              ),
            },
            { key: "name", label: "Name" },
            { key: "email", label: "Email", className: "text-muted-foreground" },
            { key: "phone", label: "Phone", className: "text-muted-foreground" },
            { key: "license", label: "License" },
            {
              key: "isActive",
              label: "Status",
              render: (value) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    value
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {value ? "Active" : "Inactive"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (_: unknown, record: Driver) => (
                <div className="flex gap-2">
                  <AddDriverForm
                    driver={record}
                    onSubmit={handleSaveDriver}
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
                    onClick={() => openQrForDriver(record)}
                    className="rounded-lg border border-blue-500/60 px-3 py-1 text-xs text-blue-400 transition hover:bg-blue-500/10"
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => handleDeleteDriver(record.id)}
                    className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          data={filteredDrivers}
        />
      </InfoCard>

      {/* QR MODAL */}
      {qrOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Driver QR Code
                </h2>
                <p className="text-xs text-muted-foreground">
                  {qrDriver?.name} ({qrDriver?.code})
                </p>
              </div>
              <button
                onClick={closeQrModal}
                className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrLoading && (
                <p className="text-sm text-muted-foreground">Generating QR...</p>
              )}
              {qrError && (
                <p className="text-sm text-destructive">
                  {qrError}
                </p>
              )}
              {!qrLoading && !qrError && (
                <>
                  <div className="rounded-2xl bg-white p-4">
                    <canvas ref={qrCanvasRef} />
                  </div>
                  <p className="break-all text-[10px] text-muted-foreground">
                    {qrValue}
                  </p>
                  <button
                    onClick={handleDownloadQr}
                    className="mt-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground hover:bg-primary/90"
                  >
                    Download PNG
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
