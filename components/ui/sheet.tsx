"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ open, onOpenChange, title, children, footer }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative ml-auto flex w-full flex-col bg-white shadow-float",
          "max-h-[85vh] rounded-t-2xl mt-auto",
          "sm:h-full sm:max-h-none sm:w-96 sm:rounded-t-none sm:rounded-l-2xl sm:mt-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-ink-muted hover:bg-paper-dim"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border px-5 py-4 flex gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
