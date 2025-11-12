"use client";

import { useState, useMemo } from "react";
import { InfoCard } from "@/components/ui/card";
import { ActivityTable } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import { ListChecks } from "lucide-react";
import { useFilterContext, useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

const initialActivity = [
  {
    sessionId: "LS-23A9",
    spNumber: "SP-240501",
    licensePlate: "B 9087 TX",
    driverName: "Rahmat Santoso",
    gateIn: "08:42",
    loading: "09:05",
    gateOut: "-",
    liters: "7,500 L",
  },
  {
    sessionId: "LS-23A8",
    spNumber: "SP-240499",
    licensePlate: "B 7812 QK",
    driverName: "Adi Nugroho",
    gateIn: "07:10",
    loading: "07:26",
    gateOut: "08:04",
    liters: "8,000 L",
  },
  {
    sessionId: "LS-23A7",
    spNumber: "SP-240498",
    licensePlate: "B 9821 VD",
    driverName: "Budi Cahyo",
    gateIn: "09:14",
    loading: "-",
    gateOut: "-",
    liters: "7,800 L",
  },
];

export default function LoadSessionsPage() {
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("sessionId");

  // Handle search changes
  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    setSearchField(field);
  };

  // Filtered activity based on both header filters and search
  const filteredActivity = useMemo(() => {
    let filtered = [...initialActivity];
    
    // Apply header filters first
    if (combinedFilters.sessionStatus) {
      filtered = filtered.filter(session => {
        // Determine session status based on gateOut
        const status = session.gateOut === "-" ? "in-progress" : "completed";
        return status === combinedFilters.sessionStatus;
      });
    }
    
    if (combinedFilters.productType) {
      // Filter by product type if we had that data
    }
    
    if (combinedFilters.timeRange) {
      // Apply time range filtering logic here
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(session => {
        switch (searchField) {
          case "sessionId":
            return session.sessionId.toLowerCase().includes(term);
          case "licensePlate":
            return session.licensePlate.toLowerCase().includes(term);
          case "driverName":
            return session.driverName.toLowerCase().includes(term);
          default:
            return session.sessionId.toLowerCase().includes(term) ||
                   session.licensePlate.toLowerCase().includes(term) ||
                   session.driverName.toLowerCase().includes(term);
        }
      });
    }
    
    return filtered;
  }, [combinedFilters, searchTerm, searchField]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Load Sessions</h1>
        <p className="text-muted-foreground">Monitor fuel loading activities and manual verification status</p>
      </div>

      {/* Dynamic Search */}
      <DynamicSearch 
        currentPath={pathname}
        onSearchChange={handleSearchChange}
        className="max-w-md"
      />

      <InfoCard
        title="Load Sessions Activity"
        description={`Live bay operations (${filteredActivity.length} of ${initialActivity.length} sessions)`}
        icon={ListChecks}
      >
        <ActivityTable data={filteredActivity} />
      </InfoCard>
    </div>
  );
}
