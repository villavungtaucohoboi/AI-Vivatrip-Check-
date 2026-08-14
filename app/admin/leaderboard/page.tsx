import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { LeaderboardManager } from "@/components/admin/leaderboard-manager";
import type { LeaderboardEntry } from "@/lib/leaderboard-types";

export default async function AdminLeaderboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("sales_leaderboard").select("*").order("rank");

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role="admin" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại quản lý sản phẩm
        </Link>
        <h1 className="mb-1 font-display text-2xl text-ink">Băng chữ chạy Top 3</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Hiện trên đầu mọi trang. Sửa tay hằng ngày — app hiện chưa tự tính doanh số theo từng Sale.
        </p>
        <LeaderboardManager initial={(data ?? []) as LeaderboardEntry[]} />
      </main>
      <BottomNav role="admin" />
    </div>
  );
}
