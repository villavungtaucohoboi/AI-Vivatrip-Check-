"use client";

import Link from "next/link";
import { useEffect, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function fmtNum(n: number | null | undefined): string {
  return n == null ? "" : new Intl.NumberFormat("vi-VN").format(n);
}

/** Giá nhập tay: bỏ ký tự lạ, "" -> null. */
export function parseNum(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

export function roundK(n: number): number {
  return Math.round(n / 1000) * 1000;
}

const baseInput =
  "h-9 w-full bg-transparent px-2 text-[12.5px] outline-none focus:bg-teal-light focus:ring-2 focus:ring-inset focus:ring-teal disabled:cursor-not-allowed";

/** Enter -> nhảy xuống ô cùng cột của dòng kế tiếp (giống Excel). */
function enterDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  const col = e.currentTarget.dataset.col;
  const table = e.currentTarget.closest("table");
  if (!col || !table) return;
  e.preventDefault();
  const inputs = Array.from(table.querySelectorAll<HTMLInputElement>(`input[data-col="${col}"]`));
  const next = inputs[inputs.indexOf(e.currentTarget) + 1];
  if (next) {
    next.focus();
    next.select();
  }
}

export function Td({
  children,
  dirty,
  err,
  className,
  style,
  sticky,
}: {
  children?: ReactNode;
  dirty?: boolean;
  err?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sticky?: number;
}) {
  return (
    <td
      className={cn(
        "border-b border-r border-border/60 bg-white p-0 align-middle",
        sticky !== undefined && "sticky z-[1]",
        dirty && "!bg-sand-light",
        err && "!bg-danger-light",
        className
      )}
      style={sticky !== undefined ? { left: sticky, ...style } : style}
    >
      {children}
    </td>
  );
}

export function Th({
  children,
  w,
  sticky,
  right,
  className,
}: {
  children?: ReactNode;
  w: number;
  sticky?: number;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[2] border-b border-border bg-paper-dim px-2 py-2 text-left align-bottom text-[10.5px] font-semibold text-ink-muted",
        sticky !== undefined && "z-[4]",
        right && "text-right",
        className
      )}
      style={{ minWidth: w, width: w, left: sticky }}
    >
      {children}
    </th>
  );
}

export function NumCell({
  value,
  onChange,
  col,
  disabled,
  suffix,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  col?: string;
  disabled?: boolean;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center">
      <input
        inputMode="numeric"
        data-col={col}
        value={fmtNum(value)}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(parseNum(e.target.value))}
        onKeyDown={enterDown}
        className={cn(baseInput, "text-right font-semibold")}
      />
      {suffix && <span className="pr-2 text-[10.5px] text-ink-muted">{suffix}</span>}
    </div>
  );
}

export function TextCell({
  value,
  onChange,
  col,
  placeholder,
  onPaste,
  dataRow,
}: {
  value: string;
  onChange: (v: string) => void;
  col?: string;
  placeholder?: string;
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
  dataRow?: number;
}) {
  return (
    <input
      data-col={col}
      data-row={dataRow}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      className={baseInput}
    />
  );
}

export function SelectCell<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        const match = options.find((o) => String(o.value) === raw);
        if (match) onChange(match.value);
      }}
      className={cn(baseInput, "cursor-pointer")}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CheckCell({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title?: string;
}) {
  return (
    <div className="flex h-9 items-center justify-center">
      <input
        type="checkbox"
        title={title}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#0E6B5A]"
      />
    </div>
  );
}

/** Thanh cố định cuối màn hình: số thay đổi chưa lưu + nút Lưu tất cả / Hoàn tác. */
export function BulkSaveBar({
  show,
  message,
  onSave,
  onUndo,
  saving,
  saveLabel = "Lưu tất cả",
  undoLabel = "Hoàn tác tất cả",
}: {
  show: boolean;
  message: ReactNode;
  onSave: () => void;
  onUndo?: () => void;
  saving?: boolean;
  saveLabel?: string;
  undoLabel?: string;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-[60px] z-[45] border-t border-border bg-white px-4 py-3 shadow-float sm:bottom-0">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 sm:pr-20">
        <p className="text-[13px] text-ink">{message}</p>
        <div className="ml-auto flex gap-2">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={saving}
              className="h-10 rounded-xl border border-border px-4 text-[12.5px] font-bold text-ink hover:bg-paper-dim disabled:opacity-50"
            >
              {undoLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-10 rounded-xl bg-teal px-5 text-[12.5px] font-bold text-white hover:bg-teal-dark disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Cảnh báo khi đóng tab/tải lại trang lúc còn thay đổi chưa lưu. */
export function useUnsavedGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}

/** Tách dữ liệu dán từ Excel (tab/xuống dòng). Trả null nếu chỉ là 1 ô — để trình duyệt dán bình thường. */
export function parseClipboardTable(e: ClipboardEvent<HTMLElement>): string[][] | null {
  const text = e.clipboardData.getData("text");
  if (!text.includes("\t") && !text.includes("\n")) return null;
  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => l.split("\t").map((c) => c.trim()));
  return rows.length ? rows : null;
}

export function digitsOf(s: string): number | null {
  return parseNum(s);
}

export function BulkPageHeader({
  title,
  subtitle,
  backHref = "/admin/bulk",
}: {
  title: string;
  subtitle: string;
  backHref?: string;
}) {
  return (
    <div className="mb-4">
      <Link href={backHref} className="mb-2 inline-block text-[12.5px] font-medium text-ink-muted hover:text-ink">
        ← Quay lại
      </Link>
      <h1 className="font-display text-2xl text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </div>
  );
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 lg:col-span-4" : ""}>
      <label className="mb-1 block text-[11px] font-bold text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

export function SimpleInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[12.5px]"
    />
  );
}

export function SimpleNum({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="numeric"
      value={fmtNum(value)}
      onChange={(e) => onChange(parseNum(e.target.value))}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[12.5px]"
    />
  );
}
