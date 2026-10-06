"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { toast } from "sonner";
import {
  CheckCell,
  Field,
  SelectCell,
  SimpleInput,
  Td,
  TextCell,
  Th,
  fmtNum,
  parseClipboardTable,
  parseNum,
  useUnsavedGuard,
} from "@/components/admin/bulk/bulk-ui";
import { postJson, uploadProductImages } from "@/lib/bulk-upload";
import type { HotelRateInput, ProductInput } from "@/lib/admin-types";
import type { ProductType } from "@/lib/types";

type AmenityKey = "pool" | "near_beach" | "sea_view" | "near_lake" | "karaoke" | "bbq" | "pickleball";
const AMENITIES: { key: AmenityKey; label: string }[] = [
  { key: "pool", label: "Hồ bơi" },
  { key: "near_beach", label: "Sát biển" },
  { key: "sea_view", label: "View biển" },
  { key: "near_lake", label: "View hồ" },
  { key: "karaoke", label: "Karaoke" },
  { key: "bbq", label: "BBQ" },
  { key: "pickleball", label: "Pickle" },
];

interface RoomRow {
  key: number;
  name: string;
  price: number | null;
  capacity: number | null;
  extra: number | null;
  breakfast: boolean;
  note: string;
}
interface Img {
  file: File;
  url: string;
}
interface Row {
  key: number;
  code: string;
  name: string;
  area: string;
  type: Exclude<ProductType, "villa">;
  amenities: Record<AmenityKey, boolean>;
  rooms: RoomRow[];
  sub_region: string;
  address: string;
  map: string;
  note: string;
  images: Img[];
  open: boolean;
  err: Partial<Record<"code" | "name" | "area" | "rooms", boolean>>;
  msg: string;
}

const COLS = 14;
const PASTE_KEYS = ["code", "name", "area"] as const;
type PasteKey = (typeof PASTE_KEYS)[number];
// Thứ tự cột khi dán bảng hạng phòng từ Excel.
const ROOM_PASTE = ["name", "price", "capacity", "extra", "breakfast", "note"] as const;
type RoomPasteKey = (typeof ROOM_PASTE)[number];

function validRooms(r: Row): RoomRow[] {
  return r.rooms.filter((m) => m.name.trim() && m.price != null && m.price > 0);
}

function summary(r: Row): { text: string; ok: boolean } {
  const v = validRooms(r);
  if (!v.length) return { text: "chưa có hạng phòng", ok: false };
  return { text: `${v.length} hạng · từ ${fmtNum(Math.min(...v.map((m) => m.price as number)))}`, ok: true };
}

