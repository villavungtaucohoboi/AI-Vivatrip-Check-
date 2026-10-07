"use client";

import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import { toast } from "sonner";
import {
  BulkSaveBar,
  CheckCell,
  Field,
  NumCell,
  SelectCell,
  SimpleNum,
  Td,
  TextCell,
  Th,
  parseClipboardTable,
  parseNum,
  useUnsavedGuard,
} from "@/components/admin/bulk/bulk-ui";
import { postJson, uploadProductImages, uploadRawFile } from "@/lib/bulk-upload";
import {
  CRUISE_CATEGORY_LABEL,
  CRUISE_SERVICES,
  CRUISE_STARS,
  CRUISE_VARIANTS,
  childAgeLabel,
  defaultVariant,
  defaultMeals,
  mealSummary,
  type Cruise,
  type CruiseCategory,
  type CruiseMeal,
} from "@/lib/cruise-types";

interface CabinRow {
  key: number;
  name: string;
  price: number | null;
}
interface FileRow {
  key: number;
  name: string;
  size: number;
  url?: string;
  file?: File;
}
interface TierRow {
  key: number;
  from: number | null;
  to: number | null;
  price: number | null;
}
/** Dữ liệu cũ chỉ có nhãn chữ (VD "5-9 tuổi") → tách lấy số. */
function tierAges(t: { age_label: string; age_from: number | null; age_to: number | null }): { from: number | null; to: number | null } {
  if (t.age_from != null || t.age_to != null) return { from: t.age_from, to: t.age_to };
  const m = t.age_label.match(/(\d+)\D+(\d+)/);
  return m ? { from: Number(m[1]), to: Number(m[2]) } : { from: null, to: null };
}
interface ImgRow {
  key: number;
  url?: string;
  file?: File;
  preview?: string;
}
interface Row {
  key: number;
  id?: string;
  category: CruiseCategory;
  name: string;
  duration: string;
  star: number;
  variant: string;
  adult: number | null;
  childFrom: number | null;
  childTo: number | null;
  child: number | null;
  moreChild: TierRow[];
  capacity: number | null;
  cabinCount: number | null;
  url: string;
  images: ImgRow[];
  discount: number | null;
  meals: CruiseMeal[];
  services: string[];
  itinerary: string;
  note: string;
  cabins: CabinRow[];
  files: FileRow[];
  open: boolean;
  err: Partial<Record<"name" | "adult", boolean>>;
  msg: string;
}

const COLS = 27;
const PASTE_KEYS = ["name", "duration", "adult", "childFrom", "childTo", "child", "discount"] as const;
type PasteKey = (typeof PASTE_KEYS)[number];

const MEAL_RE = { sang: /sáng|brunch/i, trua: /trưa/i, toi: /tối|tiệc/i } as const;
const MEAL_STD = { sang: "Ăn sáng", trua: "Ăn trưa", toi: "Ăn tối" } as const;
type MealTick = keyof typeof MEAL_RE;

const QUICK_SERVICES = ["xe", "kayak", "hang", "tiec", "spa"];

function mealTick(meals: CruiseMeal[], k: MealTick): boolean {
  const ms = meals.filter((m) => MEAL_RE[k].test(m.label));
  return ms.length > 0 && ms.every((m) => m.included);
}
function setMealTick(meals: CruiseMeal[], k: MealTick, on: boolean): CruiseMeal[] {
  const has = meals.some((m) => MEAL_RE[k].test(m.label));
  if (!has) return on ? [...meals, { label: MEAL_STD[k], included: true }] : meals;
  return meals.map((m) => (MEAL_RE[k].test(m.label) ? { ...m, included: on } : m));
}
function setAllMeals(meals: CruiseMeal[], category: CruiseCategory, on: boolean): CruiseMeal[] {
  const base = meals.length ? meals : defaultMeals(category);
  return base.map((m) => ({ ...m, included: on }));
}

function detailSnap(r: Row): string {
  return JSON.stringify({
    meals: r.meals,
    services: [...r.services].sort(),
    it: r.itinerary,
    note: r.note,
    more: r.moreChild.map((t) => [t.from, t.to, t.price]),
    url: r.url,
    imgs: r.images.map((i) => i.url ?? `new:${i.key}`),
    cabins: r.cabins.map((c) => [c.name, c.price]),
    files: r.files.map((f) => f.url ?? `new:${f.name}:${f.size}`),
  });
}

function isEmptyRow(r: Row): boolean {
  return !r.name && r.adult == null && !r.itinerary && r.files.length === 0 && r.images.length === 0;
}

