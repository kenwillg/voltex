"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface FilterContextType {
  headerFilters: Record<string, any>;
  setHeaderFilters: (filters: Record<string, any>) => void;
  pageFilters: Record<string, any>;
  setPageFilters: (filters: Record<string, any>) => void;
  clearAllFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [headerFilters, setHeaderFilters] = useState<Record<string, any>>({});
  const [pageFilters, setPageFilters] = useState<Record<string, any>>({});

  const clearAllFilters = () => {
    setHeaderFilters({});
    setPageFilters({});
  };

  return (
    <FilterContext.Provider
      value={{
        headerFilters,
        setHeaderFilters,
        pageFilters,
        setPageFilters,
        clearAllFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}

// Combined filters hook that merges header and page filters
export function useCombinedFilters() {
  const { headerFilters, pageFilters } = useFilterContext();
  
  return {
    ...headerFilters,
    ...pageFilters
  };
}