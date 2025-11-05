"use client";

import { InfoCard, StatusCard } from "@/components/ui/card";
import { Webcam, Camera } from "lucide-react";

const cctvData = [
  {
    sessionId: "LS-23A9",
    spNumber: "SP-240501",
    licensePlate: "B 9087 TX",
    driverName: "Rahmat Santoso",
    cctv: "storage/cctv/B9087TX-20240518-1.jpg",
  },
  {
    sessionId: "LS-23A8",
    spNumber: "SP-240499",
    licensePlate: "B 7812 QK",
    driverName: "Adi Nugroho",
    cctv: "storage/cctv/B7812QK-20240518-1.jpg",
  },
  {
    sessionId: "LS-23A7",
    spNumber: "SP-240498",
    licensePlate: "B 9821 VD",
    driverName: "Budi Cahyo",
    cctv: "storage/cctv/B9821VD-20240518-1.jpg",
  },
];

export default function CCTVPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">CCTV Monitoring</h1>
        <p className="text-muted-foreground">Real-time surveillance and plate recognition system</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="CCTV Highlights"
          description="Quick links to latest plate recognition"
          icon={Webcam}
        >
          <div className="space-y-4">
            {cctvData.map((item) => (
              <StatusCard
                key={item.sessionId}
                title={item.licensePlate}
                subtitle={`${item.spNumber} • ${item.driverName}`}
                status={item.cctv.split("/").pop() || ""}
              />
            ))}
          </div>
        </InfoCard>

        <InfoCard
          title="Live Camera Feeds"
          description="Active monitoring stations"
          icon={Camera}
        >
          <div className="grid gap-4">
            <div className="aspect-video rounded-2xl bg-muted/20 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Gate A - Entry</p>
              </div>
            </div>
            <div className="aspect-video rounded-2xl bg-muted/20 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading Bay 1</p>
              </div>
            </div>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}