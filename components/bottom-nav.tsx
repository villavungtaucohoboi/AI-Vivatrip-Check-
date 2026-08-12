"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartyPopper, Plus, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const onHolidayFunds = pathname.startsWith("/holiday-funds");

  const items = [
    { href: "/search", label: "Tìm sản phẩm", icon: Search },
    { href: "/holiday-funds", label: "Quỹ ngày lễ", icon: PartyPopper },
    ...(role === "admin"
      ? [{ href: "/admin/products", label: "Quản lý", icon: Settings }]
      : []),
  ];

  return (
    <>
      {role === "admin" && !onHolidayFunds && (
        <Link
          href="/admin/products/new"
          className="fixed bottom-20 right-4 z-30 flex items-center justify-center rounded-full bg-teal text-white shadow-float sm:hidden"
          style={{ height: "3.25rem", width: "3.25rem" }}
          aria-label="Thêm sản phẩm"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur sm:hidden">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-teal" : "text-ink-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
