"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import AddSpbuForm, { Spbu, SpbuInput } from "@/components/forms/add-spbu-form";
import DynamicSearch from "@/components/ui/dynamic-search";
import { Table } from "@/components/ui/table";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function SpbuPage() {
  const [spbus, setSpbus] = useState<Spbu[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSpbu = async () => {
    setLoading(true);
    const res = await fetch("/api/spbu");
    const data = await res.json();
    setSpbus(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchSpbu();
  }, []);

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

  const handleSaveSpbu = async (payload: SpbuInput, id?: string) => {
    const endpoint = id ? `/api/spbu/${id}` : "/api/spbu";
    const method = id ? "PUT" : "POST";

    await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await fetchSpbu();
  };

  const handleDeleteSpbu = async (id: string) => {
    await fetch(`/api/spbu/${id}`, { method: "DELETE" });
    await fetchSpbu();
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
    {
      key: "actions",
      label: "Actions",
      render: (_: string, record: Spbu) => (
        <div className="flex items-center gap-2">
          <AddSpbuForm
            spbu={record}
            onSubmit={handleSaveSpbu}
            renderTrigger={(open) => (
              <button
                onClick={open}
                className="inline-flex items-center gap-1 rounded-xl border border-border/60 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          />
          <button
            onClick={() => handleDeleteSpbu(record.id)}
            className="inline-flex items-center gap-1 rounded-xl border border-destructive/50 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      ),
    },
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
        actions={<AddSpbuForm onSubmit={handleSaveSpbu} />}
      >
        <Table columns={columns} data={filteredSpbu} loading={loading} />
      </InfoCard>
    </div>
  );
}