export function ResortBulkAdd() {
  const counter = useRef(1);
  const nextKey = () => counter.current++;
  const blankRoom = (): RoomRow => ({ key: nextKey(), name: "", price: null, capacity: null, extra: null, breakfast: false, note: "" });
  const blankRow = (): Row => ({
    key: nextKey(),
    code: "",
    name: "",
    area: "",
    type: "resort",
    amenities: { pool: false, near_beach: false, sea_view: false, near_lake: false, karaoke: false, bbq: false, pickleball: false },
    rooms: [blankRoom(), blankRoom()],
    sub_region: "",
    address: "",
    map: "",
    note: "",
    images: [],
    open: false,
    err: {},
    msg: "",
  });

  const [rows, setRows] = useState<Row[]>(() => [blankRow(), blankRow()]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const isEmpty = (r: Row) => !r.code && !r.name && !r.area && validRooms(r).length === 0 && r.images.length === 0;
  const filled = rows.filter((r) => !isEmpty(r)).length;
  useUnsavedGuard(filled > 0);

  function patch(key: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p, msg: "" } : r)));
  }
  function clearErr(key: number, field: keyof Row["err"]) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key || !r.err[field]) return r;
        const err = { ...r.err };
        delete err[field];
        return { ...r, err };
      })
    );
  }
  function patchRoom(rowKey: number, roomKey: number, p: Partial<RoomRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== rowKey) return r;
        const err = { ...r.err };
        delete err.rooms;
        return { ...r, err, rooms: r.rooms.map((m) => (m.key === roomKey ? { ...m, ...p } : m)) };
      })
    );
  }

  function onPasteTable(e: ClipboardEvent<HTMLTableElement>) {
    const target = e.target as HTMLElement;

    // Dán bảng hạng phòng (tên | giá | sức chứa | extra bed | ăn sáng | ghi chú)
    const roomHolder = target.closest<HTMLElement>("[data-rpaste]");
    if (roomHolder) {
      const grid = parseClipboardTable(e);
      if (!grid) return;
      e.preventDefault();
      const rowIdx = Number(roomHolder.dataset.row);
      const roomIdx = Number(roomHolder.dataset.room);
      const startCol = ROOM_PASTE.indexOf(roomHolder.dataset.rpaste as RoomPasteKey);
      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, rooms: r.rooms.map((m) => ({ ...m })), err: { ...r.err } }));
        const row = next[rowIdx];
        while (row.rooms.length < roomIdx + grid.length) row.rooms.push(blankRoom());
        grid.forEach((cells, ri) => {
          const room = row.rooms[roomIdx + ri];
          cells.forEach((val, ci) => {
            const k = ROOM_PASTE[startCol + ci];
            if (!k) return;
            if (k === "name") room.name = val;
            else if (k === "note") room.note = val;
            else if (k === "breakfast") room.breakfast = /^(x|1|có|co|yes|true|y)$/i.test(val);
            else room[k] = parseNum(val);
          });
        });
        delete row.err.rooms;
        return next;
      });
      toast.success(`Đã dán ${grid.length} hạng phòng từ Excel.`);
      return;
    }

    // Dán Mã · Tên · Khu vực
    const holder = target.closest<HTMLElement>("[data-paste]");
    if (!holder) return;
    const grid = parseClipboardTable(e);
    if (!grid) return;
    e.preventDefault();
    const startRow = Number(holder.dataset.row);
    const startCol = PASTE_KEYS.indexOf(holder.dataset.paste as PasteKey);
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      while (next.length < startRow + grid.length) next.push(blankRow());
      grid.forEach((cells, ri) => {
        const row = next[startRow + ri];
        cells.forEach((val, ci) => {
          const k = PASTE_KEYS[startCol + ci];
          if (k) row[k] = val;
        });
      });
      return next;
    });
    toast.success(`Đã dán ${grid.length} dòng từ Excel.`);
  }

  function addImages(key: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: Img[] = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, images: [...r.images, ...added] } : r)));
  }
  function removeImage(key: number, idx: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        URL.revokeObjectURL(r.images[idx].url);
        return { ...r, images: r.images.filter((_, i) => i !== idx) };
      })
    );
  }

  function toInput(r: Row): ProductInput {
    const lowest = Math.min(...validRooms(r).map((m) => m.price as number));
    return {
      product_code: r.code.trim(),
      product_name: r.name.trim(),
      type: r.type,
      area: r.area.trim(),
      sub_region: r.sub_region.trim() || null,
      address: r.address.trim() || null,
      price: lowest,
      price_weekday: null,
      price_friday_sunday: null,
      price_saturday_holiday: null,
      discount_scheme: "uniform",
      discount_type: "percent",
      discount_value: 0,
      discount_weekday_type: "percent",
      discount_weekday_value: 0,
      discount_friday_sunday_type: "percent",
      discount_friday_sunday_value: 0,
      discount_saturday_holiday_type: "percent",
      discount_saturday_holiday_value: 0,
      ...r.amenities,
      note: r.note.trim() || null,
      google_maps_url: r.map.trim() || null,
    };
  }

  async function saveAll() {
    const work = rows.filter((r) => !isEmpty(r));
    if (work.length === 0) {
      toast.error("Chưa có dòng nào để lưu.");
      return;
    }

    const seen = new Set<string>();
    const checked = new Map<number, Partial<Row>>();
    work.forEach((r) => {
      const err: Row["err"] = {};
      if (!r.code.trim()) err.code = true;
      if (!r.name.trim()) err.name = true;
      if (!r.area.trim()) err.area = true;
      if (validRooms(r).length === 0) err.rooms = true;
      let msg = "";
      const code = r.code.trim().toLowerCase();
      if (code) {
        if (seen.has(code)) {
          err.code = true;
          msg = "Mã bị trùng với 1 dòng khác trong bảng.";
        }
        seen.add(code);
      }
      if (Object.keys(err).length) {
        checked.set(r.key, {
          err,
          open: err.rooms ? true : r.open,
          msg: msg || (err.rooms ? "Cần ít nhất 1 hạng phòng có tên và giá (đã mở sẵn mục hạng phòng)." : "Thiếu thông tin bắt buộc (ô tô đỏ)."),
        });
      }
    });
    if (checked.size) setRows((prev) => prev.map((r) => (checked.has(r.key) ? { ...r, ...checked.get(r.key)! } : r)));

    const valid = work.filter((r) => !checked.has(r.key));
    if (valid.length === 0) {
      toast.error(`${checked.size} dòng còn thiếu thông tin (tô đỏ), điền nốt rồi lưu lại.`);
      return;
    }

    setSaving(true);
    const savedKeys = new Set<number>();
    const failed = new Map<number, string>();
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      setProgress(`${i + 1}/${valid.length}`);
      try {
        const result = await postJson<{ id: string }>("/api/admin/products", { input: toInput(r) });
        const urls = r.images.length ? await uploadProductImages(result.id, r.images.map((x) => x.file)) : [];
        if (urls.length) await postJson(`/api/admin/products/${result.id}/images`, { imageUrls: urls });
        const rates: HotelRateInput[] = validRooms(r).map((m) => ({
          room_type: m.name.trim(),
          price: m.price as number,
          capacity: m.capacity,
          breakfast: m.breakfast,
          extra_bed_price: m.extra,
          note: m.note.trim() || null,
        }));
        await postJson(`/api/admin/products/${result.id}/rates`, { rates });
        savedKeys.add(r.key);
      } catch (err) {
        failed.set(r.key, err instanceof Error ? err.message : "Lỗi không xác định.");
      }
    }
    setProgress("");
    setSaving(false);

    setRows((prev) => {
      prev.filter((r) => savedKeys.has(r.key)).forEach((r) => r.images.forEach((im) => URL.revokeObjectURL(im.url)));
      const left = prev
        .filter((r) => !savedKeys.has(r.key) && !isEmpty(r))
        .map((r) => (failed.has(r.key) ? { ...r, msg: failed.get(r.key)! } : r));
      return left.length ? left : [blankRow(), blankRow()];
    });

    const remain = checked.size + failed.size;
    if (remain) toast.error(`Đã lưu ${savedKeys.size} resort/hotel. ${remain} dòng chưa lưu được (xem ghi chú đỏ ở từng dòng).`);
    else toast.success(`Đã lưu ${savedKeys.size} resort/hotel kèm đủ hạng phòng, tiện ích, ảnh chỉ với 1 lần bấm.`);
  }

  return (
    <div className="pb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRows((p) => [...p, blankRow()])} className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim">
          + 1 dòng
        </button>
        <button
          type="button"
          onClick={() => {
            if (filled === 0 || confirm("Xoá toàn bộ nội dung đang điền trong bảng?")) setRows([blankRow(), blankRow()]);
          }}
          className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim"
        >
          Xoá bảng
        </button>
        <span className="text-[12px] text-ink-muted">{filled} dòng đã điền</span>
      </div>

      <p className="mb-3 rounded-xl bg-teal-light px-3.5 py-2.5 text-[12.5px] leading-relaxed text-teal-dark">
        Mỗi dòng là 1 resort/khách sạn. Bấm <b>Chi tiết</b> để nhập <b>các hạng phòng</b> (tên, giá/đêm, sức chứa, extra bed, ăn sáng, ghi chú), nội dung, địa chỉ và tải ảnh.
        Có thể copy bảng hạng phòng từ Excel rồi dán (Ctrl+V) vào ô tên hạng phòng.
      </p>

      <div className="max-h-[66vh] overflow-auto rounded-2xl border border-border bg-white">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]" onPaste={onPasteTable}>
          <thead>
            <tr>
              <Th w={30} sticky={0}>#</Th>
              <Th w={90} sticky={30}>Mã *</Th>
              <Th w={220} sticky={120}>Tên resort / hotel *</Th>
              <Th w={115}>Khu vực *</Th>
              <Th w={105}>Loại</Th>
              {AMENITIES.map((a) => (
                <Th key={a.key} w={58} className="text-center">{a.label}</Th>
              ))}
              <Th w={160}>Hạng phòng *</Th>
              <Th w={62}>Ảnh</Th>
              <Th w={100}> </Th>
              <Th w={34}> </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sm = summary(r);
              return (
                <RowGroup key={r.key}>
                  <tr>
                    <Td sticky={0} className="px-2 text-center text-ink-muted" style={{ width: 30, minWidth: 30 }}>{i + 1}</Td>
                    <Td sticky={30} err={r.err.code} style={{ width: 90, minWidth: 90 }}>
                      <div data-row={i} data-paste="code"><TextCell value={r.code} onChange={(v) => { patch(r.key, { code: v }); clearErr(r.key, "code"); }} /></div>
                    </Td>
                    <Td sticky={120} err={r.err.name} style={{ width: 220, minWidth: 220 }}>
                      <div data-row={i} data-paste="name"><TextCell value={r.name} onChange={(v) => { patch(r.key, { name: v }); clearErr(r.key, "name"); }} /></div>
                    </Td>
                    <Td err={r.err.area}>
                      <div data-row={i} data-paste="area"><TextCell value={r.area} onChange={(v) => { patch(r.key, { area: v }); clearErr(r.key, "area"); }} /></div>
                    </Td>
                    <Td>
                      <SelectCell
                        value={r.type}
                        options={[
                          { value: "resort" as const, label: "Resort" },
                          { value: "hotel" as const, label: "Khách sạn" },
                        ]}
                        onChange={(v) => patch(r.key, { type: v })}
                      />
                    </Td>
                    {AMENITIES.map((a) => (
                      <Td key={a.key}>
                        <CheckCell checked={r.amenities[a.key]} title={a.label} onChange={(v) => patch(r.key, { amenities: { ...r.amenities, [a.key]: v } })} />
                      </Td>
                    ))}
                    <Td err={r.err.rooms} className="px-2 text-[11.5px]">
                      {sm.ok ? <b className="text-teal-dark">{sm.text}</b> : <span className="font-semibold text-danger">{sm.text}</span>}
                    </Td>
                    <Td className="px-2 text-[11.5px]">
                      {r.images.length ? <b className="text-teal-dark">{r.images.length} ảnh</b> : <span className="text-ink-muted">chưa có</span>}
                    </Td>
                    <Td className="px-1">
                      <button type="button" onClick={() => patch(r.key, { open: !r.open })} className="whitespace-nowrap rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-teal-dark hover:bg-teal-light">
                        {r.open ? "▾ Thu gọn" : "▸ Chi tiết"}
                      </button>
                    </Td>
                    <Td className="text-center">
                      <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.key !== r.key) : p))} className="px-2 font-bold text-danger" title="Xoá dòng">✕</button>
                    </Td>
                  </tr>
                  {r.msg && (
                    <tr>
                      <td colSpan={COLS} className="bg-danger-light px-3 py-1.5 text-[11.5px] font-semibold text-danger">Dòng {i + 1}: {r.msg}</td>
                    </tr>
                  )}
                  {r.open && (
                    <tr>
                      <td colSpan={COLS} className="bg-paper px-4 py-3">
                        <p className="mb-1.5 text-[11px] font-bold text-ink-muted">CÁC HẠNG PHÒNG</p>
                        <table className="w-full max-w-3xl border-collapse overflow-hidden rounded-xl border border-border bg-white">
                          <thead>
                            <tr className="bg-paper-dim text-left text-[10.5px] text-ink-muted">
                              <th className="px-2 py-1.5">Tên hạng phòng *</th>
                              <th className="px-2 py-1.5">Giá / đêm *</th>
                              <th className="px-2 py-1.5">Sức chứa</th>
                              <th className="px-2 py-1.5">Extra bed</th>
                              <th className="px-2 py-1.5 text-center">Ăn sáng</th>
                              <th className="px-2 py-1.5">Ghi chú</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {r.rooms.map((m, mi) => (
                              <tr key={m.key} className="border-t border-border">
                                <td className="p-1"><div data-rpaste="name" data-row={i} data-room={mi}><RoomText value={m.name} onChange={(v) => patchRoom(r.key, m.key, { name: v })} placeholder="VD: Deluxe Ocean View" /></div></td>
                                <td className="p-1"><div data-rpaste="price" data-row={i} data-room={mi}><RoomNum value={m.price} onChange={(v) => patchRoom(r.key, m.key, { price: v })} /></div></td>
                                <td className="p-1"><div data-rpaste="capacity" data-row={i} data-room={mi}><RoomNum value={m.capacity} onChange={(v) => patchRoom(r.key, m.key, { capacity: v })} /></div></td>
                                <td className="p-1"><div data-rpaste="extra" data-row={i} data-room={mi}><RoomNum value={m.extra} onChange={(v) => patchRoom(r.key, m.key, { extra: v })} /></div></td>
                                <td className="p-1 text-center"><input type="checkbox" checked={m.breakfast} onChange={(e) => patchRoom(r.key, m.key, { breakfast: e.target.checked })} className="h-4 w-4 accent-[#0E6B5A]" /></td>
                                <td className="p-1"><div data-rpaste="note" data-row={i} data-room={mi}><RoomText value={m.note} onChange={(v) => patchRoom(r.key, m.key, { note: v })} /></div></td>
                                <td className="p-1 text-center">
                                  <button type="button" onClick={() => patch(r.key, { rooms: r.rooms.filter((x) => x.key !== m.key) })} className="font-bold text-danger" title="Xoá hạng phòng">✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button type="button" onClick={() => patch(r.key, { rooms: [...r.rooms, blankRoom()] })} className="mt-2 rounded-lg border border-border bg-white px-3 py-1.5 text-[11.5px] font-bold text-teal-dark hover:bg-teal-light">
                          + Thêm hạng phòng
                        </button>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Nội dung / ghi chú" full>
                            <textarea value={r.note} onChange={(e) => patch(r.key, { note: e.target.value })} rows={3} placeholder="Mô tả, chính sách, lưu ý..." className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]" />
                          </Field>
                          <Field label="Tiểu khu vực"><SimpleInput value={r.sub_region} onChange={(v) => patch(r.key, { sub_region: v })} /></Field>
                          <Field label="Địa chỉ"><SimpleInput value={r.address} onChange={(v) => patch(r.key, { address: v })} /></Field>
                          <Field label="Link Google Maps" full><SimpleInput value={r.map} onChange={(v) => patch(r.key, { map: v })} /></Field>
                          <Field label="Hình ảnh (ảnh đầu tiên là ảnh bìa, tự nén khi lưu)" full>
                            <label className="inline-block cursor-pointer rounded-xl border-2 border-dashed border-teal bg-teal-light px-4 py-2 text-[12px] font-bold text-teal-dark">
                              + Chọn ảnh (nhiều ảnh)
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(r.key, e.target.files); e.target.value = ""; }} />
                            </label>
                            {r.images.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {r.images.map((im, idx) => (
                                  <div key={im.url} className="relative h-14 w-[70px] overflow-hidden rounded-lg border border-border bg-paper-dim">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                                    <button type="button" onClick={() => removeImage(r.key, idx)} className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-black/60 text-[10px] leading-none text-white">×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Field>
                        </div>
                      </td>
                    </tr>
                  )}
                </RowGroup>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button type="button" onClick={saveAll} disabled={saving || filled === 0} className="h-11 rounded-xl bg-teal px-7 text-[13.5px] font-bold text-white hover:bg-teal-dark disabled:opacity-50">
          {saving ? `Đang lưu ${progress}...` : `Lưu tất cả resort / hotel (${filled})`}
        </button>
      </div>
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function RoomText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 w-full rounded-md border border-border px-2 text-[12px]" />;
}
function RoomNum({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return <input inputMode="numeric" value={fmtNum(value)} onChange={(e) => onChange(parseNum(e.target.value))} className="h-8 w-full rounded-md border border-border px-2 text-right text-[12px]" />;
}
