"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { InfoCard } from "@/components/ui/card";

interface ExpectedOrder {
  id: string;
  spNumber: string;
  driverName: string;
  licensePlate: string;
  scheduledAt: string;
  product: string;
  plannedLiters: string;
  status: string;
}

const formatFullTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

export default function GatePage() {
  // expected orders for today
  const [expectedOrders, setExpectedOrders] = useState<ExpectedOrder[]>(
    [],
  );

  // --- expected orders (today only) -------------------------------------------------
  useEffect(() => {
    const loadExpected = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filtered: ExpectedOrder[] = data
          .filter((o: any) => {
            const when = new Date(o.scheduledAt);
            return when >= todayStart && when < tomorrow;
          })
          .map((o: any) => ({
            id: o.id,
            spNumber: o.spNumber,
            driverName: o.driver?.name ?? "-",
            licensePlate: o.vehicle?.licensePlate ?? "-",
            scheduledAt: o.scheduledAt,
            product: o.product,
            plannedLiters: o.plannedLiters?.toString() ?? "-",
            status: o.status ?? "SCHEDULED",
          }));

        setExpectedOrders(filtered);
      } catch (err) {
        console.error("Failed to load expected orders", err);
      }
    };

    loadExpected();
  }, []);

  // --- UI ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">
          Terminal Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Gate Entry &amp; Exit
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View today's expected orders scheduled for gate entry and exit.
        </p>
      </div>

      <div className="grid gap-6">
        <InfoCard
          title="Expected Arrivals Today"
          description="All trucks with a scheduled order for today"
          icon={History}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">SP Number</th>
                  <th className="pb-3 pr-4 font-medium">Driver</th>
                  <th className="pb-3 pr-4 font-medium">Vehicle</th>
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Planned</th>
                  <th className="pb-3 pr-4 font-medium">Scheduled</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {expectedOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-border/60 text-sm"
                  >
                    <td className="py-3 pr-4 font-semibold text-foreground">
                      {o.spNumber}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">
                        {o.driverName}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.licensePlate}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.product}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {o.plannedLiters} L
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatFullTime(o.scheduledAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {expectedOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      No scheduled orders for today yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
