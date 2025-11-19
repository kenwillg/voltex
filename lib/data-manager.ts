import { ComponentStatus } from "@/lib/base-component";

// Types untuk data models
export interface LoadSession {
  sessionId: string;
  spNumber: string;
  licensePlate: string;
  driverName: string;
  status: ComponentStatus;
  gateIn: string;
  loading: string;
  gateOut: string;
  liters: string;
}

export interface Order {
  spNumber: string;
  licensePlate: string;
  driverId: string;
  product: string;
  planned: string;
  schedule: string;
  status: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  isActive: boolean;
}

export interface MonthlyData {
  month: string;
  orders: number;
  finished: number;
  plannedLiters: number;
  actualLiters: number;
}

export interface SummaryCardData {
  title: string;
  description: string;
  value: string;
  sublabel: string;
  icon: any; // LucideIcon type
}

// Data management class dengan OOP principles
export class DataManager {
  private static instance: DataManager;
  
  private constructor() {}

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // Mock data - in real app, this would come from API
  getLoadSessions(): LoadSession[] {
    return [
      {
        sessionId: "LS-23A9",
        spNumber: "SP-240501",
        licensePlate: "B 9087 TX",
        driverName: "Rahmat Santoso",
        status: "LOADING",
        gateIn: "08:42",
        loading: "09:05",
        gateOut: "-",
        liters: "7,500 L",
      },
      {
        sessionId: "LS-23A8",
        spNumber: "SP-240499",
        licensePlate: "B 7812 QK",
        driverName: "Adi Nugroho",
        status: "FINISHED",
        gateIn: "07:10",
        loading: "07:26",
        gateOut: "08:04",
        liters: "8,000 L",
      },
      {
        sessionId: "LS-23A7",
        spNumber: "SP-240498",
        licensePlate: "B 9821 VD",
        driverName: "Budi Cahyo",
        status: "GATE_IN",
        gateIn: "09:14",
        loading: "-",
        gateOut: "-",
        liters: "7,800 L",
      },
    ];
  }

  getOrders(): Order[] {
    return [
      {
        spNumber: "SP-240503",
        licensePlate: "B 7261 JP",
        driverId: "DRV-0142",
        product: "Pertalite",
        planned: "8,200 L",
        schedule: "18 May 2024, 13:30",
        status: "SCHEDULED",
      },
      {
        spNumber: "SP-240502",
        licensePlate: "B 9087 TX",
        driverId: "DRV-0128",
        product: "Solar",
        planned: "7,500 L",
        schedule: "18 May 2024, 08:30",
        status: "LOADING",
      },
      {
        spNumber: "SP-240501",
        licensePlate: "B 7812 QK",
        driverId: "DRV-0105",
        product: "Pertamax",
        planned: "8,000 L",
        schedule: "18 May 2024, 07:00",
        status: "FINISHED",
      },
    ];
  }

  getDrivers(): Driver[] {
    return [
      {
        id: "DRV-0142",
        name: "Satria Ramdhan",
        phone: "+62 811-4456-782",
        license: "SIM B1 19023451",
        isActive: true,
      },
      {
        id: "DRV-0128",
        name: "Rahmat Santoso",
        phone: "+62 812-8890-123",
        license: "SIM B1 18098732",
        isActive: true,
      },
      {
        id: "DRV-0094",
        name: "Didik Hartono",
        phone: "+62 813-7756-909",
        license: "SIM B2 17098123",
        isActive: false,
      },
    ];
  }

  getMonthlyData(): MonthlyData[] {
    return [
      {
        month: "May 2024",
        orders: 62,
        finished: 58,
        plannedLiters: 148_200,
        actualLiters: 141_860,
      },
      {
        month: "Apr 2024",
        orders: 57,
        finished: 53,
        plannedLiters: 136_450,
        actualLiters: 129_200,
      },
      {
        month: "Mar 2024",
        orders: 61,
        finished: 55,
        plannedLiters: 142_780,
        actualLiters: 134_640,
      },
    ];
  }

  // Utility methods
  getActiveDriversCount(): number {
    return this.getDrivers().filter(driver => driver.isActive).length;
  }

  getTodaysScheduledCount(): number {
    // Mock implementation - in real app, filter by today's date
    return 12;
  }

  getTodaysFinishedCount(): number {
    // Mock implementation - in real app, filter by today's date and finished status
    return 9;
  }

  getMonthlyCompletion(): { finished: number; total: number } {
    const currentMonth = this.getMonthlyData()[0]; // May 2024
    return {
      finished: currentMonth.finished,
      total: currentMonth.orders
    };
  }

  // Statistics calculations
  calculateMonthlyProgress(data: MonthlyData): number {
    return Math.min(100, Math.round((data.actualLiters / data.plannedLiters) * 100));
  }

  getTotalDeliveredVolume(): string {
    // Mock calculation
    return "18.6 KL";
  }
}
