"use client";

import { useMemo, useState, useEffect } from "react";
import { InfoCard } from "@/components/ui/card";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddOrderForm from "@/components/forms/add-order-form";
import { Layers3, MapPin, User } from "lucide-react";
import { Table } from "@/components/ui/table";
import { StatusManager, ComponentStatus } from "@/lib/base-component";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";

interface Order {
  spNumber: string;
  licensePlate: string;
  driverId: string;
  driverDbId?: string;
  vehicleId?: string;
  product: string;
  plannedLiters: number;
  schedule: string;
  status: string;
  spbuId?: string;
  destinationName: string;
  destinationAddress: string;
  destinationCoords: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverOptions, setDriverOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [spbuOptions, setSpbuOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("spNumber");

  const mapOrderFromApi = (order: any): Order => {
    const schedule = new Date(order.scheduledAt);
    const destinationName = order.spbu?.name || order.destination?.destinationName || "-";
    const destinationAddress = order.spbu?.address || order.destination?.destinationAddress || "-";
    const destinationCoords = order.spbu?.coords || order.destination?.destinationCoords || "-";
    return {
      spNumber: order.spNumber,
      licensePlate: order.vehicle?.licensePlate || order.vehicleId,
      vehicleId: order.vehicle?.id || order.vehicleId,
      driverId: order.driver?.driverCode || order.driverId,
      driverDbId: order.driver?.id || order.driverId,
      product: order.product,
      plannedLiters: Number(order.plannedLiters || 0),
      schedule: schedule.toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: order.status || order.loadSessions?.[0]?.status || "SCHEDULED",
      spbuId: order.spbu?.id || order.spbuId,
      destinationName,
      destinationAddress,
      destinationCoords,
    };
  };

  useEffect(() => {
    const load = async () => {
      const [driversRes, vehiclesRes, spbuRes, ordersRes, productsRes] = await Promise.all([
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
        fetch("/api/spbu"),
        fetch("/api/orders"),
        fetch("/api/products"),
      ]);

      const driverData = await driversRes.json();
      setDriverOptions(
        driverData.map((driver: any) => ({
          value: driver.id,
          label: driver.name,
          meta: { driverCode: driver.driverCode || driver.id },
        }))
      );

      const vehicleData = await vehiclesRes.json();
      setVehicleOptions(
        vehicleData.map((vehicle: any) => ({
          value: vehicle.id,
          label: `${vehicle.licensePlate}${vehicle.vehicleType ? ` • ${vehicle.vehicleType}` : ""}`,
          meta: { licensePlate: vehicle.licensePlate },
        }))
      );

      const spbuData = await spbuRes.json();
      setSpbuOptions(
        spbuData.map((spbu: any) => ({
          value: spbu.id,
          label: `${spbu.name} (${spbu.code})`,
          meta: { address: spbu.address, coords: spbu.coords, code: spbu.code },
        }))
      );

      const orderData = await ordersRes.json();
      setOrders(orderData.map(mapOrderFromApi));

      const productsData = await productsRes.json();
      if (Array.isArray(productsData) && productsData.length) {
        setProductOptions(
          productsData.map((p: any) => ({ id: p.id ?? p.name, name: p.name }))
        );
      }
    };

    load();
  }, []);

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

  const refreshOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.map(mapOrderFromApi));
  };

  const handleAddOrder = async (newOrder: Order) => {
    const vehicleId = newOrder.vehicleId || vehicleOptions.find((vehicle) => vehicle.meta?.licensePlate === newOrder.licensePlate)?.value;
    const driverId = newOrder.driverDbId || driverOptions.find((driver) => driver.meta?.driverCode === newOrder.driverId)?.value;
    const spbuId = newOrder.spbuId || (spbuOptions[0]?.value as string);

    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newOrder,
        vehicleId,
        driverId,
        spbuId,
        plannedLiters: newOrder.plannedLiters,
        scheduledAt: newOrder.schedule,
        destinationName: newOrder.destinationName,
        destinationAddress: newOrder.destinationAddress,
        destinationCoords: newOrder.destinationCoords,
      }),
    });

    await refreshOrders();
  };

  const handleRepeatOrder = async (repeatedOrder: Order) => {
    await handleAddOrder(repeatedOrder);
  };

  const findDriver = (id: string) =>
    driverOptions.find((driver) => driver.meta?.driverCode === id || driver.value === id);
  const findVehicle = (plate: string) =>
    vehicleOptions.find((vehicle) => vehicle.meta?.licensePlate === plate || vehicle.value === plate);

  // Enhanced columns with repeat order action
  const orderColumns = [
    { key: "spNumber", label: "SP Number", render: (value: string) => (
      <span className="font-semibold text-foreground">{value}</span>
    )},
    { key: "licensePlate", label: "Kendaraan", render: (value: string) => {
      const vehicle = findVehicle(value);
      return (
        <div>
          <p className="font-semibold text-primary">{value}</p>
          <p className="text-xs text-muted-foreground">{vehicle?.label?.split("•")[1]?.trim() ?? "Unit"}</p>
        </div>
      );
    }},
    { key: "driverId", label: "Driver", render: (value: string) => {
      const driver = findDriver(value);
      return (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{driver?.label ?? value}</p>
            <p className="text-xs text-muted-foreground">{value}</p>
          </div>
        </div>
      );
    }},
    { key: "product", label: "Product" },
    {
      key: "plannedLiters",
      label: "Planned",
      render: (value: number) => `${Number(value || 0).toLocaleString("id-ID")} L`,
    },
    {
      key: "destinationName",
      label: "Tujuan SPBU",
      render: (_: string, record: Order) => (
        <div>
          <p className="font-semibold text-foreground">{record.destinationName}</p>
          <p className="text-xs text-muted-foreground">{record.destinationAddress}</p>
          <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.3em] text-primary">
            <MapPin className="h-3 w-3" />
            {record.destinationCoords}
          </span>
        </div>
      ),
    },
    { key: "schedule", label: "Scheduled", className: "text-muted-foreground" },
    { key: "status", label: "Status", render: (value: string) => (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        StatusManager.getStatusBadgeClass(value as ComponentStatus) || "bg-primary/10 text-primary"
      }`}>
        {value}
      </span>
    )},
    { 
      key: "actions", 
      label: "Actions", 
      render: (_value: unknown, record: Order) => (
        <div className="flex items-center gap-2">
          <AddOrderForm 
            onAddOrder={handleAddOrder}
            onRepeatOrder={handleRepeatOrder}
            existingOrder={record}
            productOptions={productOptions}
            driverOptions={driverOptions}
            vehicleOptions={vehicleOptions}
            spbuOptions={spbuOptions}
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
        description={`Track assignments, planned volumes, and SPBU destinations (${filteredOrders.length} of ${orders.length} orders)`}
        icon={Layers3}
        actions={
          <AddOrderForm
            onAddOrder={handleAddOrder}
            productOptions={productOptions}
            driverOptions={driverOptions}
            vehicleOptions={vehicleOptions}
            spbuOptions={spbuOptions}
          />
        }
      >
        <Table columns={orderColumns} data={filteredOrders} />
      </InfoCard>
    </div>
  );
}
