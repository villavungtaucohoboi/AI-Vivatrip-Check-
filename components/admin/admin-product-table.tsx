"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABEL, type Product } from "@/lib/types";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN") + " " + new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function AdminProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        PRODUCT_TYPE_LABEL[p.type].toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      if (!map.has(p.area)) map.set(p.area, []);
      map.get(p.area)!.push(p);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [filtered]);

  const paged = filtered.slice(0, page * PAGE_SIZE);

  function toggleArea(area: string) {
    setOpenAreas((prev) => {
      const next = new Set(prev);
      next.has(area) ? next.delete(area) : next.add(area);
      return next;
    });
  }

  async function handleDelete() {
    if (!target) return;
    const res = await fetch(`/api/admin/products/${target.id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok || "error" in result) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== target.id));
    toast.success(`Đã xóa "${target.product_name}"`);
    setTarget(null);
    router.refresh();
  }

  if (products.length === 0) {
    return (
      <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm đầu tiên để bắt đầu.">
        <Link href="/admin/products/new">
          <Button className="mt-4">
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </Link>
      </EmptyState>
    );
  }

  function ProductRow({ p }: { p: Product }) {
    return (
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper-dim">
          <ProductImage src={p.thumbnail_url} alt="" sizes="48px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{p.product_name}</p>
          <p className="truncate text-xs text-ink-muted">
            {p.product_code} · {PRODUCT_TYPE_LABEL[p.type]}
            {p.max_guests != null && ` · ${p.max_guests} khách`}
          </p>
          <p className="mt-0.5 hidden text-[11px] text-ink-muted sm:block">
            Cập nhật: {formatDate(p.updated_at)}
          </p>
        </div>
        <p className="tabular-price shrink-0 text-sm font-semibold text-teal-dark">{formatVND(p.price)}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/admin/products/${p.id}/edit`}
            className="rounded-lg p-2 text-ink-muted hover:bg-paper-dim hover:text-ink"
            aria-label="Sửa"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setTarget(p)}
            className="rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
            aria-label="Xóa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            className="pl-10"
          />
        </div>
        <div className="flex shrink-0 rounded-xl border border-border bg-white p-0.5">
          <button
            onClick={() => setViewMode("grouped")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium",
              viewMode === "grouped" ? "bg-teal text-white" : "text-ink-muted hover:bg-paper-dim"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Theo khu vực
          </button>
          <button
            onClick={() => setViewMode("flat")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium",
              viewMode === "flat" ? "bg-teal text-white" : "text-ink-muted hover:bg-paper-dim"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Tất cả
          </button>
        </div>
      </div>

      {viewMode === "grouped" && grouped.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() =>
              setOpenAreas(openAreas.size === grouped.length ? new Set() : new Set(grouped.map(([area]) => area)))
            }
            className="text-[12.5px] font-medium text-teal hover:underline"
          >
            {openAreas.size === grouped.length ? "Đóng tất cả" : "Mở tất cả"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy sản phẩm" description="Thử từ khóa khác." />
      ) : viewMode === "grouped" ? (
        <div className="space-y-2.5">
          {grouped.map(([area, items]) => {
            const isOpen = openAreas.has(area);
            return (
              <div key={area} className="overflow-hidden rounded-2xl border border-border bg-white">
                <button
                  onClick={() => toggleArea(area)}
                  className="flex w-full items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold text-ink">{area}</span>
                    <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-xs text-ink-muted">
                      {items.length} sản phẩm
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-ink-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-ink-muted" />
                  )}
                </button>
                {isOpen && (
                  <div className="divide-y divide-border border-t border-border">
                    {items.map((p) => (
                      <ProductRow key={p.id} p={p} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Desktop: bảng đầy đủ */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Ảnh</TH>
                  <TH>Mã</TH>
                  <TH>Tên sản phẩm</TH>
                  <TH>Khu vực</TH>
                  <TH>Loại</TH>
                  <TH>Sức chứa</TH>
                  <TH>Giá</TH>
                  <TH>Cập nhật lần cuối</TH>
                  <TH>Thao tác</TH>
                </TR>
              </THead>
              <TBody>
                {paged.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-paper-dim">
                        <ProductImage src={p.thumbnail_url} alt="" sizes="44px" />
                      </div>
                    </TD>
                    <TD className="font-mono text-xs">{p.product_code}</TD>
                    <TD className="max-w-[220px] truncate font-medium">{p.product_name}</TD>
                    <TD>{p.area}</TD>
                    <TD>{PRODUCT_TYPE_LABEL[p.type]}</TD>
                    <TD>{p.max_guests != null ? `${p.max_guests} khách` : "—"}</TD>
                    <TD className="tabular-price font-medium text-teal-dark">{formatVND(p.price)}</TD>
                    <TD className="text-xs text-ink-muted">{formatDate(p.updated_at)}</TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="rounded-lg p-2 text-ink-muted hover:bg-paper-dim hover:text-ink"
                          aria-label="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setTarget(p)}
                          className="rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
                          aria-label="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Mobile: danh sách card */}
          <div className="divide-y divide-border rounded-2xl border border-border bg-white md:hidden">
            {paged.map((p) => (
              <ProductRow key={p.id} p={p} />
            ))}
          </div>

          {paged.length < filtered.length && (
            <div className="flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper-dim"
              >
                Xem thêm ({filtered.length - paged.length})
              </button>
            </div>
          )}
        </>
      )}

      <DeleteDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        itemName={target?.product_name ?? ""}
        onConfirm={handleDelete}
      />
    </div>
  );
}
