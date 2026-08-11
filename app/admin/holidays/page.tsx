import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { HolidaysManager } from "@/components/admin/holidays-manager";
import type { Holiday } from "@/lib/types";

export default async function AdminHolidaysPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: holidays } = await supabase.from("holidays").select("*");

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role={profile?.role ?? "admin"} name={profile?.name} />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại quản lý sản phẩm
        </Link>
        <h1 className="mb-1 font-display text-2xl text-ink">Ngày lễ</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Những ngày này luôn dùng giá Thứ 7 & Ngày lễ cho villa/resort, kể cả khi rơi vào Thứ 2 - Thứ 6.
        </p>
        <HolidaysManager initialHolidays={(holidays ?? []) as Holiday[]} />
      </main>

      <BottomNav role={profile?.role ?? "admin"} />
    </div>
  );
}
