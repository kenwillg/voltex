"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddDriverForm from "@/components/forms/add-driver-form";
import { Users } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

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
      filtered = filtered.filter(driver => 
        combinedFilters.status.includes(driver.isActive ? 'active' : 'inactive')
      );
    }
    
    if (combinedFilters.licenseClass) {
      filtered = filtered.filter(driver => 
        driver.license.includes(combinedFilters.licenseClass)
      );
    }
    
    if (combinedFilters.experience) {
      // Since we don't have experience field, we can filter by license type as a proxy
      filtered = filtered.filter(driver => {
        if (combinedFilters.experience === 'junior') return driver.license.includes('SIM A');
        if (combinedFilters.experience === 'senior') return driver.license.includes('SIM B2');
        if (combinedFilters.experience === 'mid-level') return driver.license.includes('SIM B1');
        return true;
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(driver => {
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
            return driver.name.toLowerCase().includes(term) || 
                   driver.id.toLowerCase().includes(term);
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

    setDrivers(prev => [{
      id: created.id,
      code: created.driverCode || created.id,
      name: created.name,
      phone: created.phone || "-",
      license: created.licenseId || "-",
      email: created.email || "-",
      isActive: created.isActive,
    }, ...prev]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Driver Management</h1>
        <p className="text-muted-foreground">Manage driver roster and identity information</p>
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
            { key: "code", label: "Driver ID", render: (value) => <span className="font-semibold text-foreground">{value}</span> },
            { key: "name", label: "Name" },
            { key: "email", label: "Email", className: "text-muted-foreground" },
            { key: "phone", label: "Phone", className: "text-muted-foreground" },
            { key: "license", label: "License" },
            { key: "isActive", label: "Status", render: (value) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  value ? "bg-emerald-500/20 text-emerald-200" : "bg-muted text-muted-foreground"
                }`}
              >
                {value ? "Active" : "Inactive"}
              </span>
            ) },
            { key: "actions", label: "Actions", render: (_: unknown, record: Driver) => (
              <div className="flex gap-2">
                <AddDriverForm
                  driver={record}
                  onSubmit={handleSaveDriver}
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
                  onClick={() => handleDeleteDriver(record.id)}
                  className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition"
                >
                  Delete
                </button>
              </div>
            ) },
          ]}
          data={filteredDrivers}
        />
      </InfoCard>
    </div>
  );
}
