import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { SchemesManager } from "@/components/admin/payroll/schemes-manager";
import type { Department, SalaryComponent, SalaryScheme } from "@/lib/payroll-types";

export const dynamic = "force-dynamic";

export default async function AdminPayrollSchemesPage() {
  const supabase = createServiceClient();
  const [{ data: schemes }, { data: components }, { data: departments }] = await Promise.all([
    supabase.from("salary_schemes").select("*").order("name"),
    supabase.from("salary_components").select("*").order("sort_order"),
    supabase.from("departments").select("*").order("name"),
  ]);

  const schemesWithComponents: SalaryScheme[] = (schemes ?? []).map((s) => ({
    ...s,
    components: (components ?? []).filter((c) => c.scheme_id === s.id) as SalaryComponent[],
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/admin/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quay lại Bảng lương
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Cơ chế lương</h1>
      <p className="mb-5 text-sm text-ink-muted">
        Mỗi khoản có thể là <b>% theo bậc</b> (tính kiểu bậc thuế) hoặc <b>số tiền cố định</b> — sửa/xoá trực tiếp,
        không cần code.
      </p>

      <SchemesManager initialSchemes={schemesWithComponents} departments={(departments ?? []) as Department[]} />
    </main>
  );
}
