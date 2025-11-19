"use client";

import { useState, useMemo } from "react";
import { InfoCard } from "@/components/ui/card";
import { DriversTable } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddDriverForm from "@/components/forms/add-driver-form";
import { Users } from "lucide-react";
import { useFilterContext, useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  isActive: boolean;
}

const initialDrivers: Driver[] = [
  {
    id: "DRV-0142",
    name: "Satria Ramdhan",
    phone: "+62 811-4456-782",
    license: "SIM B1 19023451",
    isActive: true,
  },
  {
    id: "DRV-0128",
    name: "Rahmat Santoso",
    phone: "+62 812-8890-123",
    license: "SIM B1 18098732",
    isActive: true,
  },
  {
    id: "DRV-0094",
    name: "Didik Hartono",
    phone: "+62 813-7756-909",
    license: "SIM B2 17098123",
    isActive: false,
  },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("name");

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

  const handleAddDriver = (newDriver: Driver) => {
    setDrivers(prev => [newDriver, ...prev]);
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