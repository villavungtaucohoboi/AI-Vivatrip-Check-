"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, CalendarClock, ChevronDown, Dices, Lock, PartyPopper, Plus, Search, Settings, Ship, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientRole } from "@/lib/use-client-role";
import type { UserRole } from "@/lib/types";

export function Header({ role: initialRole }: { role: UserRole }) {
  const role = useClientRole(initialRole);
  const pathname = usePathname();
  const router = useRouter();
  const inAdminArea = pathname.startsWith("/admin");

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/search");
    router.refresh();
  }

  // Trang gác cổng Admin không nên hiện sẵn menu điều hướng trước khi đăng nhập
  if (pathname === "/admin/login" || pathname.startsWith("/payroll")) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreItems: { href: string; label: string; icon: typeof Search }[] = [
    { href: "/holiday-funds", label: "Quỹ ngày lễ", icon: PartyPopper },
    { href: "/daily-wishes", label: "Lời chúc", icon: Dices },
    { href: "/payroll", label: "Bảng lương", icon: Wallet },
    ...(role === "admin" ? [{ href: "/admin/products", label: "Quản lý sản phẩm", icon: Settings }] : []),
  ];
  const moreActive = moreItems.some((m) => isActive(m.href));

  const navItem = (href: string, label: string, Icon: typeof Search) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
        pathname === href || pathname.startsWith(href + "/")
          ? "bg-teal-light text-teal-dark"
          : "text-ink-muted hover:bg-paper-dim hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/search" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white font-bold text-base">
            V
          </div>
          <span className="hidden text-[17px] font-bold text-ink sm:block">
            VivaTrip
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 sm:flex">
          {navItem("/search", "Tìm Villa", Search)}
          {navItem("/search-resort", "Tìm Resort/Hotel", Building2)}
          {navItem("/cruises", "Du thuyền", Ship)}
          {navItem("/availability-links", "Link check lịch", CalendarClock)}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                moreActive || moreOpen ? "bg-teal-light text-teal-dark" : "text-ink-muted hover:bg-paper-dim hover:text-ink"
              )}
            >
              Thêm
              <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-float">
                {moreItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                      isActive(href) ? "bg-teal-light text-teal-dark" : "text-ink hover:bg-paper-dim"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {role === "admin" && (
            <Link href="/admin/products/new">
              <span className="ml-1 flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-dark">
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </span>
            </Link>
          )}
        </nav>

        {role === "admin" && inAdminArea && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-paper-dim hover:text-ink"
            aria-label="Khóa lại khu vực Admin"
            title="Khóa lại khu vực Admin"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
