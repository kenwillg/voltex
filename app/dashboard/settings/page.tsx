"use client";

import { InfoCard, Card } from "@/components/ui/card";
import { Settings, Bell, Shield, Database, Palette } from "lucide-react";

export default function SettingsPage() {
  const settingsSections = [
    {
      title: "System Configuration",
      description: "Core system settings and parameters",
      icon: Settings,
      items: [
        "Terminal capacity settings",
        "Loading bay configuration",
        "Operating hours and shifts",
        "Product type management"
      ]
    },
    {
      title: "Notifications",
      description: "Alert preferences and delivery methods",
      icon: Bell,
      items: [
        "Email notifications",
        "SMS alerts for delays",
        "Dashboard notifications",
        "Report delivery schedule"
      ]
    },
    {
      title: "Security & Access",
      description: "User management and permissions",
      icon: Shield,
      items: [
        "User roles and permissions",
        "Password policies",
        "Session management",
        "Audit log settings"
      ]
    },
    {
      title: "Data Management",
      description: "Backup and data retention policies",
      icon: Database,
      items: [
        "Automatic backup schedule",
        "Data retention period",
        "Export preferences",
        "Archive management"
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure system preferences and manage settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {settingsSections.map((section) => (
          <InfoCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={section.icon}
          >
            <div className="space-y-3">
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-background/40"
                >
                  <span className="text-sm text-foreground">{item}</span>
                  <button className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition">
                    Configure
                  </button>
                </div>
              ))}
            </div>
          </InfoCard>
        ))}
      </div>

      <InfoCard
        title="Appearance"
        description="Customize the look and feel of your dashboard"
        icon={Palette}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="status" className="cursor-pointer hover:border-primary/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Dark Theme</p>
                <p className="text-xs text-muted-foreground">Current active theme</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-primary"></div>
            </div>
          </Card>
          <Card variant="status" className="cursor-pointer hover:border-primary/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Light Theme</p>
                <p className="text-xs text-muted-foreground">Switch to light mode</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-border"></div>
            </div>
          </Card>
        </div>
      </InfoCard>
    </div>
  );
}