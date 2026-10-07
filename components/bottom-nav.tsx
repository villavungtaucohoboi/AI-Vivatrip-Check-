"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarClock, Dices, MoreHorizontal, PartyPopper, Plus, Search, Settings, Ship, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientRole } from "@/lib/use-client-role";
import type { UserRole } from "@/lib/types";

export function BottomNav({ role: initialRole }: { role: UserRole }) {
  const role = useClientRole(initialRole);
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const onHolidayFunds = pathname.startsWith("/holiday-funds");

  useEffect(() => setMoreOpen(false), [pathname]);

  if (pathname === "/admin/login" || pathname.startsWith("/payroll")) return null;

  // 4 mục dùng nhiều nhất nằm sẵn trên thanh; phần còn lại gom vào "Thêm".
  const main = [
    { href: "/search", label: "Villa", icon: Search },
    { href: "/search-resort", label: "Resort/Hotel", icon: Building2 },
    { href: "/cruises", label: "Du thuyền", icon: Ship },
    { href: "/availability-links", label: "Link lịch", icon: CalendarClock },
  ];
  const more = [
    { href: "/holiday-funds", label: "Quỹ ngày lễ", icon: PartyPopper },
    { href: "/daily-wishes", label: "Lời chúc", icon: Dices },
    { href: "/payroll", label: "Bảng lương", icon: Wallet },
    ...(role === "admin" ? [{ href: "/admin/products", label: "Quản lý", icon: Settings }] : []),
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = more.some((m) => isActive(m.href));

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

      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-[12px] font-bold text-ink-muted">Công cụ khác</p>
            <div className="grid grid-cols-3 gap-2">
              {more.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-[12px] font-bold",
                    isActive(href) ? "bg-teal-light text-teal-dark" : "bg-paper text-ink"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {main.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-bold leading-tight",
                isActive(href) ? "text-teal" : "text-ink-muted"
              )}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-bold leading-tight",
              moreActive || moreOpen ? "text-teal" : "text-ink-muted"
            )}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            Thêm
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
