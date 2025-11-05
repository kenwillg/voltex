import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

/**
 * Abstract base class untuk semua komponen UI
 * Menyediakan struktur dasar dan styling konsisten
 */
export abstract class BaseComponent {
  protected className: string;
  protected baseStyles: string;

  constructor(className: string = "") {
    this.className = className;
    this.baseStyles = this.getBaseStyles();
  }

  /**
   * Method abstrak yang harus diimplementasikan oleh child classes
   */
  protected abstract getBaseStyles(): string;

  /**
   * Menggabungkan class names dengan base styles
   */
  protected combineClasses(...classes: (string | undefined)[]): string {
    return [this.baseStyles, this.className, ...classes]
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Menghasilkan shadow effect yang konsisten
   */
  protected getShadowStyles(intensity: "light" | "medium" | "heavy" = "medium"): string {
    switch (intensity) {
      case "light":
        return "shadow-[0_20px_60px_-40px_rgba(129,108,248,0.45)]";
      case "medium":
        return "shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]";
      case "heavy":
        return "shadow-[0_40px_120px_-60px_rgba(129,108,248,0.85)]";
      default:
        return "shadow-[0_30px_90px_-60px_rgba(129,108,248,0.65)]";
    }
  }

  /**
   * Menghasilkan border styles yang konsisten
   */
  protected getBorderStyles(): string {
    return "border border-border/60";
  }

  /**
   * Menghasilkan background styles yang konsisten
   */
  protected getBackgroundStyles(): string {
    return "bg-card/80";
  }

  /**
   * Menghasilkan rounded styles yang konsisten
   */
  protected getRoundedStyles(): string {
    return "rounded-3xl";
  }

  /**
   * Menghasilkan transition styles yang konsisten
   */
  protected getTransitionStyles(): string {
    return "transition-all duration-300";
  }

  /**
   * Menghasilkan hover effects yang konsisten
   */
  protected getHoverStyles(): string {
    return "hover:shadow-[0_40px_120px_-60px_rgba(129,108,248,0.85)]";
  }
}

/**
 * Interface untuk props komponen yang memiliki icon
 */
export interface IconComponentProps {
  icon?: LucideIcon;
  iconSize?: "sm" | "md" | "lg";
  iconColor?: string;
}

/**
 * Interface untuk props komponen yang memiliki children
 */
export interface ComponentWithChildren {
  children?: ReactNode;
}

/**
 * Interface untuk props komponen yang dapat diklik
 */
export interface ClickableComponentProps {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

/**
 * Type untuk status yang umum digunakan
 */
export type ComponentStatus = 
  | "SCHEDULED" 
  | "GATE_IN" 
  | "QUEUED" 
  | "LOADING" 
  | "GATE_OUT" 
  | "FINISHED"
  | "CANCELLED" 
  | "REJECTED" 
  | "ON_HOLD";

/**
 * Interface untuk data status dengan styling
 */
export interface StatusConfig {
  key: ComponentStatus;
  label: string;
  description?: string;
  badge?: string;
  color?: string;
}

/**
 * Utility class untuk mengelola status dan styling
 */
export class StatusManager {
  private static statusConfigs: Record<ComponentStatus, StatusConfig> = {
    SCHEDULED: { 
      key: "SCHEDULED", 
      label: "Scheduled", 
      description: "Awaiting arrival",
      badge: "bg-blue-500/20 text-blue-200",
      color: "text-blue-500"
    },
    GATE_IN: { 
      key: "GATE_IN", 
      label: "Gate In", 
      description: "Arrived at terminal gate",
      badge: "bg-yellow-500/20 text-yellow-200",
      color: "text-yellow-500"
    },
    QUEUED: { 
      key: "QUEUED", 
      label: "Queued", 
      description: "Waiting for bay assignment",
      badge: "bg-orange-500/20 text-orange-200",
      color: "text-orange-500"
    },
    LOADING: { 
      key: "LOADING", 
      label: "Loading", 
      description: "Fuel loading in progress",
      badge: "bg-indigo-500/20 text-indigo-200",
      color: "text-indigo-500"
    },
    GATE_OUT: { 
      key: "GATE_OUT", 
      label: "Gate Out", 
      description: "Departing terminal",
      badge: "bg-purple-500/20 text-purple-200",
      color: "text-purple-500"
    },
    FINISHED: { 
      key: "FINISHED", 
      label: "Finished", 
      description: "Delivery cycle complete",
      badge: "bg-emerald-500/20 text-emerald-200",
      color: "text-emerald-500"
    },
    CANCELLED: { 
      key: "CANCELLED", 
      label: "Cancelled",
      badge: "bg-rose-500/20 text-rose-200",
      color: "text-rose-500"
    },
    REJECTED: { 
      key: "REJECTED", 
      label: "Rejected",
      badge: "bg-amber-500/20 text-amber-200",
      color: "text-amber-500"
    },
    ON_HOLD: { 
      key: "ON_HOLD", 
      label: "On Hold",
      badge: "bg-sky-500/20 text-sky-200",
      color: "text-sky-500"
    }
  };

  static getStatusConfig(status: ComponentStatus): StatusConfig {
    return this.statusConfigs[status];
  }

  static getAllStatusConfigs(): StatusConfig[] {
    return Object.values(this.statusConfigs);
  }

  static getStatusBadgeClass(status: ComponentStatus): string {
    return this.statusConfigs[status]?.badge || "bg-muted text-muted-foreground";
  }

  static getStatusColor(status: ComponentStatus): string {
    return this.statusConfigs[status]?.color || "text-muted-foreground";
  }
}