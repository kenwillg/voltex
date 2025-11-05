"use client";

import { useMemo } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock4,
  Users,
  Webcam,
} from "lucide-react";

import { SummaryCard, InfoCard, StatusCard } from "@/components/ui/card";
import { ActivityTable, OrdersTable, DriversTable } from "@/components/ui/table";
import { StatusManager, ComponentStatus } from "@/lib/base-component";
import { useCombinedFilters } from "@/contexts/filter-context";

// Data dari dashboard yang sudah ada
const monthlyTracker = [
  {
    month: "May 2024",
    orders: 62,
    finished: 58,
    plannedLiters: 148_200,
    actualLiters: 141_860,
  },
  {
    month: "Apr 2024",
    orders: 57,
    finished: 53,
    plannedLiters: 136_450,
    actualLiters: 129_200,
  },
  {
    month: "Mar 2024",
    orders: 61,
    finished: 55,
    plannedLiters: 142_780,
    actualLiters: 134_640,
  },
];

const latestActivity = [
  {
    sessionId: "LS-23A9",
    spNumber: "SP-240501",
    licensePlate: "B 9087 TX",
    driverName: "Rahmat Santoso",
    status: "LOADING" as ComponentStatus,
    gateIn: "08:42",
    loading: "09:05",
    gateOut: "-",
    liters: "7,500 L",
    cctv: "storage/cctv/B9087TX-20240518-1.jpg",
  },
  {
    sessionId: "LS-23A8",
    spNumber: "SP-240499",
    licensePlate: "B 7812 QK",
    driverName: "Adi Nugroho",
    status: "FINISHED" as ComponentStatus,
    gateIn: "07:10",
    loading: "07:26",
    gateOut: "08:04",
    liters: "8,000 L",
    cctv: "storage/cctv/B7812QK-20240518-1.jpg",
  },
  {
    sessionId: "LS-23A7",
    spNumber: "SP-240498",
    licensePlate: "B 9821 VD",
    driverName: "Budi Cahyo",
    status: "GATE_IN" as ComponentStatus,
    gateIn: "09:14",
    loading: "-",
    gateOut: "-",
    liters: "7,800 L",
    cctv: "storage/cctv/B9821VD-20240518-1.jpg",
  },
];

const orderList = [
  {
    spNumber: "SP-240503",
    licensePlate: "B 7261 JP",
    driverId: "DRV-0142",
    product: "Pertalite",
    planned: "8,200 L",
    schedule: "18 May 2024, 13:30",
    status: "SCHEDULED",
  },
  {
    spNumber: "SP-240502",
    licensePlate: "B 9087 TX",
    driverId: "DRV-0128",
    product: "Solar",
    planned: "7,500 L",
    schedule: "18 May 2024, 08:30",
    status: "LOADING",
  },
  {
    spNumber: "SP-240501",
    licensePlate: "B 7812 QK",
    driverId: "DRV-0105",
    product: "Pertamax",
    planned: "8,000 L",
    schedule: "18 May 2024, 07:00",
    status: "FINISHED",
  },
];

