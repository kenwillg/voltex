"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import AddVehicleForm, { Vehicle } from "@/components/forms/add-vehicle-form";
import DynamicSearch from "@/components/ui/dynamic-search";
import { Table } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("licensePlate");

  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    setSearchField(field);
  };

  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((vehicle) => {
        if (searchField === "licensePlate") return vehicle.licensePlate.toLowerCase().includes(term);
        if (searchField === "vehicleType") return (vehicle.vehicleType || "").toLowerCase().includes(term);
        if (searchField === "ownerName") return (vehicle.ownerName || "").toLowerCase().includes(term);
        return (
          vehicle.licensePlate.toLowerCase().includes(term) ||
          (vehicle.vehicleType || "").toLowerCase().includes(term)
        );
      });
    }
    if (combinedFilters.productType) {
      filtered = filtered.filter((vehicle) => (vehicle.vehicleType || "").toLowerCase().includes(combinedFilters.productType));
    }
    return filtered;
  }, [vehicles, searchTerm, searchField, combinedFilters]);

  const fetchVehicles = async () => {
    const res = await fetch("/api/vehicles");
    const data = await res.json();
    setVehicles(
      data.map((vehicle: any) => ({
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType || "-",
        capacityLiters: typeof vehicle.capacityLiters === "number"
          ? vehicle.capacityLiters
          : vehicle.capacityLiters
            ? Number(vehicle.capacityLiters)
            : vehicle.capacity
              ? Number(vehicle.capacity)
              : undefined,
        ownerName: vehicle.ownerName || "-",
      }))
    );
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (vehicle: Omit<Vehicle, "id">) => {
    await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType,
        capacityLiters: vehicle.capacityLiters,
        ownerName: vehicle.ownerName,
        isActive: true,
      }),
    });
    await fetchVehicles();
  };

  const handleSaveVehicle = async (vehicle: Omit<Vehicle, "id">, id?: string) => {
    if (id) {
      await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vehicle,
          capacityLiters: vehicle.capacityLiters,
        }),
      });
    } else {
      await handleAddVehicle(vehicle);
    }
    await fetchVehicles();
  };

  const handleDeleteVehicle = async (id: string) => {
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    await fetchVehicles();
  };

  const formatCapacity = (liters?: number) => {
    if (!liters || Number.isNaN(liters)) return "-";
    const kl = liters / 1000;
    return `${kl % 1 === 0 ? kl.toFixed(0) : kl.toFixed(1)} KL`;
  };

  const columns = [
    { key: "licensePlate", label: "License Plate", render: (value: string, record: Vehicle) => (
      <div>
        <p className="font-semibold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground">{record.id}</p>
      </div>
    ) },
    { key: "vehicleType", label: "Unit Type" },
    { key: "capacityLiters", label: "Capacity", render: (value: number) => formatCapacity(value) },
    { key: "ownerName", label: "Owner" },
    {
      key: "actions",
      label: "Actions",
      render: (_: unknown, record: Vehicle) => (
        <div className="flex gap-2">
          <AddVehicleForm
            vehicle={record}
            onSubmit={handleSaveVehicle}
            renderTrigger={(open) => (
              <button
                onClick={open}
                className="rounded-lg border border-border/60 px-3 py-1 text-xs text-foreground hover:border-primary/60 hover:text-primary transition"
              >
                Edit
              </button>
            )}
          />
          <button
            onClick={() => handleDeleteVehicle(record.id)}
            className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Fleet Vehicles</h1>
        <p className="text-muted-foreground">Daftar unit truk, kapasitas tangki, dan pemilik armada</p>
      </div>

      <DynamicSearch currentPath={pathname} onSearchChange={handleSearchChange} className="max-w-md" />

      <InfoCard
        title="Vehicle Directory"
        description={`Katalog kendaraan pengangkut BBM (${filteredVehicles.length} dari ${vehicles.length})`}
        icon={Truck}
        actions={<AddVehicleForm onSubmit={handleAddVehicle} />}
      >
        <Table columns={columns} data={filteredVehicles} />
      </InfoCard>
    </div>
  );
}
