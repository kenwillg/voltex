"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock4,
  Users,
} from "lucide-react";

import { SummaryCard, InfoCard, StatusCard } from "@/components/ui/card";
import { ActivityTable, OrdersTable, DriversTable } from "@/components/ui/table";
import { StatusManager, ComponentStatus } from "@/lib/base-component";
import { useCombinedFilters } from "@/contexts/filter-context";
export function DashboardPage() {
  const combinedFilters = useCombinedFilters();

  const [loadSessions, setLoadSessions] = useState<Array<{
    sessionId: string;
    spNumber: string;
    licensePlate: string;
    driverName: string;
    status: ComponentStatus;
    gateIn: string;
    loading: string;
    gateOut: string;
    liters: string;
  }>>([]);

  const [orderList, setOrderList] = useState<Array<{
    spNumber: string;
    licensePlate: string;
    driverId: string;
    product: string;
    planned: string;
    schedule: string;
    status: string;
    scheduleDate?: Date;
  }>>([]);

  const [driverDirectory, setDriverDirectory] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    license: string;
    isActive: boolean;
  }>>([]);

  useEffect(() => {
    const formatTime = (value?: string | null) =>
      value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

    const loadData = async () => {
      const [sessionsRes, ordersRes, driversRes] = await Promise.all([
        fetch("/api/load-sessions"),
        fetch("/api/orders"),
        fetch("/api/drivers"),
      ]);

      const sessionsData = await sessionsRes.json();
      setLoadSessions(
        sessionsData.map((session: any) => ({
          sessionId: session.id,
          spNumber: session.order?.spNumber || "-",
          licensePlate: session.order?.vehicle?.licensePlate || "-",
          driverName: session.order?.driver?.name || "-",
          status: session.status as ComponentStatus,
          gateIn: formatTime(session.gateInAt),
          loading: formatTime(session.loadingStartAt),
          gateOut: formatTime(session.gateOutAt),
          liters: session.actualLiters ? `${Number(session.actualLiters).toLocaleString("id-ID")} L` : "-",
        }))
      );

      const ordersData = await ordersRes.json();
      setOrderList(
        ordersData.map((order: any) => {
          const scheduleDate = new Date(order.scheduledAt);
          return {
            spNumber: order.spNumber,
            licensePlate: order.vehicle?.licensePlate || order.vehicleId,
            driverId: order.driver?.driverCode || order.driverId,
            product: order.product,
            planned: `${Number(order.plannedLiters || 0).toLocaleString("id-ID")} L`,
            schedule: scheduleDate.toLocaleString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: order.status || order.loadSessions?.[0]?.status || "SCHEDULED",
            scheduleDate,
          };
        })
      );

      const driversData = await driversRes.json();
      setDriverDirectory(
        driversData.map((driver: any) => ({
          id: driver.driverCode || driver.id,
          name: driver.name,
          phone: driver.phone || "-",
          license: driver.licenseId || "-",
          isActive: driver.isActive,
        }))
      );
    };

    loadData();
  }, []);

  const monthlyProgress = useMemo(() => {
    const grouped = new Map<string, { orders: number; finished: number; plannedLiters: number; actualLiters: number }>();

    orderList.forEach((order) => {
      const key = order.scheduleDate?.toLocaleString("en-US", { month: "short", year: "numeric" }) || "Unknown";
      const current = grouped.get(key) || { orders: 0, finished: 0, plannedLiters: 0, actualLiters: 0 };
      grouped.set(key, {
        ...current,
        orders: current.orders + 1,
        plannedLiters: current.plannedLiters + Number(order.planned.replace(/[^0-9.]/g, "")),
      });
    });

    loadSessions.forEach((session) => {
      const key = session.gateIn !== "-" ? new Date().toLocaleString("en-US", { month: "short", year: "numeric" }) : "Unknown";
      const current = grouped.get(key) || { orders: 0, finished: 0, plannedLiters: 0, actualLiters: 0 };
      grouped.set(key, {
        ...current,
        finished: session.status === "FINISHED" ? current.finished + 1 : current.finished,
        actualLiters: current.actualLiters + Number(session.liters.replace(/[^0-9.]/g, "")) || current.actualLiters,
      });
    });

    return Array.from(grouped.entries())
      .map(([month, stats]) => ({
        month,
        ...stats,
        completion: stats.plannedLiters
          ? Math.min(100, Math.round((stats.actualLiters / stats.plannedLiters) * 100))
          : 0,
      }))
      .slice(0, 3);
  }, [orderList, loadSessions]);

  const isSameDay = (dateA?: Date, dateB?: Date) => {
    if (!dateA || !dateB) return false;
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  };

  const today = new Date();
  const scheduledToday = orderList.filter((order) => isSameDay(order.scheduleDate, today)).length;
  const finishedToday = loadSessions.filter((session) => session.status === "FINISHED").length;
  const monthlySnapshot = monthlyProgress[0];

  const summaryCards = [
    {
      title: "Monthly Tracker",
      description: "Orders vs actual completion",
      value: `${monthlySnapshot?.finished ?? 0} / ${monthlySnapshot?.orders ?? 0}`,
      sublabel: monthlySnapshot ? `Finished in ${monthlySnapshot.month}` : "No data",
      icon: BarChart3,
    },
    {
      title: "Scheduled Today",
      description: "Total SP on calendar",
      value: `${scheduledToday}`,
      sublabel: "SPs across shifts",
      icon: CalendarClock,
    },
    {
      title: "Finished Sessions",
      description: "Sessions completed",
      value: `${finishedToday}`,
      sublabel: "Based on load sessions",
      icon: CheckCircle2,
    },
    {
      title: "Active Drivers",
      description: "Available crew",
      value: `${driverDirectory.filter((driver) => driver.isActive).length}`,
      sublabel: `${driverDirectory.length} total drivers`,
      icon: Users,
    },
  ];

  // Filter data based on header filters
  const filteredLatestActivity = useMemo(() => {
    let filtered = [...loadSessions];
    
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
  }, [combinedFilters, loadSessions]);

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
          description={`Live status for bay activities (${filteredLatestActivity.length} sessions)`}
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

          <InfoCard
            title="Security Monitoring"
            description="CCTV integrations are handled on a separate platform"
          >
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
              <p>This dashboard intentionally excludes CCTV feeds, alerts, or plate recognition logs.</p>
              <p className="mt-2">Coordinate with the terminal security desk whenever footage or camera reviews are required.</p>
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
