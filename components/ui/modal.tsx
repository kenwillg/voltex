"use client";

import { ReactNode, useState } from "react";
import { X } from "lucide-react";
import { BaseComponent } from "@/lib/base-component";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

class ModalComponent extends BaseComponent {
  protected getBaseStyles(): string {
    return "fixed inset-0 z-[100] flex items-center justify-center p-4";
  }

  getOverlayStyles(): string {
    return "fixed inset-0 bg-background/80 backdrop-blur-sm";
  }

  getContentStyles(size: "sm" | "md" | "lg" | "xl"): string {
    const base = cn(
      "relative w-full max-h-[90vh] overflow-hidden",
      this.getRoundedStyles(),
      this.getBorderStyles(),
      this.getBackgroundStyles(),
      this.getShadowStyles("heavy"),
      "animate-in fade-in-0 zoom-in-95"
    );

    switch (size) {
      case "sm":
        return cn(base, "max-w-sm");
      case "md":
        return cn(base, "max-w-md");
      case "lg":
        return cn(base, "max-w-lg");
      case "xl":
        return cn(base, "max-w-2xl");
      default:
        return cn(base, "max-w-md");
    }
  }

  public render(props: Pick<ModalProps, 'size'>): {
    overlayClass: string;
    contentClass: string;
    containerClass: string;
  } {
    const { size = "md" } = props;

    return {
      containerClass: this.getBaseStyles(),
      overlayClass: this.getOverlayStyles(),
      contentClass: this.getContentStyles(size)
    };
  }
}

const modalComponent = new ModalComponent();

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  const { containerClass, overlayClass, contentClass } = modalComponent.render({ size });

  return (
    <div className={containerClass}>
      <div className={overlayClass} onClick={onClose} />
      <div className={contentClass}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-border/60 p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Hook untuk manage modal state
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
}