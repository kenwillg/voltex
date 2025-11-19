"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LucideIcon, ChevronRight, QrCode, LogOut } from "lucide-react";
import { BaseComponent } from "@/lib/base-component";
import { cn } from "@/lib/utils";

/**
 * Interface untuk navigation item
 */
interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavigationItem[];
}

/**
 * Interface untuk Sidebar props
 */
interface SidebarProps {
  navigation: NavigationItem[];
  logo?: {
    text: string;
    subtitle?: string;
    initials?: string;
  };
  actions?: ReactNode;
  className?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

/**
 * Class untuk Sidebar component yang reusable
 */
class SidebarComponent extends BaseComponent {
  protected getBaseStyles(): string {
    return cn(
      "fixed inset-y-0 left-0 z-40 w-72",
      this.getBorderStyles().replace("border", "border-r"),
      "bg-card/80/70 backdrop-blur-xl transition-transform duration-300",
      this.getShadowStyles("heavy")
    );
  }

  getToggleStyles(isOpen: boolean): string {
    return isOpen 
      ? "translate-x-0" 
      : "-translate-x-full lg:translate-x-0";
  }

  getLogoStyles(): string {
    return cn(
      "flex h-12 w-12 items-center justify-center rounded-2xl",
      "border-2 border-dashed border-primary/60",
      "text-xs font-semibold uppercase tracking-[0.24em] text-primary"
    );
  }

  getNavItemStyles(isActive: boolean): string {
    const base = cn(
      "group flex items-center gap-3 rounded-2xl px-4 py-3",
      "text-sm font-medium transition"
    );

    return isActive
      ? cn(base, "bg-primary/10 text-primary")
      : cn(base, "text-muted-foreground hover:bg-primary/10 hover:text-primary");
  }

  getActionButtonStyles(variant: "primary" | "secondary"): string {
    const base = cn(
      "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3",
      "text-sm font-semibold transition"
    );

    return variant === "primary"
      ? cn(base, "bg-primary/10 text-primary hover:bg-primary/20")
      : cn(base, "border border-border/60 text-muted-foreground hover:text-foreground");
  }

  render(props: Pick<SidebarProps, 'className' | 'open'>): string {
    const { className = "", open = false } = props;
    
    return this.combineClasses(
      this.getToggleStyles(open),
      className
    );
  }
}

// Instance untuk digunakan
const sidebarComponent = new SidebarComponent();

/**
 * Sidebar Component dengan OOP principles
 */
export function Sidebar({
  navigation,
  logo,
  actions,
  className,
  open = false,
  onToggle
}: SidebarProps) {
  const pathname = usePathname();
  const sidebarClasses = sidebarComponent.render({ className, open });

  return (
    <aside className={sidebarClasses}>
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            {logo && (
              <>
                <span className={sidebarComponent.getLogoStyles()}>
                  {logo.initials || "DM"}
                </span>
                <div>
                  {logo.subtitle && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {logo.subtitle}
                    </p>
                  )}
                  <p className="text-lg font-semibold text-foreground">
                    {logo.text}
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            className="rounded-xl border border-border/60 p-2 text-muted-foreground transition hover:text-foreground lg:hidden"
            onClick={() => onToggle?.(!open)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.label}
                href={item.href}
                className={sidebarComponent.getNavItemStyles(isActive)}
              >
                <item.icon className="h-4 w-4 text-primary transition group-hover:scale-110" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions Section */}
        <div className="space-y-3 border-t border-border/60 px-6 py-6">
          <button className={sidebarComponent.getActionButtonStyles("primary")}>
            <QrCode className="h-4 w-4" /> Generate Driver QR
          </button>
          <button className={sidebarComponent.getActionButtonStyles("secondary")}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          {actions}
        </div>
      </div>
    </aside>
  );
}

/**
 * Interface untuk Mobile Menu Toggle props
 */
interface MobileMenuToggleProps {
  open: boolean;
  onToggle: (open: boolean) => void;
  className?: string;
}

/**
 * Mobile Menu Toggle Component
 */
export function MobileMenuToggle({ open, onToggle, className }: MobileMenuToggleProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl border border-border/60 p-2",
        "text-muted-foreground transition hover:text-foreground lg:hidden",
        className
      )}
      onClick={() => onToggle(!open)}
      type="button"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
        />
      </svg>
    </button>
  );
}

/**
 * Hook untuk manage sidebar state
 */
export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    toggle,
    open,
    close,
    setIsOpen
  };
}