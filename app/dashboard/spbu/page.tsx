"use client";

import { useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import AddSpbuForm, { Spbu } from "@/components/forms/add-spbu-form";
import DynamicSearch from "@/components/ui/dynamic-search";
import { Table } from "@/components/ui/table";
import { MapPin } from "lucide-react";
import { usePathname } from "next/navigation";

const initialSpbu: Spbu[] = [
  { code: "34.17107", name: "SPBU Cipayung", address: "Jl. Raya Cipayung No. 14, Jakarta Timur", coords: "-6.317210, 106.903220" },
  { code: "31.17602", name: "SPBU Pondok Gede", address: "Jl. Raya Pondok Gede No. 88, Bekasi", coords: "-6.268540, 106.924110" },
  { code: "34.16712", name: "SPBU Bekasi Timur", address: "Jl. Cut Mutia No. 3, Rawalumbu, Bekasi", coords: "-6.245880, 107.000410" },
];

export default function SpbuPage() {
  const [spbus, setSpbus] = useState<Spbu[]>(initialSpbu);
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    void field;
  };

  const filteredSpbu = useMemo(() => {
    if (!searchTerm) return spbus;
    const term = searchTerm.toLowerCase();
    return spbus.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.address.toLowerCase().includes(term),
    );
  }, [searchTerm, spbus]);

  const handleAddSpbu = (spbu: Spbu) => {
    setSpbus((prev) => [spbu, ...prev]);
  };

  const columns = [
    { key: "name", label: "SPBU", render: (_: string, record: Spbu) => (
      <div>
        <p className="font-semibold text-foreground">{record.name}</p>
        <p className="text-xs text-muted-foreground">Kode {record.code}</p>
      </div>
    ) },
    { key: "address", label: "Alamat", className: "text-muted-foreground" },
    { key: "coords", label: "Koordinat", render: (value: string) => (
      <span className="inline-flex items-center gap-1 text-xs text-primary">
        <MapPin className="h-3 w-3" /> {value}
      </span>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Daftar SPBU Tujuan</h1>
        <p className="text-muted-foreground">Kelola lokasi pengantaran BBM berikut alamat dan koordinatnya</p>
      </div>

      <DynamicSearch currentPath={pathname} onSearchChange={handleSearchChange} className="max-w-md" />

      <InfoCard
        title="SPBU Directory"
        description={`Lokasi aktif (${filteredSpbu.length} dari ${spbus.length})`}
        icon={MapPin}
        actions={<AddSpbuForm onAddSpbu={handleAddSpbu} />}
      >
        <Table columns={columns} data={filteredSpbu} />
      </InfoCard>
    </div>
  );
}
