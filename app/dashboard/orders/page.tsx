"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { InfoCard } from "@/components/ui/card";
import DynamicSearch from "@/components/ui/dynamic-search";
import AddOrderForm from "@/components/forms/add-order-form";
import { Layers3, MapPin, User, MoreHorizontal, FileText, QrCode, Download, RefreshCw } from "lucide-react";
import { Table } from "@/components/ui/table";
import { StatusManager, ComponentStatus } from "@/lib/base-component";
import { useCombinedFilters } from "@/contexts/filter-context";
import { usePathname } from "next/navigation";
import QRCode from "qrcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Order {
  id?: string;
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
  spaPdfPath?: string | null;
  qrCodePath?: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverOptions, setDriverOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [spbuOptions, setSpbuOptions] = useState<Array<{ value: string; label: string; meta?: Record<string, string> }>>([]);
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const combinedFilters = useCombinedFilters();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [systemMessage, setSystemMessage] = useState<string | null>("Sedang mengambil data...");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("spNumber");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spaOpen, setSpaOpen] = useState(false);
  const [spaOrder, setSpaOrder] = useState<Order | null>(null);

  const [repeatOrderData, setRepeatOrderData] = useState<Order | null>(null);

  const mapOrderFromApi = (order: any): Order => {
    const schedule = new Date(order.scheduledAt);
    const destinationName = order.spbu?.name || order.destination?.destinationName || "-";
    const destinationAddress = order.spbu?.address || order.destination?.destinationAddress || "-";
    const destinationCoords = order.spbu?.coords || order.destination?.destinationCoords || "-";
    return {
      id: order.id,
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
      spaPdfPath: order.spaPdfPath,
      qrCodePath: order.qrCodePath,
    };
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setSystemMessage("Sedang mengambil data...");
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
      setSystemMessage(null);
      setIsLoading(false);
    };

    load().catch(() => {
      setSystemMessage("Gagal memuat data, coba muat ulang.");
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!qrOpen || !qrValue || !qrCanvasRef.current) return;

    QRCode.toCanvas(qrCanvasRef.current, qrValue, {
      width: 256,
      margin: 1,
    }).catch((err) => {
      console.error("QR render error:", err);
      setQrError("Failed to render QR code");
    });
  }, [qrOpen, qrValue]);

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

  // --- QR helpers ---
  const openQrForOrder = async (order: Order) => {
    if (!order.id) return;
    // Close SPA modal if open
    setSpaOpen(false);
    setSpaOrder(null);

    setQrOrder(order);
    setQrOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrValue(null);

    if (order.qrCodePath) {
      setQrLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}/qr`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.qr) {
        throw new Error(data.reason || "Failed to fetch QR code");
      }
      setQrValue(data.qr as string);
    } catch (err: any) {
      console.error(err);
      setQrError(err.message || "Failed to fetch QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setQrOpen(false);
    setQrOrder(null);
    setQrValue(null);
    setQrError(null);
  };

  const openSpaForOrder = (order: Order) => {
    if (!order.spaPdfPath) return;
    // Close QR modal if open
    setQrOpen(false);
    setQrOrder(null);
    setQrValue(null);
    setQrError(null);

    setSpaOrder(order);
    setSpaOpen(true);
  };

  const closeSpaModal = () => {
    setSpaOpen(false);
    setSpaOrder(null);
  };

  const downloadSpaPdf = () => {
    if (!spaOrder?.spaPdfPath) return;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${spaOrder.spaPdfPath}`;
    window.open(url, '_blank');
  };

  const downloadQrImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      // Fallback
      window.open(url, '_blank');
    }
  };

  const handleDownloadQr = () => {
    if (qrOrder?.qrCodePath) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${qrOrder.qrCodePath}`;
      downloadQrImage(url, `QR-${qrOrder.spNumber}.png`);
      return;
    }

    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${qrOrder?.spNumber || "spa-qr"}.png`;
    a.click();
  };

  const refreshOrders = async () => {
    setSystemMessage("Memperbarui data order...");
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.map(mapOrderFromApi));
    setSystemMessage(null);
  };

  const handleAddOrder = async (newOrder: Order) => {
    setIsSaving(true);
    setSystemMessage("Sending data...");
    const vehicleId = newOrder.vehicleId || vehicleOptions.find((vehicle) => vehicle.meta?.licensePlate === newOrder.licensePlate)?.value;
    const driverId = newOrder.driverDbId || driverOptions.find((driver) => driver.meta?.driverCode === newOrder.driverId)?.value;
    const spbuId = newOrder.spbuId || (spbuOptions[0]?.value as string);

    try {
      setSystemMessage("Generating SPA...");
      const res = await fetch("/api/orders", {
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

      if (!res.ok) {
        throw new Error("Create order failed");
      }

      setSystemMessage("Sending an Email...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      await refreshOrders();
      setSystemMessage("Order berhasil dibuat.");
    } catch (err) {
      console.error(err);
      setSystemMessage("Gagal membuat order, coba ulangi.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSystemMessage(null), 1500);
    }
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
    {
      key: "spNumber", label: "SP Number", render: (value: string) => (
        <span className="font-semibold text-foreground">{value}</span>
      )
    },
    {
      key: "licensePlate", label: "Kendaraan", render: (value: string) => {
        const vehicle = findVehicle(value);
        return (
          <div>
            <p className="font-semibold text-primary">{value}</p>
            <p className="text-xs text-muted-foreground">{vehicle?.label?.split("•")[1]?.trim() ?? "Unit"}</p>
          </div>
        );
      }
    },
    {
      key: "driverId", label: "Driver", render: (value: string) => {
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
      }
    },
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
    {
      key: "status", label: "Status", render: (value: string) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${StatusManager.getStatusBadgeClass(value as ComponentStatus) || "bg-primary/10 text-primary"
          }`}>
          {value}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (_value: unknown, record: Order) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => {
                openQrForOrder(record);
              }}>
                <QrCode className="mr-2 h-4 w-4" />
                <span>Show QR Code</span>
              </DropdownMenuItem>

              {record.spaPdfPath ? (
                <DropdownMenuItem onClick={() => {
                  openSpaForOrder(record);
                }}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>View SPA</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="pointer-events-none opacity-50">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>View SPA PDF</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => setRepeatOrderData(record)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Repeat Order</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
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
            loading={isSaving}
          />
        }
      >
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
            Sedang mengambil data...
          </div>
        ) : (
          <Table columns={orderColumns} data={filteredOrders} />
        )}
      </InfoCard>

      {systemMessage && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          {systemMessage}
        </div>
      )}

      {spaOpen && spaOrder?.spaPdfPath && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={closeSpaModal}>
          <div className="w-full max-w-4xl h-[90vh] rounded-3xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Surat Perintah Angkut
                </h2>
                <p className="text-xs text-muted-foreground">
                  {spaOrder.spNumber} · {spaOrder.driverId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadSpaPdf}
                  className="rounded-full px-3 py-1 text-xs text-primary hover:bg-primary/10 flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
                <button
                  onClick={closeSpaModal}
                  className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-60px)] rounded-2xl border border-border overflow-hidden">
              <iframe
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${spaOrder.spaPdfPath}`}
                className="w-full h-full"
                title="SPA PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {qrOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  SPA QR Code
                </h2>
                <p className="text-xs text-muted-foreground">
                  {qrOrder?.spNumber} · {qrOrder?.driverId}
                </p>
              </div>
              <button
                onClick={closeQrModal}
                className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrLoading && (
                <p className="text-sm text-muted-foreground">Generating QR...</p>
              )}
              {qrError && (
                <p className="text-sm text-destructive">
                  {qrError}
                </p>
              )}
              {!qrLoading && !qrError && (
                <>
                  <div className="rounded-2xl bg-white p-4">
                    {qrOrder?.qrCodePath ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${qrOrder.qrCodePath}`}
                        alt="SPA QR Code"
                        className="h-64 w-64 object-contain"
                      />
                    ) : (
                      <canvas ref={qrCanvasRef} />
                    )}
                  </div>
                  <p className="break-all text-[10px] text-muted-foreground">
                    {qrValue || "Stored QR"}
                  </p>
                  <button
                    onClick={handleDownloadQr}
                    className="mt-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PNG
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repeat Order Modal */}
      <AddOrderForm
        isOpen={!!repeatOrderData}
        onClose={() => setRepeatOrderData(null)}
        onAddOrder={handleAddOrder}
        onRepeatOrder={handleRepeatOrder}
        existingOrder={repeatOrderData}
        productOptions={productOptions}
        driverOptions={driverOptions}
        vehicleOptions={vehicleOptions}
        spbuOptions={spbuOptions}
        loading={isSaving}
      />
    </div>
  );
}
