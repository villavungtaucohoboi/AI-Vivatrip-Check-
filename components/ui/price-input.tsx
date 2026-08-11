"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function formatVN(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

export function PriceInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(value != null ? formatVN(String(value)) : "");

  useEffect(() => {
    setDisplay(value != null ? formatVN(String(value)) : "");
  }, [value]);

  return (
    <Input
      id={id}
      inputMode="numeric"
      value={display}
      placeholder={placeholder ?? "VD: 10.000.000"}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setDisplay(formatVN(digits));
        onChange(digits ? Number(digits) : null);
      }}
    />
  );
}