export function CruiseBulk({ mode, initial }: { mode: "edit" | "add"; initial: Cruise[] }) {
  const counter = useRef(1);
  const nextKey = () => counter.current++;

  const fromCruise = (c: Cruise): Row => ({
    key: nextKey(),
    id: c.id,
    category: c.category,
    name: c.name,
    duration: c.duration_label ?? "",
    star: c.star ?? 5,
    adult: c.price_adult,
    variant: c.variant ?? defaultVariant(c.category),
    childFrom: c.child_prices[0] ? tierAges(c.child_prices[0]).from : null,
    childTo: c.child_prices[0] ? tierAges(c.child_prices[0]).to : null,
    child: c.child_prices[0] ? c.child_prices[0].price : c.price_child || null,
    moreChild: c.child_prices.slice(1).map((t) => ({ key: nextKey(), from: tierAges(t).from, to: tierAges(t).to, price: t.price })),
    capacity: c.capacity,
    cabinCount: c.cabin_count,
    url: c.itinerary_url ?? "",
    images: c.images.map((i) => ({ key: nextKey(), url: i.url })),
    discount: c.discount_percent || null,
    meals: c.meals.map((m) => ({ ...m })),
    services: [...c.services],
    itinerary: c.itinerary,
    note: c.note ?? "",
    cabins: c.cabins.map((x) => ({ key: nextKey(), name: x.name, price: x.price })),
    files: c.files.map((f) => ({ key: nextKey(), name: f.file_name, size: f.file_size, url: f.file_url })),
    open: false,
    err: {},
    msg: "",
  });
  const blankRow = (category: CruiseCategory = "day"): Row => ({
    key: nextKey(),
    category,
    name: "",
    duration: "",
    star: 5,
    adult: null,
    variant: defaultVariant(category),
    childFrom: null,
    childTo: null,
    child: null,
    moreChild: [],
    capacity: null,
    cabinCount: null,
    url: "",
    images: [],
    discount: null,
    meals: defaultMeals(category),
    services: [],
    itinerary: "",
    note: "",
    cabins: [],
    files: [],
    open: false,
    err: {},
    msg: "",
  });

  const [rows, setRows] = useState<Row[]>(() => (mode === "edit" ? initial.map(fromCruise) : [blankRow("day"), blankRow("night")]));
  const [origin, setOrigin] = useState<Map<string, Row>>(() => {
    const m = new Map<string, Row>();
    if (mode === "edit") rows.forEach((r) => r.id && m.set(r.id, structuredCloneRow(r)));
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [cat, setCat] = useState<"" | CruiseCategory>("");
  const [search, setSearch] = useState("");

  function mainDirty(r: Row, k: "category" | "name" | "duration" | "star" | "variant" | "adult" | "childFrom" | "childTo" | "child" | "capacity" | "cabinCount" | "discount"): boolean {
    if (!r.id) return false;
    const o = origin.get(r.id);
    return !!o && o[k] !== r[k];
  }
  function detailDirty(r: Row): boolean {
    if (!r.id) return false;
    const o = origin.get(r.id);
    return !!o && detailSnap(o) !== detailSnap(r);
  }
  function rowDirty(r: Row): boolean {
    if (!r.id) return !isEmptyRow(r);
    const o = origin.get(r.id);
    if (!o) return false;
    return (["category", "name", "duration", "star", "variant", "adult", "childFrom", "childTo", "child", "capacity", "cabinCount", "discount"] as const).some((k) => o[k] !== r[k]) || detailSnap(o) !== detailSnap(r);
  }

  const dirtyCount = rows.filter(rowDirty).length;
  useUnsavedGuard(dirtyCount > 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!cat || r.category === cat) && (!q || r.name.toLowerCase().includes(q) || !r.id));
  }, [rows, cat, search]);

  function patch(key: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p, msg: "" } : r)));
  }
  function clearErr(key: number, f: "name" | "adult") {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key || !r.err[f]) return r;
        const err = { ...r.err };
        delete err[f];
        return { ...r, err };
      })
    );
  }
  function update(key: number, fn: (r: Row) => Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...fn(r), msg: "" } : r)));
  }
  function toggleService(key: number, svc: string, on: boolean) {
    update(key, (r) => ({ services: on ? Array.from(new Set([...r.services, svc])) : r.services.filter((s) => s !== svc) }));
  }
  function changeCategory(r: Row, category: CruiseCategory) {
    // Đổi loại: nếu bữa ăn còn là mẫu cũ chưa chỉnh thì đổi theo mẫu của loại mới.
    const untouched = JSON.stringify(r.meals) === JSON.stringify(defaultMeals(r.category));
    patch(r.key, { category, variant: defaultVariant(category), meals: untouched ? defaultMeals(category) : r.meals });
  }

  function onPasteTable(e: ClipboardEvent<HTMLTableElement>) {
    const holder = (e.target as HTMLElement).closest<HTMLElement>("[data-paste]");
    if (!holder) return;
    const grid = parseClipboardTable(e);
    if (!grid) return;
    e.preventDefault();
    const startKey = Number(holder.dataset.key);
    const startCol = PASTE_KEYS.indexOf(holder.dataset.paste as PasteKey);
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const idx = next.findIndex((r) => r.key === startKey);
      grid.forEach((cells, gi) => {
        if (idx + gi >= next.length) next.push(blankRow());
        const row = next[idx + gi];
        cells.forEach((val, ci) => {
          const k = PASTE_KEYS[startCol + ci];
          if (!k) return;
          if (k === "name") row.name = val;
          else if (k === "duration") row.duration = val;
          else row[k] = parseNum(val);
        });
      });
      return next;
    });
    toast.success(`Đã dán ${grid.length} dòng từ Excel.`);
  }

  function addFiles(key: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: FileRow[] = Array.from(files).map((file) => ({ key: nextKey(), name: file.name, size: file.size, file }));
    update(key, (r) => ({ files: [...r.files, ...added] }));
  }

  function addImages(key: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: ImgRow[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ key: nextKey(), file, preview: URL.createObjectURL(file) }));
    if (added.length === 0) {
      toast.error("Chỉ chọn được file ảnh (JPG, PNG, WebP).");
      return;
    }
    update(key, (r) => ({ images: [...r.images, ...added] }));
  }
  function moveImage(key: number, imgKey: number, dir: -1 | 1) {
    update(key, (r) => {
      const i = r.images.findIndex((x) => x.key === imgKey);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= r.images.length) return {};
      const next = [...r.images];
      [next[i], next[j]] = [next[j], next[i]];
      return { images: next };
    });
  }

  function undoAll() {
    setRows((prev) =>
      prev
        .filter((r) => r.id)
        .map((r) => {
          const o = origin.get(r.id as string);
          return o ? structuredCloneRow(o) : r;
        })
    );
    toast("Đã hoàn tác các thay đổi chưa lưu.");
  }

  async function deleteRow(r: Row) {
    if (r.id) {
      if (!confirm(`Xoá du thuyền "${r.name}"? Toàn bộ hạng cabin và file đính kèm cũng bị xoá, không khôi phục được.`)) return;
      try {
        const res = await fetch(`/api/admin/bulk/cruises?id=${r.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Không xoá được.");
        setOrigin((prev) => {
          const next = new Map(prev);
          next.delete(r.id as string);
          return next;
        });
        toast.success("Đã xoá du thuyền.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không xoá được.");
        return;
      }
    }
    setRows((prev) => (prev.length > 1 || mode === "edit" ? prev.filter((x) => x.key !== r.key) : prev));
  }

  async function saveAll() {
    const work = rows.filter(rowDirty);
    if (work.length === 0) {
      toast.error("Chưa có thay đổi nào để lưu.");
      return;
    }
    const checked = new Map<number, Partial<Row>>();
    work.forEach((r) => {
      const err: Row["err"] = {};
      if (!r.name.trim()) err.name = true;
      if (r.adult == null) err.adult = true;
      if (Object.keys(err).length) checked.set(r.key, { err, msg: "Cần nhập Tên và Giá người lớn (ô tô đỏ)." });
    });
    if (checked.size) setRows((prev) => prev.map((r) => (checked.has(r.key) ? { ...r, ...checked.get(r.key)! } : r)));
    const valid = work.filter((r) => !checked.has(r.key));
    if (valid.length === 0) {
      toast.error(`${checked.size} dòng còn thiếu thông tin (tô đỏ).`);
      return;
    }

    setSaving(true);
    const savedKeys = new Set<number>();
    const failed = new Map<number, string>();
    const savedRows = new Map<number, Row>();

    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      setProgress(`${i + 1}/${valid.length}`);
      try {
        const files = [];
        for (const f of r.files) {
          if (f.file) {
            const url = await uploadRawFile(`cruise-files/${r.id ?? `new-${r.key}`}`, f.file);
            files.push({ file_name: f.name, file_url: url, file_size: f.size });
          } else if (f.url) {
            files.push({ file_name: f.name, file_url: f.url, file_size: f.size });
          }
        }
        const images: { url: string }[] = [];
        const pending = r.images.filter((i) => i.file);
        const uploaded = pending.length ? await uploadProductImages(`cruise-images/${r.id ?? `new-${r.key}`}`, pending.map((i) => i.file as File)) : [];
        let ui = 0;
        for (const im of r.images) images.push({ url: im.file ? uploaded[ui++] : (im.url as string) });
        const childTiers = [
          ...(r.child != null || r.childFrom != null || r.childTo != null
            ? [{ age_label: childAgeLabel(r.childFrom, r.childTo), age_from: r.childFrom, age_to: r.childTo, price: r.child ?? 0 }]
            : []),
          ...r.moreChild
            .filter((t) => t.from != null || t.to != null || t.price != null)
            .map((t) => ({ age_label: childAgeLabel(t.from, t.to), age_from: t.from, age_to: t.to, price: t.price ?? 0 })),
        ];
        const result = await postJson<{ id: string }>("/api/admin/bulk/cruises", {
          cruise: {
            id: r.id,
            category: r.category,
            name: r.name.trim(),
            duration_label: r.duration.trim() || null,
            star: r.star,
            variant: r.variant,
            price_adult: r.adult ?? 0,
            price_child: r.child ?? 0,
            child_prices: childTiers,
            images,
            capacity: r.capacity,
            cabin_count: r.cabinCount,
            itinerary_url: r.url.trim() || null,
            discount_percent: r.discount ?? 0,
            meals: r.meals,
            services: r.services,
            itinerary: r.itinerary,
            note: r.note.trim() || null,
            sort_order: rows.indexOf(r),
            cabins: r.category === "night" ? r.cabins.filter((c) => c.name.trim()).map((c) => ({ name: c.name, price: c.price ?? 0 })) : [],
            files,
          },
        });
        savedKeys.add(r.key);
        savedRows.set(r.key, {
          ...r,
          id: result.id,
          err: {},
          msg: "",
          files: files.map((f) => ({ key: nextKey(), name: f.file_name, size: f.file_size, url: f.file_url })),
          images: images.map((i) => ({ key: nextKey(), url: i.url })),
        });
      } catch (err) {
        failed.set(r.key, err instanceof Error ? err.message : "Lỗi không xác định.");
      }
    }
    setProgress("");
    setSaving(false);

    if (mode === "add") {
      setRows((prev) => {
        const left = prev.filter((r) => !savedKeys.has(r.key) && !isEmptyRow(r)).map((r) => (failed.has(r.key) ? { ...r, msg: failed.get(r.key)! } : r));
        return left.length ? left : [blankRow("day"), blankRow("night")];
      });
    } else {
      setRows((prev) => prev.map((r) => (savedRows.has(r.key) ? savedRows.get(r.key)! : failed.has(r.key) ? { ...r, msg: failed.get(r.key)! } : r)));
      setOrigin((prev) => {
        const next = new Map(prev);
        savedRows.forEach((r) => next.set(r.id as string, structuredCloneRow(r)));
        return next;
      });
    }

    const remain = checked.size + failed.size;
    if (remain) toast.error(`Đã lưu ${savedKeys.size} du thuyền. ${remain} dòng chưa lưu được (xem ghi chú đỏ).`);
    else toast.success(`Đã lưu ${savedKeys.size} du thuyền chỉ với 1 lần bấm.`);
  }

  return (
    <div className="pb-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {mode === "edit" && (
          <>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên du thuyền..." className="h-10 w-52 rounded-xl border border-border bg-white px-3 text-[13px]" />
            {(["", "day", "night"] as const).map((c) => (
              <button
                key={c || "all"}
                type="button"
                onClick={() => setCat(c)}
                className={`h-10 rounded-xl px-4 text-[12.5px] font-bold ${cat === c ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"}`}
              >
                {c === "" ? "Tất cả" : CRUISE_CATEGORY_LABEL[c]}
              </button>
            ))}
          </>
        )}
        <button type="button" onClick={() => setRows((p) => [...p, blankRow(cat || "day")])} className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim">
          + Thêm dòng
        </button>
        {mode === "add" && (
          <button
            type="button"
            onClick={() => {
              if (dirtyCount === 0 || confirm("Xoá toàn bộ nội dung đang điền trong bảng?")) setRows([blankRow("day"), blankRow("night")]);
            }}
            className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim"
          >
            Xoá bảng
          </button>
        )}
      </div>

      <p className="mb-3 rounded-xl bg-teal-light px-3.5 py-2.5 text-[12.5px] leading-relaxed text-teal-dark">
        Mỗi dòng là 1 du thuyền. <b>Trong ngày có Day Cruise và Dinner Cruise → nhập 2 dòng cùng tên, khác "Phân loại"</b> (mỗi dòng có lịch trình + giá riêng, Sale sẽ thấy gộp 1 thẻ có 2 tab). Qua đêm chọn Vịnh Hạ Long / Lan Hạ. <b>Tích sẵn bữa ăn và dịch vụ bao gồm</b> ngay trên bảng — tích <b>Trọn gói</b> là tự tích đủ các bữa theo lịch trình.
        Bấm <b>Chi tiết</b> để thêm <b>ảnh</b>, thêm mốc tuổi trẻ em, link lịch trình, nhập lịch trình (mỗi dòng "giờ | nội dung"), giá từng hạng cabin (tour qua đêm), tuỳ chỉnh từng bữa ăn và <b>tải file lịch trình</b> lên (khi Sale tải xuống sẽ tự nén thành 1 file zip).
        Dán từ Excel được 7 cột: Tên · Thời gian · Giá NL · TE từ · TE đến · Giá TE · CK% (đặt con trỏ ở ô Tên).
      </p>

      <div className="max-h-[68vh] overflow-auto rounded-2xl border border-border bg-white">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]" onPaste={onPasteTable}>
          <thead>
            <tr>
              <Th w={30} sticky={0}>#</Th>
              <Th w={210} sticky={30}>Tên du thuyền *</Th>
              <Th w={105}>Loại</Th>
              <Th w={130}>Phân loại</Th>
              <Th w={100}>Thời gian</Th>
              <Th w={78}>Hạng sao</Th>
              <Th w={72} right>Số chỗ</Th>
              <Th w={72} right>Số cabin</Th>
              <Th w={115} right>Giá người lớn *</Th>
              <Th w={58} right>TE từ (tuổi)</Th>
              <Th w={58} right>đến (tuổi)</Th>
              <Th w={105} right>Giá trẻ em</Th>
              <Th w={72} right>CK %</Th>
              <Th w={54} className="text-center">Ăn sáng</Th>
              <Th w={54} className="text-center">Ăn trưa</Th>
              <Th w={54} className="text-center">Ăn tối</Th>
              <Th w={66} className="text-center">Trọn gói bữa</Th>
              <Th w={52} className="text-center">Xe đón</Th>
              <Th w={54} className="text-center">Kayak</Th>
              <Th w={64} className="text-center">Tham quan hang</Th>
              <Th w={58} className="text-center">Tiệc / BBQ tối</Th>
              <Th w={50} className="text-center">Spa</Th>
              <Th w={100}> </Th>
              <Th w={34}> </Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLS} className="p-8 text-center text-sm text-ink-muted">Chưa có du thuyền nào. Bấm "+ Thêm dòng" để bắt đầu.</td>
              </tr>
            )}
            {visible.map((r, i) => {
              const full = mealSummary(r.meals).full;
              return (
                <RowGroup key={r.key}>
                  <tr>
                    <Td sticky={0} className="px-2 text-center text-ink-muted" style={{ width: 30, minWidth: 30 }}>{i + 1}</Td>
                    <Td sticky={30} err={r.err.name} dirty={mainDirty(r, "name")} style={{ width: 210, minWidth: 210 }}>
                      <div data-key={r.key} data-paste="name"><TextCell value={r.name} onChange={(v) => { patch(r.key, { name: v }); clearErr(r.key, "name"); }} placeholder="VD: Paradise Elegance 2N1Đ" /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "category")}>
                      <SelectCell value={r.category} options={[{ value: "day" as const, label: "Trong ngày" }, { value: "night" as const, label: "Qua đêm" }]} onChange={(v) => changeCategory(r, v)} />
                    </Td>
                    <Td dirty={mainDirty(r, "variant")}>
                      <SelectCell value={r.variant} options={CRUISE_VARIANTS[r.category].map((v) => ({ value: v.key, label: v.label }))} onChange={(v) => patch(r.key, { variant: v })} />
                    </Td>
                    <Td dirty={mainDirty(r, "duration")}>
                      <div data-key={r.key} data-paste="duration"><TextCell value={r.duration} onChange={(v) => patch(r.key, { duration: v })} placeholder="VD: 2N1Đ" /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "star")}>
                      <SelectCell value={r.star} options={CRUISE_STARS.map((n) => ({ value: n as number, label: `${n} sao` }))} onChange={(v) => patch(r.key, { star: v })} />
                    </Td>
                    <Td dirty={mainDirty(r, "capacity")}>
                      <NumCell value={r.capacity} col="capacity" onChange={(v) => patch(r.key, { capacity: v })} />
                    </Td>
                    <Td dirty={mainDirty(r, "cabinCount")}>
                      <NumCell value={r.cabinCount} col="cabinCount" onChange={(v) => patch(r.key, { cabinCount: v })} />
                    </Td>
                    <Td err={r.err.adult} dirty={mainDirty(r, "adult")}>
                      <div data-key={r.key} data-paste="adult"><NumCell value={r.adult} col="adult" onChange={(v) => { patch(r.key, { adult: v }); clearErr(r.key, "adult"); }} /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "childFrom")}>
                      <div data-key={r.key} data-paste="childFrom"><NumCell value={r.childFrom} col="childFrom" placeholder="5" onChange={(v) => patch(r.key, { childFrom: v })} /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "childTo")}>
                      <div data-key={r.key} data-paste="childTo"><NumCell value={r.childTo} col="childTo" placeholder="9" onChange={(v) => patch(r.key, { childTo: v })} /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "child")}>
                      <div data-key={r.key} data-paste="child"><NumCell value={r.child} col="child" onChange={(v) => patch(r.key, { child: v })} /></div>
                    </Td>
                    <Td dirty={mainDirty(r, "discount")}>
                      <div data-key={r.key} data-paste="discount"><NumCell value={r.discount} col="discount" suffix="%" onChange={(v) => patch(r.key, { discount: v != null && v > 100 ? 100 : v })} /></div>
                    </Td>
                    {(["sang", "trua", "toi"] as const).map((k) => (
                      <Td key={k}><CheckCell checked={mealTick(r.meals, k)} onChange={(v) => update(r.key, (x) => ({ meals: setMealTick(x.meals, k, v) }))} /></Td>
                    ))}
                    <Td><CheckCell checked={full} title="Ăn trọn gói theo lịch trình — tích đủ mọi bữa" onChange={(v) => update(r.key, (x) => ({ meals: setAllMeals(x.meals, x.category, v) }))} /></Td>
                    {QUICK_SERVICES.map((s) => (
                      <Td key={s}><CheckCell checked={r.services.includes(s)} title={CRUISE_SERVICES.find((x) => x.key === s)?.label} onChange={(v) => toggleService(r.key, s, v)} /></Td>
                    ))}
                    <Td className="px-1">
                      <button type="button" onClick={() => patch(r.key, { open: !r.open })} className="whitespace-nowrap rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-teal-dark hover:bg-teal-light">
                        {r.open ? "▾ Thu gọn" : "▸ Chi tiết"}
                        {detailDirty(r) && <span className="ml-1 text-sand">●</span>}
                      </button>
                    </Td>
                    <Td className="text-center">
                      <button type="button" onClick={() => deleteRow(r)} className="px-2 font-bold text-danger" title="Xoá dòng">✕</button>
                    </Td>
                  </tr>
                  {r.msg && (
                    <tr>
                      <td colSpan={COLS} className="bg-danger-light px-3 py-1.5 text-[11.5px] font-semibold text-danger">{r.name || `Dòng ${i + 1}`}: {r.msg}</td>
                    </tr>
                  )}
                  {r.open && (
                    <tr>
                      <td colSpan={COLS} className="bg-paper px-4 py-3">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <Field label="Lịch trình (mỗi dòng 1 mốc: giờ | nội dung)" full>
                              <textarea value={r.itinerary} onChange={(e) => patch(r.key, { itinerary: e.target.value })} rows={7} placeholder={"07:30 | Xe đón tại Hà Nội\n12:00 | Lên tàu, ăn trưa buffet"} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]" />
                            </Field>
                            <div className="mt-3">
                              <Field label="Ghi chú" full>
                                <textarea value={r.note} onChange={(e) => patch(r.key, { note: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]" />
                              </Field>
                            </div>
                          </div>

                          <div>
                            <p className="mb-1.5 text-[11px] font-bold text-ink-muted">BỮA ĂN (tuỳ chỉnh từng bữa)</p>
                            <div className="space-y-1.5">
                              {r.meals.map((m, mi) => (
                                <div key={mi} className="flex items-center gap-2">
                                  <input type="checkbox" checked={m.included} onChange={(e) => update(r.key, (x) => ({ meals: x.meals.map((y, yi) => (yi === mi ? { ...y, included: e.target.checked } : y)) }))} className="h-4 w-4 accent-[#0E6B5A]" />
                                  <input value={m.label} onChange={(e) => update(r.key, (x) => ({ meals: x.meals.map((y, yi) => (yi === mi ? { ...y, label: e.target.value } : y)) }))} className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-[12px]" />
                                  <button type="button" onClick={() => update(r.key, (x) => ({ meals: x.meals.filter((_, yi) => yi !== mi) }))} className="px-1 font-bold text-danger">✕</button>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <MiniBtn onClick={() => update(r.key, (x) => ({ meals: [...x.meals, { label: "", included: true }] }))}>+ Thêm bữa</MiniBtn>
                              <MiniBtn onClick={() => update(r.key, (x) => ({ meals: setAllMeals(x.meals, x.category, true) }))}>Tích tất cả (trọn gói)</MiniBtn>
                              <MiniBtn onClick={() => update(r.key, (x) => ({ meals: setAllMeals(x.meals, x.category, false) }))}>Bỏ tích hết</MiniBtn>
                              <MiniBtn onClick={() => update(r.key, (x) => ({ meals: defaultMeals(x.category) }))}>Dùng mẫu {r.category === "day" ? "trong ngày" : "qua đêm"}</MiniBtn>
                            </div>

                            <p className="mb-1.5 mt-4 text-[11px] font-bold text-ink-muted">DỊCH VỤ BAO GỒM</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {CRUISE_SERVICES.map((s) => (
                                <label key={s.key} className="flex cursor-pointer items-center gap-2 text-[12px]">
                                  <input type="checkbox" checked={r.services.includes(s.key)} onChange={(e) => toggleService(r.key, s.key, e.target.checked)} className="h-4 w-4 accent-[#0E6B5A]" />
                                  {s.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {r.category === "night" && (
                          <div className="mt-4">
                            <p className="mb-1.5 text-[11px] font-bold text-ink-muted">GIÁ TỪNG HẠNG CABIN</p>
                            <div className="max-w-md space-y-1.5">
                              {r.cabins.map((c) => (
                                <div key={c.key} className="flex items-center gap-2">
                                  <input value={c.name} onChange={(e) => update(r.key, (x) => ({ cabins: x.cabins.map((y) => (y.key === c.key ? { ...y, name: e.target.value } : y)) }))} placeholder="VD: Deluxe Cabin" className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-[12px]" />
                                  <div className="w-36"><SimpleNum value={c.price} onChange={(v) => update(r.key, (x) => ({ cabins: x.cabins.map((y) => (y.key === c.key ? { ...y, price: v } : y)) }))} placeholder="Giá / khách" /></div>
                                  <button type="button" onClick={() => update(r.key, (x) => ({ cabins: x.cabins.filter((y) => y.key !== c.key) }))} className="px-1 font-bold text-danger">✕</button>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2">
                              <MiniBtn onClick={() => update(r.key, (x) => ({ cabins: [...x.cabins, { key: nextKey(), name: "", price: null }] }))}>+ Thêm hạng cabin</MiniBtn>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="mb-1.5 text-[11px] font-bold text-ink-muted">GIÁ TRẺ EM: "từ … đến … tuổi: giá" (mốc 1 nhập ngay trên bảng; thêm mốc khác ở đây)</p>
                          <div className="max-w-xl space-y-1.5">
                            {r.moreChild.map((t) => (
                              <div key={t.key} className="flex items-center gap-2">
                                <span className="text-[12px] text-ink-muted">Giá trẻ em từ</span>
                                <div className="w-14"><SimpleNum value={t.from} onChange={(v) => update(r.key, (x) => ({ moreChild: x.moreChild.map((y) => (y.key === t.key ? { ...y, from: v } : y)) }))} placeholder="10" /></div>
                                <span className="text-[12px] text-ink-muted">đến</span>
                                <div className="w-14"><SimpleNum value={t.to} onChange={(v) => update(r.key, (x) => ({ moreChild: x.moreChild.map((y) => (y.key === t.key ? { ...y, to: v } : y)) }))} placeholder="14" /></div>
                                <span className="text-[12px] text-ink-muted">tuổi:</span>
                                <div className="w-32"><SimpleNum value={t.price} onChange={(v) => update(r.key, (x) => ({ moreChild: x.moreChild.map((y) => (y.key === t.key ? { ...y, price: v } : y)) }))} placeholder="Giá" /></div>
                                <button type="button" onClick={() => update(r.key, (x) => ({ moreChild: x.moreChild.filter((y) => y.key !== t.key) }))} className="px-1 font-bold text-danger">✕</button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <MiniBtn onClick={() => update(r.key, (x) => ({ moreChild: [...x.moreChild, { key: nextKey(), from: null, to: null, price: null }] }))}>+ Thêm mốc tuổi</MiniBtn>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="mb-1.5 text-[11px] font-bold text-ink-muted">ẢNH DU THUYỀN (ảnh đầu tiên là ảnh bìa — hiện ra ngoài trang Sale)</p>
                          <label className="inline-block cursor-pointer rounded-xl border-2 border-dashed border-teal bg-teal-light px-4 py-2 text-[12px] font-bold text-teal-dark">
                            + Thêm ảnh (chọn được nhiều ảnh)
                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(r.key, e.target.files); e.target.value = ""; }} />
                          </label>
                          {r.images.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {r.images.map((im, ii) => (
                                <div key={im.key} className="w-24">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={im.preview ?? im.url} alt="" className="h-16 w-24 rounded-lg border border-border object-cover" />
                                  <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-ink-muted">{ii === 0 ? "Bìa" : ii + 1}{im.file ? "*" : ""}</span>
                                    <span className="flex gap-1.5">
                                      <button type="button" disabled={ii === 0} onClick={() => moveImage(r.key, im.key, -1)} className="text-teal-dark disabled:opacity-30" title="Đưa lên trước">◀</button>
                                      <button type="button" disabled={ii === r.images.length - 1} onClick={() => moveImage(r.key, im.key, 1)} className="text-teal-dark disabled:opacity-30" title="Đưa ra sau">▶</button>
                                      <button type="button" onClick={() => update(r.key, (x) => ({ images: x.images.filter((y) => y.key !== im.key) }))} className="text-danger" title="Xoá ảnh">✕</button>
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 max-w-xl">
                          <Field label="Link lịch trình gửi khách (tuỳ chọn — dán link Drive/Canva...; để trống thì Sale copy ra trang riêng của VivaTrip)" full>
                            <input value={r.url} onChange={(e) => patch(r.key, { url: e.target.value })} placeholder="https://..." className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[12.5px]" />
                          </Field>
                        </div>

                        <div className="mt-4">
                          <p className="mb-1.5 text-[11px] font-bold text-ink-muted">FILE LỊCH TRÌNH / ẢNH (Sale tải xuống sẽ tự nén thành file zip)</p>
                          <label className="inline-block cursor-pointer rounded-xl border-2 border-dashed border-teal bg-teal-light px-4 py-2 text-[12px] font-bold text-teal-dark">
                            + Tải file lên (PDF, ảnh, Word...)
                            <input type="file" multiple className="hidden" onChange={(e) => { addFiles(r.key, e.target.files); e.target.value = ""; }} />
                          </label>
                          <div className="mt-2 max-w-xl space-y-1">
                            {r.files.map((f) => (
                              <div key={f.key} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-1.5 text-[12px]">
                                <span className="truncate">
                                  {f.name} <span className="text-ink-muted">({Math.max(1, Math.round(f.size / 1024))} KB){f.file ? " · chưa lưu" : ""}</span>
                                </span>
                                <button type="button" onClick={() => update(r.key, (x) => ({ files: x.files.filter((y) => y.key !== f.key) }))} className="ml-3 font-bold text-danger">Xoá</button>
                              </div>
                            ))}
                          </div>
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

      {mode === "add" ? (
        <div className="mt-4">
          <button type="button" onClick={saveAll} disabled={saving || dirtyCount === 0} className="h-11 rounded-xl bg-teal px-7 text-[13.5px] font-bold text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? `Đang lưu ${progress}...` : `Lưu tất cả du thuyền (${dirtyCount})`}
          </button>
        </div>
      ) : (
        <BulkSaveBar
          show={dirtyCount > 0}
          message={<>Đã sửa <b className="text-sand-dark">{dirtyCount} du thuyền</b> — chưa lưu</>}
          onSave={saveAll}
          onUndo={undoAll}
          saving={saving}
        />
      )}
    </div>
  );
}

function structuredCloneRow(r: Row): Row {
  return {
    ...r,
    meals: r.meals.map((m) => ({ ...m })),
    services: [...r.services],
    cabins: r.cabins.map((c) => ({ ...c })),
    moreChild: r.moreChild.map((t) => ({ ...t })),
    images: r.images.map((i) => ({ ...i })),
    files: r.files.map((f) => ({ ...f })),
    err: {},
    msg: "",
  };
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-bold text-teal-dark hover:bg-teal-light">
      {children}
    </button>
  );
}
