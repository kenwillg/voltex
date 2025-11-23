"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import { DriversTable } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddDriverForm from "@/components/forms/add-driver-form";
import { Users } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

interface Driver {
  id: string;
  name: string;
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
        id: driver.driverCode || driver.id,
        name: driver.name,
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
            return driver.id.toLowerCase().includes(term);
          case "license":
            return driver.license.toLowerCase().includes(term);
          default:
            return driver.name.toLowerCase().includes(term) || 
                   driver.id.toLowerCase().includes(term);
        }
      });
    }
    
    return filtered;
  }, [drivers, combinedFilters, searchTerm, searchField]);

  const handleAddDriver = async (newDriver: Omit<Driver, "id">) => {
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDriver),
    });

    const created = await response.json();

    setDrivers(prev => [{
      id: created.driverCode || created.id,
      name: created.name,
      phone: created.phone || "-",
      license: created.licenseId || "-",
      isActive: created.isActive,
    }, ...prev]);
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
        actions={<AddDriverForm onAddDriver={handleAddDriver} />}
      >
        <DriversTable data={filteredDrivers} />
      </InfoCard>
    </div>
  );
}