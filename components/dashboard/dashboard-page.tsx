"use client";

import { useMemo, useState } from "react";

import {
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock4,
  Filter,
  GaugeCircle,
  Layers3,
  ListChecks,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Users,
  Webcam,
} from "lucide-react";

import { cn } from "@/lib/utils";

const statusFlow = [
  { key: "SCHEDULED", label: "Scheduled", description: "Awaiting arrival" },
  { key: "GATE_IN", label: "Gate In", description: "Arrived at terminal gate" },
  { key: "QUEUED", label: "Queued", description: "Waiting for bay assignment" },
  { key: "LOADING", label: "Loading", description: "Fuel loading in progress" },
  { key: "GATE_OUT", label: "Gate Out", description: "Departing terminal" },
  { key: "FINISHED", label: "Finished", description: "Delivery cycle complete" },
];

const statusCases = [
  { key: "CANCELLED", label: "Cancelled", badge: "bg-rose-500/20 text-rose-200" },
  { key: "REJECTED", label: "Rejected", badge: "bg-amber-500/20 text-amber-200" },
  { key: "ON_HOLD", label: "On Hold", badge: "bg-sky-500/20 text-sky-200" },
];

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
    status: "LOADING",
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
    status: "FINISHED",
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
    status: "GATE_IN",
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

const sidebarNavigation = [
  { label: "Dashboard", icon: GaugeCircle, href: "#" },
  { label: "Orders", icon: Layers3, href: "#orders" },
  { label: "Load Sessions", icon: ListChecks, href: "#activity" },
  { label: "CCTV Monitoring", icon: Webcam, href: "#cctv" },
  { label: "Drivers", icon: Users, href: "#drivers" },
  { label: "Settings", icon: Settings, href: "#" },
];

