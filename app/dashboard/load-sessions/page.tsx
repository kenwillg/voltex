"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "@/components/ui/card";
import { ActivityTable } from "@/components/ui/table";
import DynamicSearch from "@/components/ui/dynamic-search";
import { ListChecks } from "lucide-react";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

type ActivityRow = {
  sessionId: string;
  spNumber: string;
  licensePlate: string;
  driverName: string;
  product: string;
  plannedLiters: number;
  gateIn: string;
  loading: string;
  gateOut: string;
  liters: string;
};

export default function LoadSessionsPage() {
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("sessionId");
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  const formatTime = (value?: string | null) =>
    value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

  useEffect(() => {
    const fetchSessions = async () => {
      const response = await fetch("/api/load-sessions");
      const data = await response.json();

      const mapped = data.map((session: any) => ({
        sessionId: session.id,
        spNumber: session.order?.spNumber || "-",
        licensePlate: session.order?.vehicle?.licensePlate || "-",
        driverName: session.order?.driver?.name || "-",
        product: session.order?.product || "-",
        plannedLiters: Number(session.order?.plannedLiters || 0),
        gateIn: formatTime(session.gateInAt),
        loading: formatTime(session.loadingStartAt),
        gateOut: formatTime(session.gateOutAt),
        liters: session.actualLiters ? `${Number(session.actualLiters).toLocaleString("id-ID")} L` : "-",
      }));

      setActivity(mapped);
    };

    fetchSessions();
  }, []);

  // Handle search changes
  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    setSearchField(field);
  };

  // Filtered activity based on both header filters and search
  const filteredActivity = useMemo(() => {
    let filtered = [...activity];
    
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
  }, [combinedFilters, searchTerm, searchField, activity]);

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
        description={`Live bay operations (${filteredActivity.length} of ${activity.length} sessions)`}
        icon={ListChecks}
      >
        <ActivityTable data={filteredActivity} />
      </InfoCard>
    </div>
  );
}
