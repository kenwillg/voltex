"use client";

import { ReactNode } from "react";
import { StatusProvider } from "@/contexts/status-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return <StatusProvider>{children}</StatusProvider>;
}
