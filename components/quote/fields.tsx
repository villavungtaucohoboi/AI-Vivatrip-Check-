"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Ô nhập gọn cho trình soạn báo giá
export const fieldCls =
  "h-9 w-full rounded-lg border border-border bg-white px-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-muted/60 focus:border-teal";

export function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block text-[11.5px] font-semibold text-ink-muted", className)}>
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

export function TextIn(props: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      className={cn(fieldCls, props.className)}
    />
  );
}

const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/** Ô số: gõ "7000000" hay "7.000.000" đều được; trống = null */
export function NumIn({ value, onChange, placeholder, className }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value != null ? fmtVN(value) : "");
  useEffect(() => {
    setText((t) => {
      const cur = t.replace(/\D/g, "");
      return (cur ? Number(cur) : null) === value ? t : value != null ? fmtVN(value) : "";
    });
  }, [value]);
  return (
    <input
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "");
        setText(d ? fmtVN(Number(d)) : "");
        onChange(d ? Number(d) : null);
      }}
      className={cn(fieldCls, "tabular-nums", className)}
    />
  );
}
