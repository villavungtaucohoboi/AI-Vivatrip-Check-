"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, Dices, Lock, PartyPopper, Plus, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientRole } from "@/lib/use-client-role";
import type { UserRole } from "@/lib/types";

export function Header({ role: initialRole }: { role: UserRole }) {
  const role = useClientRole(initialRole);
  const pathname = usePathname();
  const router = useRouter();
  const inAdminArea = pathname.startsWith("/admin");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/search");
    router.refresh();
  }

  // Trang gác cổng Admin không nên hiện sẵn menu điều hướng trước khi đăng nhập
  if (pathname === "/admin/login") return null;

  const navItem = (href: string, label: string, Icon: typeof Search) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
        pathname.startsWith(href)
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
          {navItem("/search", "Tìm sản phẩm", Search)}
          {navItem("/holiday-funds", "Quỹ ngày lễ", PartyPopper)}
          {navItem("/availability-links", "Link check lịch", CalendarClock)}
          {navItem("/daily-wishes", "Lời chúc", Dices)}
          {role === "admin" && navItem("/admin/products", "Quản lý sản phẩm", Settings)}
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
