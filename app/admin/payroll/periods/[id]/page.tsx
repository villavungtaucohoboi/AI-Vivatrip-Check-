import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { PeriodDetailClient } from "@/components/admin/payroll/period-detail-client";
import type { PayrollEmployee, PayrollPeriod, SalaryComponent } from "@/lib/payroll-types";

export default async function AdminPayrollPeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: period } = await supabase.from("payroll_periods").select("*").eq("id", id).maybeSingle();
  if (!period) notFound();

  const [{ data: employees }, { data: components }, { data: payslips }] = await Promise.all([
    supabase.from("employees").select("*").eq("is_active", true).order("employee_code"),
    supabase.from("salary_components").select("*").eq("active", true).order("sort_order"),
    supabase.from("payslips").select("*").eq("payroll_period_id", id),
  ]);

  const payslipIds = (payslips ?? []).map((p) => p.id);
  const { data: allItems } =
    payslipIds.length > 0
      ? await supabase.from("payslip_items").select("*").in("payslip_id", payslipIds)
      : { data: [] };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/admin/payroll/periods" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách kỳ lương
      </Link>

      <PeriodDetailClient
        period={period as PayrollPeriod}
        employees={(employees ?? []) as PayrollEmployee[]}
        components={(components ?? []) as SalaryComponent[]}
        payslips={payslips ?? []}
        payslipItems={allItems ?? []}
      />
    </main>
  );
}
