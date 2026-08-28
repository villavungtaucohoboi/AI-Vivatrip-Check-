import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { CreatePeriodForm } from "@/components/admin/payroll/create-period-form";
import type { PayrollPeriod } from "@/lib/payroll-types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { draft: "Nháp", calculated: "Đã tính", approved: "Đã duyệt", locked: "Đã khoá" };

export default async function AdminPayrollPeriodsPage() {
  const supabase = createServiceClient();
  const { data: periods } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/admin/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quay lại Bảng lương
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Kỳ lương</h1>
      <p className="mb-5 text-sm text-ink-muted">Nhân viên chỉ thấy kỳ đã "Đã duyệt" hoặc "Đã khoá" — kỳ Nháp Admin xem trước.</p>

      <CreatePeriodForm />

      <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-white">
        {(periods ?? []).map((p: PayrollPeriod) => (
          <Link key={p.id} href={`/admin/payroll/periods/${p.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-paper-dim">
            <span className="text-[13.5px] font-semibold text-ink">
              Tháng {String(p.month).padStart(2, "0")}/{p.year}
            </span>
            <span className="flex items-center gap-2 text-[12px] text-ink-muted">
              {STATUS_LABEL[p.status] ?? p.status}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