export function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const monthlyProgress = useMemo(
    () =>
      monthlyTracker.map((item) => ({
        ...item,
        completion: Math.min(100, Math.round((item.actualLiters / item.plannedLiters) * 100)),
      })),
    [],
  );

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-border/60 bg-card/80/70 backdrop-blur-xl transition-transform duration-300", // style
          "shadow-[0_20px_80px_-40px_rgba(129,108,248,0.55)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                DM
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Distribution Monitoring</p>
                <p className="text-lg font-semibold text-foreground">Fuel Terminal</p>
              </div>
            </div>
            <button
              className="rounded-xl border border-border/60 p-2 text-muted-foreground transition hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {sidebarNavigation.map((item) => (
              <a
                className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                href={item.href}
                key={item.label}
              >
                <item.icon className="h-4 w-4 text-primary transition group-hover:scale-110" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-3 border-t border-border/60 px-6 py-6">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20">
              <QrCode className="h-4 w-4" /> Generate Driver QR
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-2xl border border-border/60 p-2 text-muted-foreground transition hover:text-foreground lg:hidden"
                onClick={() => setSidebarOpen((prev) => !prev)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">Distribution Monitoring</p>
                <h1 className="text-2xl font-semibold text-foreground">Home Dashboard</h1>
              </div>
            </div>
            <button className="hidden items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-primary sm:flex">
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-8 px-6 py-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)] transition hover:shadow-[0_40px_120px_-60px_rgba(129,108,248,0.85)]"
                key={card.title}
              >
                <card.icon className="h-10 w-10 text-primary/70 transition group-hover:scale-110" />
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-semibold text-foreground">{card.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{card.sublabel}</p>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]" id="activity">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">Latest Load Sessions</h2>
                <p className="text-sm text-muted-foreground">CCTV verified activities and product movement</p>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-3 pr-6 font-medium">Session</th>
                      <th className="py-3 pr-6 font-medium">Surat Perintah</th>
                      <th className="py-3 pr-6 font-medium">License Plate</th>
                      <th className="py-3 pr-6 font-medium">Driver</th>
                      <th className="py-3 pr-6 font-medium">Gate In</th>
                      <th className="py-3 pr-6 font-medium">Loading</th>
                      <th className="py-3 pr-6 font-medium">Gate Out</th>
                      <th className="py-3 pr-6 font-medium">Volume</th>
                      <th className="py-3 pr-6 font-medium">CCTV Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {latestActivity.map((item) => (
                      <tr key={item.sessionId}>
                        <td className="py-3 pr-6 font-semibold text-foreground">{item.sessionId}</td>
                        <td className="py-3 pr-6">{item.spNumber}</td>
                        <td className="py-3 pr-6 text-primary">{item.licensePlate}</td>
                        <td className="py-3 pr-6">{item.driverName}</td>
                        <td className="py-3 pr-6">{item.gateIn}</td>
                        <td className="py-3 pr-6">{item.loading}</td>
                        <td className="py-3 pr-6">{item.gateOut}</td>
                        <td className="py-3 pr-6">{item.liters}</td>
                        <td className="py-3 pr-6 text-muted-foreground">{item.cctv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Status Journey</h2>
                    <p className="text-sm text-muted-foreground">Monitor progression for each load session</p>
                  </div>
                  <CalendarCheck2 className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-6 space-y-5">
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
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                        status.badge,
                      )}
                      key={status.key}
                    >
                      {status.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]" id="cctv">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">CCTV Highlights</h2>
                    <p className="text-sm text-muted-foreground">Quick links to latest plate recognition</p>
                  </div>
                  <Webcam className="h-6 w-6 text-primary" />
                </div>
                <ul className="mt-5 space-y-4">
                  {latestActivity.map((item) => (
                    <li className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3" key={`cctv-${item.sessionId}`}>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">{item.spNumber} • {item.driverName}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.cctv.split("/").pop()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]"
            id="orders"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Surat Perintah</h2>
                <p className="text-sm text-muted-foreground">Track assignments, vehicle pairings, and planned volumes</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                <CalendarClock className="h-4 w-4" /> Schedule SP
              </button>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-3 pr-6 font-medium">SP Number</th>
                    <th className="py-3 pr-6 font-medium">License Plate</th>
                    <th className="py-3 pr-6 font-medium">Driver ID</th>
                    <th className="py-3 pr-6 font-medium">Product</th>
                    <th className="py-3 pr-6 font-medium">Planned</th>
                    <th className="py-3 pr-6 font-medium">Scheduled</th>
                    <th className="py-3 pr-6 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orderList.map((order) => (
                    <tr key={order.spNumber}>
                      <td className="py-3 pr-6 font-semibold text-foreground">{order.spNumber}</td>
                      <td className="py-3 pr-6 text-primary">{order.licensePlate}</td>
                      <td className="py-3 pr-6">{order.driverId}</td>
                      <td className="py-3 pr-6">{order.product}</td>
                      <td className="py-3 pr-6">{order.planned}</td>
                      <td className="py-3 pr-6 text-muted-foreground">{order.schedule}</td>
                      <td className="py-3 pr-6">
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]" id="drivers">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Driver Management</h2>
                  <p className="text-sm text-muted-foreground">Active roster and identity information</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20">
                  <QrCode className="h-4 w-4" /> New Driver ID
                </button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-3 pr-6 font-medium">Driver ID</th>
                      <th className="py-3 pr-6 font-medium">Name</th>
                      <th className="py-3 pr-6 font-medium">Phone</th>
                      <th className="py-3 pr-6 font-medium">License</th>
                      <th className="py-3 pr-6 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {driverDirectory.map((driver) => (
                      <tr key={driver.id}>
                        <td className="py-3 pr-6 font-semibold text-foreground">{driver.id}</td>
                        <td className="py-3 pr-6">{driver.name}</td>
                        <td className="py-3 pr-6 text-muted-foreground">{driver.phone}</td>
                        <td className="py-3 pr-6">{driver.license}</td>
                        <td className="py-3 pr-6">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                              driver.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {driver.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Monthly Tracker</h2>
                    <p className="text-sm text-muted-foreground">Performance summary for the last quarter</p>
                  </div>
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-6 space-y-4">
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
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Shift Snapshot</h2>
                    <p className="text-sm text-muted-foreground">Capacity coverage for each gate shift</p>
                  </div>
                  <Clock4 className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <p className="font-semibold text-foreground">Shift 1 • 06:00 - 14:00</p>
                      <p className="text-xs text-muted-foreground">5 / 6 bays active</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">83%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <p className="font-semibold text-foreground">Shift 2 • 14:00 - 22:00</p>
                      <p className="text-xs text-muted-foreground">3 / 6 bays active</p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">50%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <p className="font-semibold text-foreground">Shift 3 • 22:00 - 06:00</p>
                      <p className="text-xs text-muted-foreground">2 / 6 bays active</p>
                    </div>
                    <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200">33%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