const driverDirectory = [
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

const summaryCards = [
  {
    title: "Monthly Tracker",
    description: "Orders vs actual completion",
    value: "58 / 62",
    sublabel: "Finished in May",
    icon: BarChart3,
  },
  {
    title: "Scheduled Today",
    description: "Total SP on calendar",
    value: "12",
    sublabel: "SPs across 3 shifts",
    icon: CalendarClock,
  },
  {
    title: "Finished Today",
    description: "Sessions completed",
    value: "9",
    sublabel: "18.6 KL delivered",
    icon: CheckCircle2,
  },
  {
    title: "Active Drivers",
    description: "Available crew",
    value: "42",
    sublabel: "3 on hold",
    icon: Users,
  },
];

export function DashboardPage() {
  const combinedFilters = useCombinedFilters();
  
  const monthlyProgress = useMemo(
    () =>
      monthlyTracker.map((item) => ({
        ...item,
        completion: Math.min(100, Math.round((item.actualLiters / item.plannedLiters) * 100)),
      })),
    [],
  );

  // Filter data based on header filters
  const filteredLatestActivity = useMemo(() => {
    let filtered = [...latestActivity];
    
    if (combinedFilters.status) {
      if (Array.isArray(combinedFilters.status)) {
        filtered = filtered.filter(item => 
          combinedFilters.status.includes(item.status.toLowerCase())
        );
      } else {
        filtered = filtered.filter(item => 
          item.status.toLowerCase() === combinedFilters.status
        );
      }
    }
    
    if (combinedFilters.product) {
      // Note: Matching with order data for product filtering
      const productMapping: Record<string, string> = {
        'pertalite': 'Pertalite',
        'pertamax': 'Pertamax', 
        'solar': 'Solar'
      };
      
      if (productMapping[combinedFilters.product]) {
        // Filter logic would be implemented based on your data structure
        // For demo, we'll show all data
      }
    }
    
    return filtered;
  }, [combinedFilters]);

  // Get status flow dari StatusManager
  const statusFlow = StatusManager.getAllStatusConfigs()
    .filter(status => !["CANCELLED", "REJECTED", "ON_HOLD"].includes(status.key))
    .slice(0, 6);

  const statusCases = StatusManager.getAllStatusConfigs()
    .filter(status => ["CANCELLED", "REJECTED", "ON_HOLD"].includes(status.key));

  const scheduleAction = (
    <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
      <CalendarClock className="h-4 w-4" /> Schedule SP
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards Section */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.title}
            title={card.title}
            description={card.description}
            value={card.value}
            sublabel={card.sublabel}
            icon={card.icon}
          />
        ))}
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Latest Load Sessions */}
        <InfoCard
          title="Latest Load Sessions"
          description={`CCTV verified activities and product movement (${filteredLatestActivity.length} sessions)`}
        >
          <ActivityTable data={filteredLatestActivity} />
        </InfoCard>

        {/* Right Side Column */}
        <div className="space-y-4">
          {/* Status Journey */}
          <InfoCard
            title="Status Journey"
            description="Monitor progression for each load session"
            icon={CalendarCheck2}
          >
            <div className="space-y-5">
              {statusFlow.map((item, index) => (
                <div className="flex items-start gap-3" key={item.key}>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {statusCases.map((status) => (
                <span
                  key={status.key}
                  className={status.badge}
                >
                  {status.label}
                </span>
              ))}
            </div>
          </InfoCard>

          {/* CCTV Highlights */}
          <InfoCard
            title="CCTV Highlights"
            description="Quick links to latest plate recognition"
            icon={Webcam}
          >
            <div className="space-y-4">
              {latestActivity.map((item) => (
                <StatusCard
                  key={`cctv-${item.sessionId}`}
                  title={item.licensePlate}
                  subtitle={`${item.spNumber} • ${item.driverName}`}
                  status={item.cctv.split("/").pop() || ""}
                />
              ))}
            </div>
          </InfoCard>
        </div>
      </section>

      {/* Surat Perintah Section */}
      <InfoCard
        title="Surat Perintah"
        description="Track assignments, vehicle pairings, and planned volumes"
        actions={scheduleAction}
      >
        <OrdersTable data={orderList} />
      </InfoCard>

      {/* Driver Management Grid */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Driver Directory */}
        <InfoCard
          title="Driver Management"
          description="Active roster and identity information"
        >
          <DriversTable data={driverDirectory} />
        </InfoCard>

        {/* Right Side Column */}
        <div className="space-y-4">
          {/* Monthly Tracker */}
          <InfoCard
            title="Monthly Tracker"
            description="Performance summary for the last quarter"
            icon={Car}
          >
            <div className="space-y-4">
              {monthlyProgress.map((month) => (
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4" key={month.month}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{month.month}</p>
                      <p className="text-xs text-muted-foreground">
                        Orders {month.finished} / {month.orders}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{month.completion}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${month.completion}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Planned {month.plannedLiters.toLocaleString()} L</span>
                    <span>Actual {month.actualLiters.toLocaleString()} L</span>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>

          {/* Shift Snapshot */}
          <InfoCard
            title="Shift Snapshot"
            description="Capacity coverage for each gate shift"
            icon={Clock4}
          >
            <div className="space-y-4 text-sm">
              <StatusCard
                title="Shift 1 • 06:00 - 14:00"
                subtitle="5 / 6 bays active"
                status="83%"
                statusColor="text-emerald-200"
                className="bg-emerald-500/10 border-emerald-500/20"
              />
              <StatusCard
                title="Shift 2 • 14:00 - 22:00"
                subtitle="3 / 6 bays active"
                status="50%"
                statusColor="text-amber-200"
                className="bg-amber-500/10 border-amber-500/20"
              />
              <StatusCard
                title="Shift 3 • 22:00 - 06:00"
                subtitle="2 / 6 bays active"
                status="33%"
                statusColor="text-sky-200"
                className="bg-sky-500/10 border-sky-500/20"
              />
            </div>
          </InfoCard>
        </div>
      </section>
    </div>
  );
}