"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Download, Loader2 } from "lucide-react";
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
  const [exporting, setExporting] = useState(false);

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

  async function handleExportImage() {
    setExporting(true);
    try {
      const W = 900, H = 1300;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#F7F6F2";
      ctx.fillRect(0, 0, W, H);

      // Logo + brand
      ctx.fillStyle = "#0E6B5A";
      roundRect(ctx, 40, 36, 44, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText("V", 62, 65);
      ctx.textAlign = "left";
      ctx.fillStyle = "#1B211F";
      ctx.font = "bold 22px Arial";
      ctx.fillText("VivaTrip", 96, 64);

      // Tiêu đề
      ctx.fillStyle = "#1B211F";
      ctx.font = "bold 34px Arial";
      ctx.fillText("PHIẾU LƯƠNG", 40, 130);
      ctx.fillStyle = "#5B655F";
      ctx.font = "20px Arial";
      ctx.fillText(`Tháng ${String(period.month).padStart(2, "0")}/${period.year}`, 40, 160);

      ctx.fillStyle = "#1B211F";
      ctx.font = "bold 24px Arial";
      ctx.fillText(employeeName, 40, 200);
      if (employeePosition) {
        ctx.fillStyle = "#5B655F";
        ctx.font = "18px Arial";
        ctx.fillText(employeePosition, 40, 226);
      }

      // Khối THỰC LĨNH nổi bật
      const netY = 250;
      const netH = 130;
      const grad = ctx.createLinearGradient(0, netY, W, netY + netH);
      grad.addColorStop(0, "#0A5347");
      grad.addColorStop(1, "#0E6B5A");
      ctx.fillStyle = grad;
      roundRect(ctx, 40, netY, W - 80, netH, 18);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "18px Arial";
      ctx.fillText("THỰC LĨNH", 66, netY + 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Arial";
      ctx.fillText(formatVND(payslip.net_pay), 66, netY + 90);

      // Danh sách khoản
      let y = netY + netH + 60;
      ctx.fillStyle = "#5B655F";
      ctx.font = "bold 18px Arial";
      ctx.fillText("THU NHẬP", 40, y);
      y += 14;
      ctx.font = "18px Arial";
      incomeItems.forEach((item) => {
        y += 34;
        ctx.fillStyle = "#1B211F";
        ctx.fillText(item.component_name, 40, y);
        ctx.fillStyle = "#0A5347";
        ctx.font = "bold 18px Arial";
        const val = formatVND(effectiveValue(item));
        ctx.fillText(val, W - 40 - ctx.measureText(val).width, y);
        ctx.font = "18px Arial";
      });

      y += 46;
      ctx.fillStyle = "#5B655F";
      ctx.font = "bold 18px Arial";
      ctx.fillText("KHẤU TRỪ", 40, y);
      y += 14;
      ctx.font = "18px Arial";
      deductionItems.forEach((item) => {
        y += 34;
        ctx.fillStyle = "#1B211F";
        ctx.fillText(item.component_name, 40, y);
        ctx.fillStyle = "#B3402A";
        ctx.font = "bold 18px Arial";
        const val = "-" + formatVND(Math.abs(effectiveValue(item)));
        ctx.fillText(val, W - 40 - ctx.measureText(val).width, y);
        ctx.font = "18px Arial";
      });

      // Đường kẻ + tổng
      y += 40;
      ctx.strokeStyle = "#E2DFD5";
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(W - 40, y);
      ctx.stroke();

      y += 40;
      ctx.font = "18px Arial";
      ctx.fillStyle = "#1B211F";
      ctx.fillText("Tổng thu nhập", 40, y);
      var incomeStr = formatVND(payslip.total_income);
      ctx.fillText(incomeStr, W - 40 - ctx.measureText(incomeStr).width, y);

      y += 34;
      ctx.fillText("Tổng khấu trừ", 40, y);
      var deductStr = "-" + formatVND(payslip.total_deduction);
      ctx.fillText(deductStr, W - 40 - ctx.measureText(deductStr).width, y);

      y += 44;
      ctx.font = "bold 26px Arial";
      ctx.fillText("THỰC LĨNH", 40, y);
      var netStr = formatVND(payslip.net_pay);
      ctx.fillText(netStr, W - 40 - ctx.measureText(netStr).width, y);

      // Footer
      ctx.fillStyle = "#5B655F";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Phiếu lương được tạo tự động từ hệ thống VivaTrip", W / 2, H - 30);
      ctx.textAlign = "left";

      const link = document.createElement("a");
      link.download = `phieu-luong-${employeeName.replace(/\s+/g, "-")}-T${period.month}-${period.year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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

      <button
        onClick={handleExportImage}
        disabled={exporting}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal bg-white py-3 text-[13.5px] font-bold text-teal-dark hover:bg-teal-light disabled:opacity-60"
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Tải phiếu lương (ảnh)
      </button>

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
