"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Eye, EyeOff, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { dm, flagOf, isFull, kk, minFrom, norm, upcoming } from "@/lib/tour-utils";
import type { TourWithDeps } from "@/lib/tour-types";
import { cn } from "@/lib/utils";

export function TourAdminList({ tours, today, loadError }: { tours: TourWithDeps[]; today: string; loadError?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [partner, setPartner] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const partners = useMemo(() => [...new Set(tours.map((t) => t.partner ?? "").filter(Boolean))].sort(), [tours]);
  const list = tours.filter(
    (t) => (!partner || t.partner === partner) && (!q.trim() || norm(`${t.name} ${t.country} ${t.route_text} ${t.partner} ${(t.places ?? []).join(" ")}`).includes(norm(q)))
  );

  async function toggleHidden(id: string, hidden: boolean) {
    const res = await fetch(`/api/admin/tours/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden }) });
    if (res.ok) {
      toast.success(hidden ? "Đã ẩn tour khỏi trang Sale" : "Đã hiện tour");
      router.refresh();
    } else toast.error("Không cập nhật được");
  }
  async function del(id: string) {
    const res = await fetch(`/api/admin/tours/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xoá tour");
      setConfirmDel(null);
      router.refresh();
    } else toast.error("Không xoá được");
  }

  return (
    <div className="space-y-4">
      <Link href="/tours" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Trang Tour nước ngoài
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Quản lý tour nước ngoài</h1>
          <p className="mt-1 text-sm text-ink-muted">Thêm tour bằng AI đọc link lịch trình · up Excel giá & số chỗ của đối tác · mở thêm ngày / nhân bản tour.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/tours/new" className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-sand px-4 text-[13px] font-bold text-white">
            <Plus className="h-4 w-4" /> Thêm tour (AI đọc link)
          </Link>
          <Link href="/admin/tours/excel" className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-4 text-[13px] font-bold text-ink">
            <FileSpreadsheet className="h-4 w-4" /> Up Excel giá & số chỗ
          </Link>
        </div>
      </div>
      {loadError && <p className="rounded-xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">{loadError}</p>}

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên tour, điểm đến, đối tác…" className="h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-white px-3 text-[13.5px] outline-none focus:border-teal" />
        <select value={partner} onChange={(e) => setPartner(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-2 text-[13px] font-semibold">
          <option value="">🤝 Mọi đối tác</option>
          {partners.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-paper text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="p-2.5">Tour</th>
              <th className="p-2.5">Đối tác</th>
              <th className="p-2.5">Khởi hành</th>
              <th className="p-2.5 text-center">Ngày sắp tới</th>
              <th className="p-2.5 text-right">Giá từ</th>
              <th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {list.map((t) => {
              const ups = upcoming(t.departures, today);
              const open = ups.filter((d) => !isFull(d));
              return (
                <tr key={t.id} className={cn("border-t border-border/70", t.hidden && "opacity-55")}>
                  <td className="p-2.5">
                    <Link href={`/admin/tours/${t.id}`} className="font-bold text-ink hover:text-teal-dark">
                      {flagOf(t)} {t.name} {t.days ? <span className="text-teal-dark">{t.days}N{t.nights ?? t.days - 1}Đ</span> : null}
                    </Link>
                    <p className="line-clamp-1 text-[11.5px] text-ink-muted">{t.route_text}</p>
                  </td>
                  <td className="p-2.5 font-semibold text-amber-800">{t.partner || "—"}</td>
                  <td className="p-2.5">{t.from_city}</td>
                  <td className="p-2.5 text-center tabular-nums">
                    {ups.length ? (
                      <>
                        <b>{open.length}</b>/{ups.length}
                        <span className="block text-[11px] text-ink-muted">gần nhất {dm(ups[0].depart_date)}</span>
                      </>
                    ) : (
                      <span className="text-[12px] font-bold text-hot">Hết ngày — mở thêm</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-extrabold text-hot tabular-nums">{kk(minFrom(t.departures, today))}</td>
                  <td className="p-2.5">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/tours/${t.id}`} title="Sửa / mở thêm ngày" className="rounded-lg border border-border p-1.5 hover:bg-paper-dim"><Pencil className="h-4 w-4" /></Link>
                      <Link href={`/admin/tours/new?clone=${t.id}`} title="Nhân bản tour" className="rounded-lg border border-border p-1.5 hover:bg-paper-dim"><Copy className="h-4 w-4" /></Link>
                      <button onClick={() => toggleHidden(t.id, !t.hidden)} title={t.hidden ? "Hiện" : "Ẩn khỏi trang Sale"} className="rounded-lg border border-border p-1.5 hover:bg-paper-dim">
                        {t.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      {confirmDel === t.id ? (
                        <button onClick={() => del(t.id)} className="rounded-lg bg-hot px-2 text-[12px] font-bold text-white">Xoá thật?</button>
                      ) : (
                        <button onClick={() => setConfirmDel(t.id)} title="Xoá" className="rounded-lg border border-border p-1.5 text-hot hover:bg-hot-light"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-muted">Chưa có tour. Bấm “Thêm tour (AI đọc link)”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
