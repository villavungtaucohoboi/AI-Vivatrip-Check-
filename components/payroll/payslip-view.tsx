"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { formatVND } from "@/lib/format";

interface TierBreakdownItem {
  range: string;
  rate: string;
  base: number;
  result: number;
}

interface PayslipItem {
  id: string;
  component_name: string;
  component_type: "income" | "deduction" | "info";
  calculation_type: string;
  calculated_value: number;
  override_value: number | null;
  breakdown_json: { revenue?: number; qty?: number; rate?: number; breakdown?: TierBreakdownItem[] } | null;
}

interface Payslip {
  id: string;
  net_pay: number;
  total_income: number;
  total_deduction: number;
  payroll_periods: { month: number; year: number; status: string };
}

export function PayslipView({
  employeeName,
  employeePosition,
  payslip,
  items,
}: {
  employeeName: string;
  employeePosition: string | null;
  payslip: Payslip | null;
  items: unknown[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!payslip) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
        <p className="text-[14px] font-semibold text-ink">Chưa có bảng lương nào được công bố</p>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          Khi Admin duyệt kỳ lương, phiếu lương của bạn sẽ hiện ở đây.
        </p>
      </div>
    );
  }

  const typedItems = items as PayslipItem[];
  const incomeItems = typedItems.filter((i) => i.component_type === "income");
  const deductionItems = typedItems.filter((i) => i.component_type === "deduction");
  const period = payslip.payroll_periods;

  function effectiveValue(item: PayslipItem) {
    return item.override_value ?? item.calculated_value;
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-[13px] text-ink-muted">
          BẢNG LƯƠNG THÁNG {String(period.month).padStart(2, "0")}/{period.year}
        </p>
        <p className="mt-0.5 text-[16px] font-bold text-ink">{employeeName}</p>
        {employeePosition && <p className="text-[12px] text-ink-muted">{employeePosition}</p>}
      </div>

      <div className="mb-4 rounded-2xl bg-gradient-to-br from-teal-dark to-teal p-6 text-center text-white">
        <p className="text-[30px] font-extrabold tracking-tight">{formatVND(payslip.net_pay)}</p>
        <p className="mt-1 text-[11.5px] tracking-wide opacity-85">THỰC LĨNH</p>
      </div>

      <Section title="THU NHẬP">
        {incomeItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            value={effectiveValue(item)}
            isOpen={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            positive
          />
        ))}
      </Section>

      <Section title="KHẤU TRỪ">
        {deductionItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            value={effectiveValue(item)}
            isOpen={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            positive={false}
          />
        ))}
      </Section>

      <div className="rounded-2xl border border-border bg-white p-4">
        <Row label="Tổng thu nhập" value={formatVND(payslip.total_income)} />
        <Row label="Tổng khấu trừ" value={"-" + formatVND(payslip.total_deduction)} />
        <div className="mt-2 flex justify-between border-t border-border pt-2.5 text-[15px] font-extrabold text-ink">
          <span>THỰC LĨNH</span>
          <span>{formatVND(payslip.net_pay)}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-white">
      <p className="px-4 pb-1.5 pt-3.5 text-[11.5px] font-bold tracking-wide text-ink-muted">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[13px] text-ink">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ItemRow({
  item,
  value,
  isOpen,
  onToggle,
  positive,
}: {
  item: PayslipItem;
  value: number;
  isOpen: boolean;
  onToggle: () => void;
  positive: boolean;
}) {
  const hasBreakdown = !!item.breakdown_json?.breakdown?.length;
  const hasQty = item.calculation_type === "quantity_rate" && item.breakdown_json?.qty != null;

  return (
    <div className="border-t border-border">
      <button
        onClick={() => (hasBreakdown || hasQty) && onToggle()}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left ${
          hasBreakdown || hasQty ? "hover:bg-paper-dim" : ""
        }`}
      >
        <span className="flex items-center gap-1 text-[13.5px] text-ink">
          {item.component_name}
          {(hasBreakdown || hasQty) && (
            <ChevronRight className={`h-3.5 w-3.5 text-ink-muted transition-transform ${isOpen ? "rotate-90" : ""}`} />
          )}
        </span>
        <span className={`text-[13.5px] font-bold ${positive ? "text-teal-dark" : "text-danger"}`}>
          {positive ? "" : "-"}
          {formatVND(Math.abs(value))}
          {item.override_value != null && <span className="ml-1 text-[9px] font-normal text-sand">(đã điều chỉnh)</span>}
        </span>
      </button>

      {isOpen && hasBreakdown && (
        <div className="bg-paper-dim px-4 pb-3 text-[12px] text-ink-muted">
          <p className="mb-1">
            Doanh số: <b>{formatVND(item.breakdown_json!.revenue || 0)}</b>
          </p>
          {item.breakdown_json!.breakdown!.map((b, i) => (
            <p key={i} className="font-medium text-ink">
              {formatVND(b.base)} × {b.rate} = {formatVND(b.result)}{" "}
              <span className="font-normal text-ink-muted">(bậc {b.range})</span>
            </p>
          ))}
          <p className="mt-1.5 text-[11px]">
            Tính theo bậc — mức % này áp dụng riêng cho kỳ lương này, không đổi dù cơ chế tháng sau có thay đổi.
          </p>
        </div>
      )}

      {isOpen && hasQty && (
        <div className="bg-paper-dim px-4 pb-3 text-[12px] font-medium text-ink">
          {item.breakdown_json!.qty} × {formatVND(item.breakdown_json!.rate || 0)} = {formatVND(value)}
        </div>
      )}
    </div>
  );
}
