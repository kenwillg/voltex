"use client";

import { ReactNode } from "react";
import { BaseComponent } from "@/lib/base-component";
import { cn } from "@/lib/utils";

/**
 * Interface untuk column configuration
 */
interface TableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  className?: string;
}

/**
 * Interface untuk Table props
 */
interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  className?: string;
  variant?: "default" | "compact" | "striped";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Class untuk Table component yang reusable
 */
class TableComponent extends BaseComponent {
  protected getBaseStyles(): string {
    return "min-w-full text-left";
  }

  getSizeStyles(size: "sm" | "md" | "lg"): string {
    switch (size) {
      case "sm":
        return "text-xs";
      case "md":
        return "text-sm";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  }

  getVariantStyles(variant: "default" | "compact" | "striped"): string {
    switch (variant) {
      case "compact":
        return "";
      case "striped":
        return "";
      default:
        return "";
    }
  }

  getHeaderStyles(): string {
    return cn(
      "text-xs uppercase tracking-wide text-muted-foreground",
      "border-b border-border/60"
    );
  }

  getBodyStyles(variant: "default" | "compact" | "striped"): string {
    const base = "divide-y divide-border/60";
    
    switch (variant) {
      case "striped":
        return cn(base, "[&>tr:nth-child(odd)]:bg-muted/20");
      default:
        return base;
    }
  }

  getCellPadding(size: "sm" | "md" | "lg"): string {
    switch (size) {
      case "sm":
        return "py-2 pr-4";
      case "md":
        return "py-3 pr-6";
      case "lg":
        return "py-4 pr-8";
      default:
        return "py-3 pr-6";
    }
  }

  render(props: Omit<TableProps, 'columns' | 'data'>): {
    tableClass: string;
    headerClass: string;
    bodyClass: string;
    cellClass: string;
  } {
    const { variant = "default", size = "md", className = "" } = props;
    
    return {
      tableClass: this.combineClasses(
        this.getSizeStyles(size),
        this.getVariantStyles(variant),
        className
      ),
      headerClass: this.getHeaderStyles(),
      bodyClass: this.getBodyStyles(variant),
      cellClass: this.getCellPadding(size)
    };
  }
}

// Instance untuk digunakan
const tableComponent = new TableComponent();

/**
 * Table Component dengan OOP principles
 */
export function Table<T = any>({
  columns,
  data,
  className,
  variant = "default",
  size = "md",
  loading = false,
  emptyMessage = "No data available"
}: TableProps<T>) {
  const { tableClass, headerClass, bodyClass, cellClass } = tableComponent.render({
    variant,
    size,
    className
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableClass}>
        <thead className={headerClass}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(cellClass, "font-medium", column.className)}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={bodyClass}>
          {data.map((record, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(cellClass, column.className)}
                >
                  {column.render 
                    ? column.render((record as any)[column.key], record, index)
                    : (record as any)[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Interface untuk Activity Table props
 */
interface ActivityTableProps {
  data: Array<{
    sessionId: string;
    spNumber: string;
    licensePlate: string;
    driverName: string;
    product?: string;
    plannedLiters?: number;
    gateIn: string;
    loading: string;
    gateOut: string;
    liters: string;
  }>;
  className?: string;
}

/**
 * Pre-configured Activity Table Component
 */
export function ActivityTable({ data, className }: ActivityTableProps) {
  const columns: TableColumn[] = [
    { key: "sessionId", label: "Session", render: (value) => (
      <span className="font-semibold text-foreground">{value}</span>
    )},
    { key: "spNumber", label: "Surat Perintah" },
    { key: "licensePlate", label: "License Plate", render: (value) => (
      <span className="text-primary">{value}</span>
    )},
    { key: "driverName", label: "Driver" },
    { key: "product", label: "Product" },
    {
      key: "plannedLiters",
      label: "Planned",
      render: (value: number | undefined) =>
        value !== undefined ? `${Number(value || 0).toLocaleString("id-ID")} L` : "-",
    },
    { key: "gateIn", label: "Gate In" },
    { key: "loading", label: "Loading" },
    { key: "gateOut", label: "Gate Out" },
    { key: "liters", label: "Volume" }
  ];

  return <Table columns={columns} data={data} className={className} />;
}

/**
 * Interface untuk Orders Table props
 */
interface OrdersTableProps {
  data: Array<{
    spNumber: string;
    licensePlate: string;
    driverId: string;
    product: string;
    planned: string;
    schedule: string;
    status: string;
  }>;
  className?: string;
}

/**
 * Pre-configured Orders Table Component
 */
export function OrdersTable({ data, className }: OrdersTableProps) {
  const columns: TableColumn[] = [
    { key: "spNumber", label: "SP Number", render: (value) => (
      <span className="font-semibold text-foreground">{value}</span>
    )},
    { key: "licensePlate", label: "License Plate", render: (value) => (
      <span className="text-primary">{value}</span>
    )},
    { key: "driverId", label: "Driver ID" },
    { key: "product", label: "Product" },
    { key: "planned", label: "Planned" },
    { key: "schedule", label: "Scheduled", className: "text-muted-foreground" },
    { key: "status", label: "Status", render: (value) => (
      <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        {value}
      </span>
    )}
  ];

  return <Table columns={columns} data={data} className={className} />;
}

/**
 * Interface untuk Drivers Table props
 */
interface DriversTableProps {
  data: Array<{
    id: string;
    name: string;
    email?: string;
    phone: string;
    license: string;
    isActive: boolean;
  }>;
  className?: string;
}

/**
 * Pre-configured Drivers Table Component
 */
export function DriversTable({ data, className }: DriversTableProps) {
  const columns: TableColumn[] = [
    { key: "id", label: "Driver ID", render: (value) => (
      <span className="font-semibold text-foreground">{value}</span>
    )},
    { key: "name", label: "Name" },
    { key: "email", label: "Email", className: "text-muted-foreground" },
    { key: "phone", label: "Phone", className: "text-muted-foreground" },
    { key: "license", label: "License" },
    { key: "isActive", label: "Status", render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          value ? "bg-emerald-500/20 text-emerald-200" : "bg-muted text-muted-foreground"
        )}
      >
        {value ? "Active" : "Inactive"}
      </span>
    )}
  ];

  return <Table columns={columns} data={data} className={className} />;
}
