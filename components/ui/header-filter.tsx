"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Filter, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface HeaderFilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "search";
  options?: FilterOption[];
  placeholder?: string;
}

interface PageFilterConfig {
  [pathname: string]: HeaderFilterConfig[];
}

interface HeaderFilterProps {
  onFilterChange?: (filters: Record<string, any>) => void;
}

// Konfigurasi filter untuk setiap halaman
const PAGE_FILTER_CONFIGS: PageFilterConfig = {
  "/dashboard": [
    {
      key: "timeRange",
      label: "Time Range",
      type: "select",
      options: [
        { value: "today", label: "Today", count: 12 },
        { value: "week", label: "This Week", count: 45 },
        { value: "month", label: "This Month", count: 180 }
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "active", label: "Active Sessions", count: 8 },
        { value: "completed", label: "Completed", count: 24 },
        { value: "pending", label: "Pending", count: 5 }
      ]
    },
    {
      key: "product",
      label: "Product Type",
      type: "select",
      options: [
        { value: "pertalite", label: "Pertalite", count: 15 },
        { value: "pertamax", label: "Pertamax", count: 12 },
        { value: "solar", label: "Solar", count: 8 }
      ]
    }
  ],
  "/dashboard/orders": [
    {
      key: "status",
      label: "Order Status",
      type: "multiselect",
      options: [
        { value: "scheduled", label: "Scheduled", count: 8 },
        { value: "loading", label: "Loading", count: 3 },
        { value: "finished", label: "Finished", count: 15 },
        { value: "cancelled", label: "Cancelled", count: 2 }
      ]
    },
    {
      key: "product",
      label: "Product",
      type: "select",
      options: [
        { value: "pertalite", label: "Pertalite", count: 10 },
        { value: "pertamax", label: "Pertamax", count: 8 },
        { value: "solar", label: "Solar", count: 6 },
        { value: "pertamax-turbo", label: "Pertamax Turbo", count: 4 }
      ]
    },
    {
      key: "dateRange",
      label: "Schedule Date",
      type: "select",
      options: [
        { value: "today", label: "Today", count: 5 },
        { value: "tomorrow", label: "Tomorrow", count: 8 },
        { value: "week", label: "This Week", count: 20 }
      ]
    },
    {
      key: "driver",
      label: "Driver",
      type: "search",
      placeholder: "Search driver..."
    }
  ],
  "/dashboard/load-sessions": [
    {
      key: "sessionStatus",
      label: "Session Status",
      type: "select",
      options: [
        { value: "in-progress", label: "In Progress", count: 5 },
        { value: "completed", label: "Completed", count: 18 },
        { value: "on-hold", label: "On Hold", count: 2 }
      ]
    },
    {
      key: "timeFilter",
      label: "Time Period",
      type: "select",
      options: [
        { value: "last-hour", label: "Last Hour", count: 3 },
        { value: "today", label: "Today", count: 12 },
        { value: "yesterday", label: "Yesterday", count: 15 }
      ]
    },
    {
      key: "volume",
      label: "Volume Range",
      type: "select",
      options: [
        { value: "small", label: "< 5,000 L", count: 8 },
        { value: "medium", label: "5,000 - 8,000 L", count: 12 },
        { value: "large", label: "> 8,000 L", count: 6 }
      ]
    }
  ],
  "/dashboard/cctv": [
    {
      key: "camera",
      label: "Camera Location",
      type: "multiselect",
      options: [
        { value: "gate-a", label: "Gate A - Entry", count: 8 },
        { value: "gate-b", label: "Gate B - Exit", count: 6 },
        { value: "bay-1", label: "Loading Bay 1", count: 4 },
        { value: "bay-2", label: "Loading Bay 2", count: 5 }
      ]
    },
    {
      key: "alertType",
      label: "Alert Type",
      type: "select",
      options: [
        { value: "plate-detected", label: "Plate Detected", count: 15 },
        { value: "loading-complete", label: "Loading Complete", count: 8 },
        { value: "security-alert", label: "Security Alert", count: 2 }
      ]
    },
    {
      key: "timeRange",
      label: "Recording Time",
      type: "select",
      options: [
        { value: "live", label: "Live Feed", count: 4 },
        { value: "last-hour", label: "Last Hour", count: 12 },
        { value: "today", label: "Today", count: 28 }
      ]
    }
  ],
  "/dashboard/drivers": [
    {
      key: "status",
      label: "Driver Status",
      type: "select",
      options: [
        { value: "active", label: "Active", count: 15 },
        { value: "inactive", label: "Inactive", count: 3 },
        { value: "on-duty", label: "On Duty", count: 8 }
      ]
    },
    {
      key: "license",
      label: "License Type",
      type: "multiselect",
      options: [
        { value: "sim-b1", label: "SIM B1", count: 12 },
        { value: "sim-b2", label: "SIM B2", count: 6 }
      ]
    },
    {
      key: "experience",
      label: "Experience",
      type: "select",
      options: [
        { value: "new", label: "New (< 1 year)", count: 3 },
        { value: "experienced", label: "Experienced (1-5 years)", count: 10 },
        { value: "senior", label: "Senior (> 5 years)", count: 5 }
      ]
    }
  ],
  "/dashboard/settings": [
    {
      key: "category",
      label: "Settings Category",
      type: "select",
      options: [
        { value: "system", label: "System", count: 8 },
        { value: "security", label: "Security", count: 5 },
        { value: "notifications", label: "Notifications", count: 6 },
        { value: "appearance", label: "Appearance", count: 4 }
      ]
    },
    {
      key: "status",
      label: "Configuration Status",
      type: "select",
      options: [
        { value: "configured", label: "Configured", count: 18 },
        { value: "default", label: "Default", count: 5 },
        { value: "needs-attention", label: "Needs Attention", count: 2 }
      ]
    }
  ]
};

