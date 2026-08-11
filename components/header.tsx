"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, Search, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export function Header({ role, name }: { role: UserRole; name?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

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

  const initials = (name || "VT").trim().slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/search" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white font-bold text-base">
            V
          </div>
          <span className="hidden text-[17px] font-bold text-ink sm:block">
            VivaTrip Product Finder
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 sm:flex">
          {navItem("/search", "Tìm sản phẩm", Search)}
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

        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-light text-[12px] font-semibold text-teal-dark"
            title={name ?? undefined}
          >
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-paper-dim hover:text-ink"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
