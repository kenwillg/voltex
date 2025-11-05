"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseComponent, IconComponentProps, ComponentWithChildren, ClickableComponentProps } from "@/lib/base-component";
import { cn } from "@/lib/utils";

/**
 * Interface untuk props Card component
 */
interface BaseCardProps extends ComponentWithChildren, ClickableComponentProps {
  className?: string;
  variant?: "default" | "summary" | "info" | "status";
  size?: "sm" | "md" | "lg";
  hover?: boolean;
}

/**
 * Class untuk Card component yang reusable
 */
class CardComponent extends BaseComponent {
  protected getBaseStyles(): string {
    return cn(
      this.getRoundedStyles(),
      this.getBorderStyles(),
      this.getBackgroundStyles(),
      "p-6 overflow-hidden"
    );
  }

  getSizeStyles(size: "sm" | "md" | "lg"): string {
    switch (size) {
      case "sm":
        return "p-4";
      case "md":
        return "p-6";
      case "lg":
        return "p-8";
      default:
        return "p-6";
    }
  }

  getVariantStyles(variant: "default" | "summary" | "info" | "status"): string {
    const baseVariant = cn(
      this.getShadowStyles("medium"),
      this.getTransitionStyles()
    );

    switch (variant) {
      case "summary":
        return cn(baseVariant, "group relative");
      case "info":
        return cn(baseVariant, "border-primary/20");
      case "status":
        return cn(baseVariant, "bg-background/40");
      default:
        return baseVariant;
    }
  }

  getHoverEffect(hover: boolean): string {
    if (!hover) return "";
    return this.getHoverStyles();
  }

  render(props: BaseCardProps): string {
    const { variant = "default", size = "md", hover = false, className = "" } = props;
    
    return this.combineClasses(
      this.getVariantStyles(variant),
      this.getSizeStyles(size),
      this.getHoverEffect(hover),
      className
    );
  }
}

// Instance untuk digunakan
const cardComponent = new CardComponent();

/**
 * Card Component dengan OOP principles
 */
export function Card({ 
  children, 
  className, 
  variant = "default", 
  size = "md", 
  hover = false,
  onClick,
  href
}: BaseCardProps) {
  const cardClasses = cardComponent.render({ variant, size, hover, className });
  
  const CardElement = href ? "a" : onClick ? "button" : "div";
  
  return (
    <CardElement
      className={cardClasses}
      onClick={onClick}
      href={href}
      {...(onClick && { type: "button" })}
    >
      {children}
    </CardElement>
  );
}

/**
 * Interface untuk Summary Card props
 */
interface SummaryCardProps extends IconComponentProps {
  title: string;
  description: string;
  value: string;
  sublabel: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Summary Card Component menggunakan OOP
 */
export function SummaryCard({
  title,
  description,
  value,
  sublabel,
  icon: Icon,
  className,
  onClick
}: SummaryCardProps) {
  return (
    <Card variant="summary" hover className={className} onClick={onClick}>
      {Icon && (
        <Icon className="h-10 w-10 text-primary/70 transition group-hover:scale-110" />
      )}
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{sublabel}</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

/**
 * Interface untuk Info Card props
 */
interface InfoCardProps extends IconComponentProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

/**
 * Info Card Component untuk sections
 */
export function InfoCard({
  title,
  description,
  children,
  icon: Icon,
  className,
  actions
}: InfoCardProps) {
  return (
    <Card variant="info" className={className}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          {actions}
        </div>
      </div>
      <div className="mt-6">
        {children}
      </div>
    </Card>
  );
}

/**
 * Interface untuk Status Card props
 */
interface StatusCardProps {
  title: string;
  subtitle: string;
  status: string;
  statusColor?: string;
  className?: string;
}

/**
 * Status Card Component untuk list items
 */
export function StatusCard({
  title,
  subtitle,
  status,
  statusColor = "text-muted-foreground",
  className
}: StatusCardProps) {
  return (
    <Card variant="status" size="sm" className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className={cn("text-xs", statusColor)}>{status}</span>
      </div>
    </Card>
  );
}