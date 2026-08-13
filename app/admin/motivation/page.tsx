import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { MotivationManager } from "@/components/admin/motivation-manager";
import type { MotivationMessage, MotivationQuote } from "@/lib/motivation-types";

export default async function AdminMotivationPage() {
  const supabase = await createClient();

  const [{ data: messages }, { data: quotes }] = await Promise.all([
    supabase.from("motivation_messages").select("*").order("created_at", { ascending: false }),
    supabase.from("motivation_quotes").select("*").order("created_at", { ascending: false }),
  ]);

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
        <h1 className="mb-1 font-display text-2xl text-ink">Nội dung động lực</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Quản lý nội dung hiện trong tính năng "Khi áp lực nhất" — thông điệp VivaTrip và quote danh nhân
          (nếu có, chỉ hiện tên tác giả khi đã xác minh).
        </p>
        <MotivationManager
          initialMessages={(messages ?? []) as MotivationMessage[]}
          initialQuotes={(quotes ?? []) as MotivationQuote[]}
        />
      </main>

      <BottomNav role="admin" />
    </div>
  );
}
