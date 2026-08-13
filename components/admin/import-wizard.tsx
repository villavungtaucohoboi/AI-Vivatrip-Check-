"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { parseWorkbook, validateRow, buildTemplateWorkbook } from "@/lib/import-parser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatVND } from "@/lib/format";
import type { ImportRowResult, ImportSummary } from "@/lib/types";

type Step = "upload" | "preview" | "done";

export function ImportWizard() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRowResult[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function downloadTemplate() {
    const wb = buildTemplateWorkbook();
    XLSX.writeFile(wb, "vivatrip-import-mau.xlsx");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const raw = parseWorkbook(buffer);

      const { data: existing } = await supabase.from("products").select("product_code");
      const existingCodes = new Set((existing ?? []).map((r) => r.product_code));

      const validated = raw.map((r, i) => validateRow(r, i + 2, existingCodes)); // +2: dòng 1 là header
      setRows(validated);
      setStep("preview");
    } catch {
      toast.error("Không đọc được file. Vui lòng kiểm tra định dạng .xlsx");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._status !== "error");
    if (validRows.length === 0) {
      toast.error("Không có dòng hợp lệ nào để import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Import thất bại");
        setImporting(false);
        return;
      }

      setSummary({
        inserted: validRows.filter((r) => r._status === "new").length,
        updated: validRows.filter((r) => r._status === "update").length,
        errors: rows.filter((r) => r._status === "error").length,
      });
      setStep("done");
    } catch {
      toast.error("Có lỗi khi import. Vui lòng thử lại.");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setSummary(null);
    setFileName("");
  }

  const newCount = rows.filter((r) => r._status === "new").length;
  const updateCount = rows.filter((r) => r._status === "update").length;
  const errorCount = rows.filter((r) => r._status === "error").length;

  if (step === "done" && summary) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-teal" />
        <h2 className="font-display text-lg text-ink">Import hoàn tất</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-teal-light p-3">
            <p className="text-2xl font-display text-teal-dark">{summary.inserted}</p>
            <p className="text-ink-muted">Thêm mới</p>
          </div>
          <div className="rounded-xl bg-sand-light p-3">
            <p className="text-2xl font-display text-[#7A5F2B]">{summary.updated}</p>
            <p className="text-ink-muted">Cập nhật</p>
          </div>
          <div className="rounded-xl bg-danger-light p-3">
            <p className="text-2xl font-display text-danger">{summary.errors}</p>
            <p className="text-ink-muted">Dòng lỗi</p>
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Import file khác
          </Button>
          <a href="/admin/products">
            <Button>Về danh sách sản phẩm</Button>
          </a>
        </div>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-ink-muted" />
              <span className="text-sm font-medium text-ink">{fileName}</span>
              <span className="text-sm text-ink-muted">({rows.length} dòng)</span>
            </div>
            <div className="flex gap-2 text-sm">
              <Badge variant="default">{newCount} mới</Badge>
              <Badge variant="sand">{updateCount} cập nhật</Badge>
              {errorCount > 0 && (
                <Badge className="bg-danger-light text-danger">{errorCount} lỗi</Badge>
              )}
            </div>
          </div>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>Dòng</TH>
              <TH>Trạng thái</TH>
              <TH>Mã SP</TH>
              <TH>Tên sản phẩm</TH>
              <TH>Khu vực</TH>
              <TH>Loại</TH>
              <TH>Giá</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r._rowNumber} className={r._status === "error" ? "bg-danger-light/40" : ""}>
                <TD>{r._rowNumber}</TD>
                <TD>
                  {r._status === "new" && <Badge variant="default">Mới</Badge>}
                  {r._status === "update" && <Badge variant="sand">Cập nhật</Badge>}
                  {r._status === "error" && (
                    <span className="flex items-center gap-1 text-danger text-xs font-medium">
                      <XCircle className="h-3.5 w-3.5" />
                      {r._error}
                    </span>
                  )}
                </TD>
                <TD>{r.product_code || "—"}</TD>
                <TD className="max-w-[180px] truncate">{r.product_name || "—"}</TD>
                <TD>{r.area || "—"}</TD>
                <TD>{r.type || "—"}</TD>
                <TD>
                  {formatVND(r.type === "hotel" ? r.price ?? null : r.price_weekday ?? null)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline" onClick={reset} disabled={importing}>
            Chọn file khác
          </Button>
          <Button onClick={handleImport} disabled={importing || newCount + updateCount === 0}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {newCount + updateCount} sản phẩm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light">
        <Upload className="h-6 w-6 text-teal-dark" />
      </div>
      <h2 className="font-display text-lg text-ink">Upload file Excel</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
        File .xlsx với các cột: product_code, product_name, type, area, sub_region (tiểu khu vực, tuỳ chọn),
        address, bedrooms, beds,
        standard_guests, max_guests, price (chỉ hotel), price_weekday, price_friday_sunday,
        price_saturday_holiday (chỉ villa/resort), discount_scheme (uniform/by_day_type),
        discount_type, discount_value, discount_weekday_type, discount_weekday_value,
        discount_friday_sunday_type, discount_friday_sunday_value, discount_saturday_holiday_type,
        discount_saturday_holiday_value (chỉ villa/resort, mọi cột *_type nhận percent hoặc amount), pool, near_beach,
        sea_view, near_lake, karaoke, bbq, pickleball, note.
      </p>

      <div className="mt-5 flex flex-col items-center gap-3">
        <label>
          <span className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal px-5 text-sm font-medium text-white hover:bg-teal-dark">
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Chọn file Excel
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
            disabled={parsing}
          />
        </label>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          Tải file mẫu
        </button>
      </div>
    </Card>
  );
}
