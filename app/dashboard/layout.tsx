"use client";

import { ReactNode } from "react";
import { 
  GaugeCircle, 
  Layers3, 
  ListChecks, 
  Users, 
  Settings,
  ScanQrCode,
  Fuel,
  Truck,
  MapPin
} from "lucide-react";
import { Sidebar, useSidebar, MobileMenuToggle } from "@/components/ui/sidebar";
import { HeaderFilter } from "@/components/ui/header-filter";
import { FilterProvider } from "@/contexts/filter-context";

const navigation = [
  { label: "Dashboard", icon: GaugeCircle, href: "/dashboard" },
  { label: "Orders", icon: Layers3, href: "/dashboard/orders" },
  { label: "Gate Control", icon: ScanQrCode, href: "/dashboard/gate" },
  { label: "Fuel Bay", icon: Fuel, href: "/dashboard/fuel-bay" },
  { label: "Load Sessions", icon: ListChecks, href: "/dashboard/load-sessions" },
  { label: "Drivers", icon: Users, href: "/dashboard/drivers" },
  { label: "Vehicles", icon: Truck, href: "/dashboard/vehicles" },
  { label: "SPBU Tujuan", icon: MapPin, href: "/dashboard/spbu" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const logo = {
  text: "Fuel Terminal",
  subtitle: "Distribution Monitoring",
  initials: "DM"
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <FilterProvider>
      <div className="relative flex min-h-screen bg-background text-foreground">
        <Sidebar
          navigation={navigation}
          logo={logo}
          open={isOpen}
          onToggle={toggle}
        />

        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <MobileMenuToggle open={isOpen} onToggle={toggle} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">
                    Distribution Monitoring
                  </p>
                  <h1 className="text-2xl font-semibold text-foreground">
                    Dashboard
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HeaderFilter />
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
