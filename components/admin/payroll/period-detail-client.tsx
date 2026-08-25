"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { calcTieredCommission, calcQuantityRate } from "@/lib/payroll-calc";
import { formatVND } from "@/lib/format";
import type { PayrollEmployee, PayrollPeriod, SalaryComponent } from "@/lib/payroll-types";

const STATUS_LABEL: Record<string, string> = { draft: "Nháp", calculated: "Đã tính", approved: "Đã duyệt", locked: "Đã khoá" };

interface PayslipRow {
  id: string;
  employee_id: string;
  net_pay: number;
  status: string;
}
interface PayslipItemRow {
  payslip_id: string;
  component_name: string;
  input_value: { revenue?: number; qty?: number; manual_amount?: number } | null;
  calculated_value: number;
}

export function PeriodDetailClient({
  period: initialPeriod,
  employees,
  components,
  payslips,
  payslipItems,
}: {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
  components: SalaryComponent[];
  payslips: PayslipRow[];
  payslipItems: PayslipItemRow[];
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [payslipMap, setPayslipMap] = useState(new Map(payslips.map((p) => [p.employee_id, p])));
  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const isLocked = period.status === "locked";

  async function handleApprove() {
    setChangingStatus(true);
    const res = await fetch(`/api/admin/payroll-periods/${period.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setChangingStatus(false);
    if (!res.ok) return toast.error("Không thể duyệt kỳ lương");
    setPeriod((p) => ({ ...p, status: "approved" }));
    toast.success("Đã duyệt — nhân viên xem được lương tháng này");
  }

  async function handleLock() {
    setChangingStatus(true);
    const res = await fetch(`/api/admin/payroll-periods/${period.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "locked" }),
    });
    setChangingStatus(false);
    if (!res.ok) return toast.error("Không thể khoá kỳ lương");
    setPeriod((p) => ({ ...p, status: "locked" }));
    toast.success("Đã khoá kỳ lương");
  }

  async function handleUnlock() {
    const reason = prompt("Lý do mở khoá (sẽ được ghi lại trong nhật ký):");
    if (reason === null) return;
    setChangingStatus(true);
    const res = await fetch(`/api/admin/payroll-periods/${period.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", reason }),
    });
    setChangingStatus(false);
    if (!res.ok) return toast.error("Không thể mở khoá");
    setPeriod((p) => ({ ...p, status: "approved" }));
    toast.success("Đã mở khoá kỳ lương");
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">
            Tháng {String(period.month).padStart(2, "0")}/{period.year}
          </h1>
          <p className="text-sm text-ink-muted">Trạng thái: {STATUS_LABEL[period.status]}</p>
        </div>
        <div className="flex gap-2">
          {(period.status === "draft" || period.status === "calculated") && (
            <button onClick={handleApprove} disabled={changingStatus} className="rounded-xl bg-teal px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-teal-dark">
              {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Duyệt kỳ lương"}
            </button>
          )}
          {period.status === "approved" && (
            <button onClick={handleLock} disabled={changingStatus} className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90">
              <Lock className="h-3.5 w-3.5" /> Khoá kỳ lương
            </button>
          )}
          {period.status === "locked" && (
            <button onClick={handleUnlock} disabled={changingStatus} className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-paper-dim">
              <Unlock className="h-3.5 w-3.5" /> Mở khoá
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-white">
        {employees.map((emp) => {
          const slip = payslipMap.get(emp.id);
          return (
            <button
              key={emp.id}
              onClick={() => setEditingEmployee(emp)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-paper-dim"
            >
              <span className="text-[13.5px] font-semibold text-ink">
                {emp.employee_code} — {emp.full_name}
              </span>
              <span className="text-[13px] text-ink-muted">
                {slip ? formatVND(slip.net_pay) : <span className="italic">Chưa tính lương</span>}
              </span>
            </button>
          );
        })}
      </div>

      {editingEmployee && (
        <SalaryEditorModal
          employee={editingEmployee}
          period={period}
          allComponents={components}
          existingItems={payslipItems.filter((i) => i.payslip_id === payslipMap.get(editingEmployee.id)?.id)}
          isLocked={isLocked}
          onClose={() => setEditingEmployee(null)}
          onSaved={(payslipId, netPay) => {
            setPayslipMap((prev) => new Map(prev).set(editingEmployee.id, { id: payslipId, employee_id: editingEmployee.id, net_pay: netPay, status: "calculated" }));
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function SalaryEditorModal({
  employee,
  period,
  allComponents,
  existingItems,
  isLocked,
  onClose,
  onSaved,
}: {
  employee: PayrollEmployee;
  period: PayrollPeriod;
  allComponents: SalaryComponent[];
  existingItems: PayslipItemRow[];
  isLocked: boolean;
  onClose: () => void;
  onSaved: (payslipId: string, netPay: number) => void;
}) {
  const components = allComponents.filter((c) => c.scheme_id === employee.salary_scheme_id);

  // Lương cố định / Phụ cấp / Bảo hiểm KHÔNG còn là component trong cơ chế —
  // chúng thuộc về nhân viên. Nếu kỳ này đã từng lưu payslip trước đó, lấy
  // đúng số đã lưu; nếu chưa (kỳ mới), tự nhảy theo mức mặc định hiện tại
  // của nhân viên (employee.base_salary / default_allowance / default_insurance).
  const existingBase = existingItems.find((i) => i.component_name === "Lương cố định");
  const existingAllowance = existingItems.find((i) => i.component_name === "Phụ cấp");
  const existingInsurance = existingItems.find((i) => i.component_name === "Bảo hiểm");

  const [baseSalary, setBaseSalary] = useState(existingBase?.calculated_value ?? employee.base_salary ?? 0);
  const [allowance, setAllowance] = useState(existingAllowance?.calculated_value ?? employee.default_allowance ?? 0);
  const [insurance, setInsurance] = useState(Math.abs(existingInsurance?.calculated_value ?? employee.default_insurance ?? 0));
  const [updateDefaults, setUpdateDefaults] = useState(false);

  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const comp of components) {
      const existing = existingItems.find((i) => i.component_name === comp.name);
      if (comp.calculation_type === "percentage_tiered") initial[comp.id] = existing?.input_value?.revenue ?? 0;
      else if (comp.calculation_type === "quantity_rate") initial[comp.id] = existing?.input_value?.qty ?? 0;
      else if (comp.calculation_type === "manual") initial[comp.id] = existing?.input_value?.manual_amount ?? 0;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    let income = baseSalary + allowance;
    let deduction = Math.abs(insurance);
    const rows = components.map((comp) => {
      let value = 0;
      let sub = "";
      if (comp.calculation_type === "fixed") {
        value = comp.config_json.amount ?? 0;
      } else if (comp.calculation_type === "manual") {
        value = inputs[comp.id] ?? 0;
      } else if (comp.calculation_type === "percentage_tiered") {
        const result = calcTieredCommission(inputs[comp.id] ?? 0, comp.config_json.tiers ?? []);
        value = result.amount;
        sub = result.breakdown.length > 1 ? `${result.breakdown.length} bậc` : result.breakdown[0]?.rate ?? "";
      } else if (comp.calculation_type === "quantity_rate") {
        value = calcQuantityRate(inputs[comp.id] ?? 0, comp.config_json.rate ?? 0);
      }
      if (comp.component_type === "income") income += value;
      else if (comp.component_type === "deduction") deduction += Math.abs(value);
      return { comp, value, sub };
    });
    return { rows, income, deduction, net: income - deduction };
  }, [components, inputs, baseSalary, allowance, insurance]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/payroll-payslip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period_id: period.id,
        employee_id: employee.id,
        base_salary: baseSalary,
        allowance: allowance,
        insurance: insurance,
        update_defaults: updateDefaults,
        inputs: components.map((c) => ({
          component_id: c.id,
          input_value: c.calculation_type === "percentage_tiered" || c.calculation_type === "quantity_rate" ? inputs[c.id] ?? 0 : undefined,
          manual_amount: c.calculation_type === "manual" ? inputs[c.id] ?? 0 : undefined,
        })),
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(result.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success(updateDefaults ? "Đã lưu và cập nhật mức mặc định mới" : "Đã lưu bảng lương");
    onSaved(result.payslipId, result.netPay);
  }

  const isBaseDefault = baseSalary === (employee.base_salary ?? 0);
  const isAllowanceDefault = allowance === (employee.default_allowance ?? 0);
  const isInsuranceDefault = insurance === (employee.default_insurance ?? 0);
  const anyOverridden = !isBaseDefault || !isAllowanceDefault || !isInsuranceDefault;

  const groups: { title: string; filter: (c: SalaryComponent) => boolean }[] = [
    { title: "HOA HỒNG (nhập doanh số, tự tính theo bậc)", filter: (c) => c.calculation_type === "percentage_tiered" },
    { title: "THƯỞNG / KHOẢN KHÁC", filter: (c) => c.component_type === "income" && (c.calculation_type === "quantity_rate" || c.calculation_type === "manual") },
    { title: "KHẤU TRỪ KHÁC", filter: (c) => c.component_type === "deduction" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper px-5 py-4">
          <p className="text-[15px] font-bold text-ink">
            {employee.employee_code} — {employee.full_name}
          </p>
          <button onClick={onClose} className="rounded-full bg-paper-dim p-1.5">✕</button>
        </div>

        {isLocked && (
          <div className="mx-5 mt-4 rounded-xl bg-danger-light px-3.5 py-2.5 text-[12px] text-danger">
            Kỳ lương đã khoá — mở khoá trước khi sửa.
          </div>
        )}

        <div className="sticky top-[57px] z-10 mx-5 mt-4 rounded-2xl bg-teal-light p-4 text-center">
          <p className="text-[24px] font-extrabold text-teal-dark">{formatVND(preview.net)}</p>
          <p className="text-[11px] text-teal-dark opacity-80">THỰC LĨNH — tự cập nhật khi bạn sửa số bên dưới</p>
        </div>

        <div className="space-y-5 px-5 pb-6 pt-5">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted">LƯƠNG CỐ ĐỊNH — riêng cho nhân viên này</p>
            <div className="space-y-2 rounded-xl border-2 border-teal bg-white p-3">
              <MoneyField label="Lương cố định" value={baseSalary} onChange={setBaseSalary} disabled={isLocked} />
              <MoneyField label="Phụ cấp" value={allowance} onChange={setAllowance} disabled={isLocked} />
              <MoneyField label="Bảo hiểm (khấu trừ)" value={insurance} onChange={setInsurance} disabled={isLocked} deduct />
              <p className="text-[10.5px] text-ink-muted">
                Mặc định hiện tại: {formatVND(employee.base_salary)} lương · {formatVND(employee.default_allowance)} phụ cấp · {formatVND(employee.default_insurance)} bảo hiểm
                {anyOverridden && <span className="ml-1 font-semibold text-sand">— đang sửa riêng cho kỳ này</span>}
              </p>
              <label className="flex items-center gap-2 text-[11.5px] text-ink-muted">
                <input
                  type="checkbox"
                  checked={updateDefaults}
                  onChange={(e) => setUpdateDefaults(e.target.checked)}
                  className="h-4 w-4"
                />
                Cập nhật luôn làm mức mặc định (lương cố định, phụ cấp, bảo hiểm) từ kỳ sau
              </label>
            </div>
          </div>

          {groups.map((group) => {
            const groupRows = preview.rows.filter((r) => group.filter(r.comp));
            if (groupRows.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted">{group.title}</p>
                <div className="space-y-2">
                  {groupRows.map(({ comp, value, sub }) => (
                    <div key={comp.id} className="rounded-xl border border-border bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12.5px] font-semibold text-ink">{comp.name}</p>
                        <p className={`text-[13px] font-bold ${comp.component_type === "deduction" ? "text-danger" : "text-teal-dark"}`}>
                          {comp.component_type === "deduction" ? "-" : ""}
                          {formatVND(Math.abs(value))}
                        </p>
                      </div>
                      {sub && <p className="mt-0.5 text-[10.5px] text-ink-muted">{sub}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          disabled={isLocked}
                          value={inputs[comp.id] ?? 0}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [comp.id]: Number(e.target.value) }))}
                          placeholder={
                            comp.calculation_type === "percentage_tiered"
                              ? "Nhập doanh số"
                              : comp.calculation_type === "quantity_rate"
                              ? "Nhập số lượng"
                              : "Nhập số tiền"
                          }
                          className="h-10 w-full rounded-lg border border-border px-3 text-[13px] disabled:bg-paper-dim"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <button
            onClick={handleSave}
            disabled={saving || isLocked}
            className="w-full rounded-xl bg-teal py-3.5 text-[13.5px] font-bold text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Lưu bảng lương"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
  deduct,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  deduct?: boolean;
}) {
  const [display, setDisplay] = useState(value ? value.toLocaleString("vi-VN") : "");
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          const num = Number(digits) || 0;
          setDisplay(digits ? num.toLocaleString("vi-VN") : "");
          onChange(deduct ? Math.abs(num) : num);
        }}
        className="h-10 w-40 rounded-lg border border-border px-3 text-right text-[13px] font-bold disabled:bg-paper-dim"
      />
    </div>
  );
}
