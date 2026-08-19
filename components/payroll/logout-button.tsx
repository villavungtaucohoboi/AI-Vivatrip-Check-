"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function LogoutButton({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/payroll/logout", { method: "POST" });
    router.replace("/payroll/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:bg-paper-dim hover:text-ink"
    >
      {children}
      Đăng xuất
    </button>
  );
}
