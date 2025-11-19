"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { BaseComponent } from "@/lib/base-component";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterConfig {
  key: string;
  label: string;
  type: "search" | "select" | "multiselect" | "date";
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterState {
  [key: string]: string | string[] | Date | null;
}

interface FilterSystemProps {
  configs: FilterConfig[];
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

class FilterComponent extends BaseComponent {
  protected getBaseStyles(): string {
    return "flex items-center gap-3 flex-wrap";
  }

  getSearchInputStyles(): string {
    return cn(
      "flex-1 min-w-[200px] rounded-2xl border border-border/70 bg-background/60",
      "px-4 py-2 pl-10 text-sm text-foreground placeholder:text-muted-foreground",
      "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
    );
  }

  getFilterButtonStyles(isActive: boolean): string {
    const base = cn(
      "inline-flex items-center gap-2 rounded-2xl border px-4 py-2",
      "text-sm font-medium transition"
    );

    return isActive
      ? cn(base, "border-primary/40 bg-primary/10 text-primary")
      : cn(base, "border-border/60 text-muted-foreground hover:text-foreground");
  }

  getDropdownStyles(): string {
    return cn(
      "absolute top-full left-0 z-10 mt-2 min-w-[200px] rounded-2xl",
      this.getBorderStyles(),
      this.getBackgroundStyles(),
      this.getShadowStyles("medium"),
      "py-2 max-h-60 overflow-y-auto"
    );
  }

  public render(): {
    containerClass: string;
    searchInputClass: string;
    dropdownClass: string;
  } {
    return {
      containerClass: this.getBaseStyles(),
      searchInputClass: this.getSearchInputStyles(),
      dropdownClass: this.getDropdownStyles()
    };
  }
}

const filterComponent = new FilterComponent();

export function FilterSystem({ configs, onFilterChange, className }: FilterSystemProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { containerClass, searchInputClass, dropdownClass } = filterComponent.render();

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (key: string, value: string | string[] | Date | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key];
      return value !== null && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  };

  const renderSearchFilter = (config: FilterConfig) => (
    <div key={config.key} className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={config.placeholder || `Search ${config.label.toLowerCase()}...`}
        value={(filters[config.key] as string) || ''}
        onChange={(e) => handleFilterChange(config.key, e.target.value)}
        className={searchInputClass}
      />
      {filters[config.key] && (
        <button
          onClick={() => clearFilter(config.key)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const renderSelectFilter = (config: FilterConfig) => (
    <div key={config.key} className="relative">
      <button
        onClick={() => setActiveDropdown(activeDropdown === config.key ? null : config.key)}
        className={filterComponent.getFilterButtonStyles(!!filters[config.key])}
      >
        <Filter className="h-4 w-4" />
        {config.label}
        {filters[config.key] && (
          <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            1
          </span>
        )}
        <ChevronDown className="h-4 w-4" />
      </button>

      {activeDropdown === config.key && (
        <div className={dropdownClass}>
          {config.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                handleFilterChange(config.key, option.value);
                setActiveDropdown(null);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition",
                filters[config.key] === option.value
                  ? "bg-primary/10 text-primary"
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
      )}
    </div>
  );

  const renderMultiSelectFilter = (config: FilterConfig) => {
    const selectedValues = (filters[config.key] as string[]) || [];
    
    return (
      <div key={config.key} className="relative">
        <button
          onClick={() => setActiveDropdown(activeDropdown === config.key ? null : config.key)}
          className={filterComponent.getFilterButtonStyles(selectedValues.length > 0)}
        >
          <Filter className="h-4 w-4" />
          {config.label}
          {selectedValues.length > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {selectedValues.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </button>

        {activeDropdown === config.key && (
          <div className={dropdownClass}>
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
                    "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition",
                    isSelected
                      ? "bg-primary/10 text-primary"
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
        )}
      </div>
    );
  };

  const renderDateFilter = (config: FilterConfig) => (
    <div key={config.key} className="relative">
      <input
        type="date"
        value={filters[config.key] ? (filters[config.key] as Date).toISOString().slice(0, 10) : ''}
        onChange={(e) => handleFilterChange(config.key, e.target.value ? new Date(e.target.value) : null)}
        className={cn(
          "rounded-2xl border border-border/70 bg-background/60 px-4 py-2",
          "text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
        )}
      />
      {filters[config.key] && (
        <button
          onClick={() => clearFilter(config.key)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className={cn(containerClass, className)}>
      {configs.map((config) => {
        switch (config.type) {
          case "search":
            return renderSearchFilter(config);
          case "select":
            return renderSelectFilter(config);
          case "multiselect":
            return renderMultiSelectFilter(config);
          case "date":
            return renderDateFilter(config);
          default:
            return null;
        }
      })}

      {getActiveFiltersCount() > 0 && (
        <button
          onClick={clearAllFilters}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear All ({getActiveFiltersCount()})
        </button>
      )}
    </div>
  );
}

// Hook untuk menggunakan filter dengan data
export function useDataFilter<T>(data: T[], filters: FilterState, filterConfigs: FilterConfig[]) {
  return data.filter((item) => {
    return filterConfigs.every((config) => {
      const filterValue = filters[config.key];
      
      if (!filterValue || 
          (typeof filterValue === 'string' && filterValue === '') ||
          (Array.isArray(filterValue) && filterValue.length === 0)) {
        return true;
      }

      const itemValue = (item as any)[config.key];
      
      switch (config.type) {
        case "search":
          return itemValue?.toString().toLowerCase().includes((filterValue as string).toLowerCase());
        
        case "select":
          return itemValue === filterValue;
        
        case "multiselect":
          return (filterValue as string[]).includes(itemValue);
        
        case "date":
          // Implement date filtering logic based on your needs
          return true;
        
        default:
          return true;
      }
    });
  });
}