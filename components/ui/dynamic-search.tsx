"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchField {
  key: string;
  label: string;
  placeholder: string;
}

interface DynamicSearchConfig {
  [pagePath: string]: SearchField[];
}

interface DynamicSearchProps {
  onSearchChange: (searchTerm: string, field: string) => void;
  currentPath: string;
  className?: string;
}

// Konfigurasi search untuk setiap halaman
const PAGE_SEARCH_CONFIGS: DynamicSearchConfig = {
  "/dashboard/drivers": [
    { key: "name", label: "Driver Name", placeholder: "Search by driver name..." },
    { key: "id", label: "Driver ID", placeholder: "Search by driver ID..." },
    { key: "license", label: "License", placeholder: "Search by license type..." },
  ],
  "/dashboard/orders": [
    { key: "spNumber", label: "SP Number", placeholder: "Search by SP number..." },
    { key: "licensePlate", label: "License Plate", placeholder: "Search by license plate..." },
    { key: "driverId", label: "Driver ID", placeholder: "Search by driver ID..." },
  ],
  "/dashboard/load-sessions": [
    { key: "sessionId", label: "Session ID", placeholder: "Search by session ID..." },
    { key: "licensePlate", label: "License Plate", placeholder: "Search by license plate..." },
    { key: "driverName", label: "Driver Name", placeholder: "Search by driver name..." },
  ],
  "/dashboard/cctv": [
    { key: "sessionId", label: "Session ID", placeholder: "Search by session ID..." },
    { key: "licensePlate", label: "License Plate", placeholder: "Search by license plate..." },
  ],
  "/dashboard": [
    { key: "general", label: "General", placeholder: "Search data..." },
  ]
};

export default function DynamicSearch({ onSearchChange, currentPath, className }: DynamicSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState(() => {
    const fields = PAGE_SEARCH_CONFIGS[currentPath] || PAGE_SEARCH_CONFIGS["/dashboard"];
    return fields[0]?.key || "general";
  });

  const searchFields = PAGE_SEARCH_CONFIGS[currentPath] || PAGE_SEARCH_CONFIGS["/dashboard"];
  const currentField = searchFields.find(f => f.key === selectedField) || searchFields[0];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value, selectedField);
  };

  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    onSearchChange(searchTerm, field);
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 border rounded-lg bg-background/50 border-border/60 backdrop-blur-sm",
      className
    )}>
      {/* Search Icon */}
      <Search className="w-4 h-4 text-muted-foreground" />
      
      {/* Search Input */}
      <input
        type="text"
        placeholder={currentField?.placeholder || "Search..."}
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
      />
      
      {/* Field Selector - Only show if multiple fields available */}
      {searchFields.length > 1 && (
        <select
          value={selectedField}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          {searchFields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}