export function HeaderFilter({ onFilterChange }: HeaderFilterProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Get filter config for current page
  const currentFilters = PAGE_FILTER_CONFIGS[pathname] || [];

  // Close dropdown when pathname changes
  useEffect(() => {
    setIsOpen(false);
    setActiveFilters({});
  }, [pathname]);

  // Get active filters count
  const getActiveFiltersCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key];
      return value !== null && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilterChange?.({});
  };

  const renderFilterOption = (config: HeaderFilterConfig) => {
    switch (config.type) {
      case "select":
        return (
          <div key={config.key} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {config.label}
            </label>
            <div className="space-y-1">
              {config.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange(config.key, option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    activeFilters[config.key] === option.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span>{option.label}</span>
                  {option.count && (
                    <span className="text-xs text-muted-foreground">({option.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case "multiselect":
        const selectedValues = (activeFilters[config.key] as string[]) || [];
        return (
          <div key={config.key} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {config.label}
            </label>
            <div className="space-y-1">
              {config.options?.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter(v => v !== option.value)
                        : [...selectedValues, option.value];
                      handleFilterChange(config.key, newValues);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span>{option.label}</span>
                    {option.count && (
                      <span className="text-xs text-muted-foreground">({option.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "search":
        return (
          <div key={config.key} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {config.label}
            </label>
            <input
              type="text"
              placeholder={config.placeholder}
              value={(activeFilters[config.key] as string) || ''}
              onChange={(e) => handleFilterChange(config.key, e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (currentFilters.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition",
          getActiveFiltersCount() > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:text-primary"
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {getActiveFiltersCount() > 0 && (
          <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {getActiveFiltersCount()}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 shadow-[0_20px_80px_-40px_rgba(129,108,248,0.55)]">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {currentFilters.map(renderFilterOption)}
          </div>

          {getActiveFiltersCount() > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Clear All Filters ({getActiveFiltersCount()})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to get current page filters for child components
export function usePageFilters() {
  const pathname = usePathname();
  return PAGE_FILTER_CONFIGS[pathname] || [];
}