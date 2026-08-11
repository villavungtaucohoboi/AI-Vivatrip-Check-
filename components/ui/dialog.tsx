"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-white p-5 shadow-float",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-ink-muted hover:bg-paper-dim"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {description && (
          <p className="text-sm text-ink-muted mb-4">{description}</p>
        )}
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
