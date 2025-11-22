"use client";

import { useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import AddVehicleForm, { Vehicle } from "@/components/forms/add-vehicle-form";
import DynamicSearch from "@/components/ui/dynamic-search";
import { Table } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

const initialVehicles: Vehicle[] = [
  { id: "VH-0001", licensePlate: "B 7261 JP", type: "Hino 260", capacity: "16 KL", owner: "PT Voltex Logistics" },
  { id: "VH-0002", licensePlate: "B 9087 TX", type: "Isuzu Giga", capacity: "14 KL", owner: "PT Energi Sentral" },
  { id: "VH-0003", licensePlate: "B 7812 QK", type: "Mercedes Axor", capacity: "18 KL", owner: "PT Armada Prima" },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
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
        if (searchField === "type") return vehicle.type.toLowerCase().includes(term);
        if (searchField === "owner") return vehicle.owner.toLowerCase().includes(term);
        return vehicle.licensePlate.toLowerCase().includes(term) || vehicle.type.toLowerCase().includes(term);
      });
    }
    if (combinedFilters.productType) {
      filtered = filtered.filter((vehicle) => vehicle.type.toLowerCase().includes(combinedFilters.productType));
    }
    return filtered;
  }, [vehicles, searchTerm, searchField, combinedFilters]);

  const handleAddVehicle = (vehicle: Vehicle) => {
    setVehicles((prev) => [vehicle, ...prev]);
  };

  const columns = [
    { key: "licensePlate", label: "License Plate", render: (value: string, record: Vehicle) => (
      <div>
        <p className="font-semibold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground">{record.id}</p>
      </div>
    ) },
    { key: "type", label: "Unit Type" },
    { key: "capacity", label: "Capacity" },
    { key: "owner", label: "Owner" },
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
        actions={<AddVehicleForm onAddVehicle={handleAddVehicle} />}
      >
        <Table columns={columns} data={filteredVehicles} />
      </InfoCard>
    </div>
  );
}
