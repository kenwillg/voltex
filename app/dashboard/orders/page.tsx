"use client";

import { useState, useMemo } from "react";
import { InfoCard } from "@/components/ui/card";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddOrderForm from "@/components/forms/add-order-form";
import { Layers3 } from "lucide-react";
import { Table } from "@/components/ui/table";
import { StatusManager } from "@/lib/base-component";
import { useFilterContext, useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

interface Order {
  spNumber: string;
  licensePlate: string;
  driverId: string;
  product: string;
  planned: string;
  schedule: string;
  status: string;
}

const initialOrders: Order[] = [
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("spNumber");

  // Handle search changes
  const handleSearchChange = (term: string, field: string) => {
    setSearchTerm(term);
    setSearchField(field);
  };

  // Custom filtering logic that combines header and search filters
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    // Apply header filters (from dropdown)
    if (combinedFilters.status && Array.isArray(combinedFilters.status)) {
      filtered = filtered.filter(order => 
        combinedFilters.status.includes(order.status.toLowerCase())
      );
    }
    
    if (combinedFilters.product) {
      filtered = filtered.filter(order => 
        order.product.toLowerCase().replace(/\s+/g, '-') === combinedFilters.product
      );
    }
    
    if (combinedFilters.dateRange) {
      // Apply date range filtering logic here
    }
    
    if (combinedFilters.driver) {
      filtered = filtered.filter(order => 
        order.driverId.toLowerCase().includes(combinedFilters.driver.toLowerCase())
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        switch (searchField) {
          case "spNumber":
            return order.spNumber.toLowerCase().includes(term);
          case "licensePlate":
            return order.licensePlate.toLowerCase().includes(term);
          case "driverId":
            return order.driverId.toLowerCase().includes(term);
          default:
            return order.spNumber.toLowerCase().includes(term) ||
                   order.licensePlate.toLowerCase().includes(term);
        }
      });
    }
    
    return filtered;
  }, [orders, combinedFilters, searchTerm, searchField]);

  const handleAddOrder = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  const handleRepeatOrder = (repeatedOrder: Order) => {
    setOrders(prev => [repeatedOrder, ...prev]);
  };

  // Enhanced columns with repeat order action
  const orderColumns = [
    { key: "spNumber", label: "SP Number", render: (value: string) => (
      <span className="font-semibold text-foreground">{value}</span>
    )},
    { key: "licensePlate", label: "License Plate", render: (value: string) => (
      <span className="text-primary">{value}</span>
    )},
    { key: "driverId", label: "Driver ID" },
    { key: "product", label: "Product" },
    { key: "planned", label: "Planned" },
    { key: "schedule", label: "Scheduled", className: "text-muted-foreground" },
    { key: "status", label: "Status", render: (value: string) => (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        StatusManager.getStatusBadgeClass(value as any) || "bg-primary/10 text-primary"
      }`}>
        {value}
      </span>
    )},
    { 
      key: "actions", 
      label: "Actions", 
      render: (_: any, record: Order) => (
        <div className="flex items-center gap-2">
          <AddOrderForm 
            onAddOrder={handleAddOrder}
            onRepeatOrder={handleRepeatOrder}
            existingOrder={record}
          />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Surat Perintah</h1>
        <p className="text-muted-foreground">Track and manage delivery order assignments</p>
      </div>

      {/* Dynamic Search */}
      <DynamicSearch 
        currentPath={pathname}
        onSearchChange={handleSearchChange}
        className="max-w-md"
      />

      <InfoCard
        title="Order Management"
        description={`Track assignments, vehicle pairings, and planned volumes (${filteredOrders.length} of ${orders.length} orders)`}
        icon={Layers3}
        actions={<AddOrderForm onAddOrder={handleAddOrder} />}
      >
        <Table columns={orderColumns} data={filteredOrders} />
      </InfoCard>
    </div>
  );
}