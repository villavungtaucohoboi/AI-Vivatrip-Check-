import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, LayoutList, Users } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminPayrollHub() {
  const supabase = createServiceClient();
  const [{ count: empCount }, { count: schemeCount }, { data: periods }] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("salary_schemes").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("payroll_periods").select("*").order("year", { ascending: false }).order("month", { ascending: false }).limit(3),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại quản lý sản phẩm
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Bảng lương — Admin</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Quản lý nhân viên, cơ chế lương và các kỳ lương. Nhân viên đăng nhập riêng tại{" "}
        <code className="rounded bg-paper-dim px-1.5 py-0.5 text-[12px]">/payroll/login</code>.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <HubCard href="/admin/payroll/employees" icon={Users} title="Nhân viên" desc={`${empCount ?? 0} đang hoạt động`} />
        <HubCard href="/admin/payroll/schemes" icon={LayoutList} title="Cơ chế lương" desc={`${schemeCount ?? 0} cơ chế`} />
        <HubCard href="/admin/payroll/periods" icon={CalendarDays} title="Kỳ lương" desc="Tạo & duyệt kỳ" />
      </div>

      {periods && periods.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-bold text-ink-muted">KỲ LƯƠNG GẦN ĐÂY</p>
          <div className="divide-y divide-border rounded-2xl border border-border bg-white">
            {periods.map((p) => (
              <Link
                key={p.id}
                href={`/admin/payroll/periods/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-paper-dim"
              >
                <span className="text-[13.5px] font-medium text-ink">
                  Tháng {String(p.month).padStart(2, "0")}/{p.year}
                </span>
                <span className="flex items-center gap-2 text-[12px] text-ink-muted">
                  {statusLabel(p.status)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: "Nháp", calculated: "Đã tính", approved: "Đã duyệt", locked: "Đã khoá" };
  return map[status] ?? status;
}

function HubCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-white p-4 hover:border-teal hover:shadow-sm"
    >
      <Icon className="mb-2 h-5 w-5 text-teal-dark" />
      <p className="text-[13.5px] font-bold text-ink">{title}</p>
      <p className="text-[12px] text-ink-muted">{desc}</p>
    </Link>
  );
}
