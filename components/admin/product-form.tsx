"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ProductImage } from "@/components/product-image";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { type ProductInput, type HotelRateInput } from "@/lib/admin-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { PriceInput } from "@/components/ui/price-input";
import { DiscountValueInput } from "@/components/admin/discount-value-input";
import { HotelRateEditor } from "@/components/admin/hotel-rate-editor";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";
import { PRODUCT_TYPE_LABEL, type HotelRate, type Product, type ProductImage as ProductImageRow } from "@/lib/types";

interface ExistingImage {
  url: string;
  kind: "existing";
}
interface NewImage {
  url: string; // object URL preview
  file: File;
  kind: "new";
}
type ImageItem = ExistingImage | NewImage;

async function postJson<T>(url: string, body: unknown, method: "POST" | "DELETE" = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
  return data as T;
}

function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : "";

  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9-_]+/g, "-") // mọi ký tự khác (khoảng trắng, emoji...) -> "-"
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  return cleanExt ? `${cleanBase || "anh"}.${cleanExt}` : cleanBase || "anh";
}

function toRateInput(r: HotelRate): HotelRateInput {
  return {
    room_type: r.room_type,
    price: r.price,
    capacity: r.capacity,
    breakfast: r.breakfast,
    extra_bed_price: r.extra_bed_price,
    note: r.note,
  };
}

export function ProductForm({
  product,
  images,
  rates,
}: {
  product?: Product;
  images?: ProductImageRow[];
  rates?: HotelRate[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!product;

  const [form, setForm] = useState<ProductInput>({
    product_code: product?.product_code ?? "",
    product_name: product?.product_name ?? "",
    type: product?.type ?? "villa",
    area: product?.area ?? "",
    sub_region: product?.sub_region ?? "",
    address: product?.address ?? "",
    bedrooms: product?.bedrooms ?? null,
    beds: product?.beds ?? null,
    standard_guests: product?.standard_guests ?? null,
    max_guests: product?.max_guests ?? null,
    price: product?.price ?? null,
    price_weekday: product?.price_weekday ?? null,
    price_friday_sunday: product?.price_friday_sunday ?? null,
    price_saturday_holiday: product?.price_saturday_holiday ?? null,
    discount_scheme: product?.discount_scheme ?? "uniform",
    discount_type: product?.discount_type ?? "percent",
    discount_value: product?.discount_value ?? 0,
    discount_weekday_type: product?.discount_weekday_type ?? "percent",
    discount_weekday_value: product?.discount_weekday_value ?? 0,
    discount_friday_sunday_type: product?.discount_friday_sunday_type ?? "percent",
    discount_friday_sunday_value: product?.discount_friday_sunday_value ?? 0,
    discount_saturday_holiday_type: product?.discount_saturday_holiday_type ?? "percent",
    discount_saturday_holiday_value: product?.discount_saturday_holiday_value ?? 0,
    pool: product?.pool ?? false,
    near_beach: product?.near_beach ?? false,
    sea_view: product?.sea_view ?? false,
    karaoke: product?.karaoke ?? false,
    bbq: product?.bbq ?? false,
    pickleball: product?.pickleball ?? false,
    near_lake: product?.near_lake ?? false,
    note: product?.note ?? "",
    google_maps_url: product?.google_maps_url ?? "",
  });

  const [imageItems, setImageItems] = useState<ImageItem[]>(
    (images ?? []).map((img) => ({ url: img.image_url, kind: "existing" as const }))
  );
  const [rateItems, setRateItems] = useState<HotelRateInput[]>(
    (rates ?? []).map(toRateInput)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newItems: NewImage[] = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
      kind: "new",
    }));
    setImageItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.product_code.trim() || !form.product_name.trim() || !form.area.trim()) {
      setError("Vui lòng nhập đủ Mã sản phẩm, Tên sản phẩm và Khu vực.");
      return;
    }

    if (
      form.type !== "hotel" &&
      (form.price_weekday == null || form.price_friday_sunday == null || form.price_saturday_holiday == null)
    ) {
      setError("Vui lòng nhập đủ 3 mức giá: Thứ 2 - Thứ 5, Thứ 6 & Chủ nhật, Thứ 7 & Ngày lễ.");
      return;
    }

    setSaving(true);

    try {
      const result = await postJson<{ id: string } | { error: string }>(
        "/api/admin/products",
        { input: form, id: product?.id }
      );
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }

      const productId = result.id;

      // Upload các ảnh mới lên Supabase Storage
      const finalUrls: string[] = [];
      for (const item of imageItems) {
        if (item.kind === "existing") {
          finalUrls.push(item.url);
        } else {
          const compressed = await compressImage(item.file);
          const path = `${productId}/${Date.now()}-${sanitizeFileName(compressed.name)}`;
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(path, compressed, { upsert: true });

          if (uploadError) {
            throw new Error(`Lỗi upload ảnh: ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(path);
          finalUrls.push(publicUrlData.publicUrl);
        }
      }

      await postJson(`/api/admin/products/${productId}/images`, { imageUrls: finalUrls });

      if (form.type === "hotel") {
        const validRates = rateItems.filter((r) => r.room_type.trim() && r.price > 0);
        await postJson(`/api/admin/products/${productId}/rates`, { rates: validRates });
      }

      toast.success(isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-base text-ink">Thông tin cơ bản</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="product_code">Mã sản phẩm *</Label>
            <Input
              id="product_code"
              value={form.product_code}
              onChange={(e) => set("product_code", e.target.value)}
              placeholder="VD: VIL-PTH-001"
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Loại sản phẩm *</Label>
            <Select
              id="type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as ProductInput["type"])}
            >
              {Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="product_name">Tên sản phẩm *</Label>
          <Input
            id="product_name"
            value={form.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            placeholder="VD: Villa Ocean Mũi Né"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="area">Khu vực *</Label>
            <Input
              id="area"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="VD: Sóc Sơn"
              required
            />
          </div>
          <div>
            <Label htmlFor="sub_region">Tiểu khu vực</Label>
            <Input
              id="sub_region"
              value={form.sub_region ?? ""}
              onChange={(e) => set("sub_region", e.target.value)}
              placeholder="VD: Đồng Đò (để trống nếu không có)"
            />
          </div>
          <div>
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Địa chỉ chi tiết"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-base text-ink">Sức chứa</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bedrooms">Số phòng ngủ</Label>
            <Input
              id="bedrooms"
              type="number"
              min={0}
              value={form.bedrooms ?? ""}
              onChange={(e) => set("bedrooms", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <Label htmlFor="beds">Số giường</Label>
            <Input
              id="beds"
              type="number"
              min={0}
              value={form.beds ?? ""}
              onChange={(e) => set("beds", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <Label htmlFor="standard_guests">Sức chứa tiêu chuẩn</Label>
            <Input
              id="standard_guests"
              type="number"
              min={0}
              value={form.standard_guests ?? ""}
              onChange={(e) =>
                set("standard_guests", e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div>
            <Label htmlFor="max_guests">Sức chứa tối đa</Label>
            <Input
              id="max_guests"
              type="number"
              min={0}
              value={form.max_guests ?? ""}
              onChange={(e) => set("max_guests", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-base text-ink">Bảng giá</h2>

        {form.type === "hotel" ? (
          <div>
            <Label htmlFor="price">Giá hiện tại (VNĐ) — giá phòng thấp nhất</Label>
            <PriceInput
              id="price"
              value={form.price}
              onChange={(v) => set("price", v)}
              placeholder="VD: 1.800.000"
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              Bảng giá chi tiết theo từng loại phòng nhập ở mục "Bảng giá" bên dưới.
            </p>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="price_weekday">Giá Thứ 2 - Thứ 5 *</Label>
              <PriceInput
                id="price_weekday"
                value={form.price_weekday}
                onChange={(v) => set("price_weekday", v)}
              />
            </div>
            <div>
              <Label htmlFor="price_friday_sunday">Giá Thứ 6 & Chủ nhật *</Label>
              <PriceInput
                id="price_friday_sunday"
                value={form.price_friday_sunday}
                onChange={(v) => set("price_friday_sunday", v)}
              />
            </div>
            <div>
              <Label htmlFor="price_saturday_holiday">Giá Thứ 7 & Ngày lễ *</Label>
              <PriceInput
                id="price_saturday_holiday"
                value={form.price_saturday_holiday}
                onChange={(v) => set("price_saturday_holiday", v)}
              />
            </div>
            <div>
              <Label>Chiết khấu</Label>
              <div className="mb-3 flex rounded-xl border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => set("discount_scheme", "uniform")}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    form.discount_scheme === "uniform"
                      ? "bg-teal text-white"
                      : "text-ink-muted hover:bg-paper-dim"
                  )}
                >
                  Mục 1: Áp dụng chung 3 khung
                </button>
                <button
                  type="button"
                  onClick={() => set("discount_scheme", "by_day_type")}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    form.discount_scheme === "by_day_type"
                      ? "bg-teal text-white"
                      : "text-ink-muted hover:bg-paper-dim"
                  )}
                >
                  Mục 2: Tách riêng từng khung ngày
                </button>
              </div>

              {form.discount_scheme === "uniform" ? (
                <DiscountValueInput
                  type={form.discount_type}
                  value={form.discount_value}
                  onTypeChange={(t) => set("discount_type", t)}
                  onValueChange={(v) => set("discount_value", v)}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-ink-muted">
                      Chiết khấu Thứ 2 - Thứ 5
                    </p>
                    <DiscountValueInput
                      type={form.discount_weekday_type}
                      value={form.discount_weekday_value}
                      onTypeChange={(t) => set("discount_weekday_type", t)}
                      onValueChange={(v) => set("discount_weekday_value", v)}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-ink-muted">
                      Chiết khấu Thứ 6 & Chủ nhật
                    </p>
                    <DiscountValueInput
                      type={form.discount_friday_sunday_type}
                      value={form.discount_friday_sunday_value}
                      onTypeChange={(t) => set("discount_friday_sunday_type", t)}
                      onValueChange={(v) => set("discount_friday_sunday_value", v)}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-ink-muted">
                      Chiết khấu Thứ 7 & Ngày lễ
                    </p>
                    <DiscountValueInput
                      type={form.discount_saturday_holiday_type}
                      value={form.discount_saturday_holiday_value}
                      onTypeChange={(t) => set("discount_saturday_holiday_type", t)}
                      onValueChange={(v) => set("discount_saturday_holiday_value", v)}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Card className="p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-base text-ink">Tiện ích</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Checkbox
            id="pool"
            label="Hồ bơi"
            checked={form.pool}
            onChange={(e) => set("pool", e.target.checked)}
          />
          <Checkbox
            id="near_beach"
            label="Sát biển"
            checked={form.near_beach}
            onChange={(e) => set("near_beach", e.target.checked)}
          />
          <Checkbox
            id="sea_view"
            label="View biển"
            checked={form.sea_view}
            onChange={(e) => set("sea_view", e.target.checked)}
          />
          <Checkbox
            id="near_lake"
            label="View hồ"
            checked={form.near_lake}
            onChange={(e) => set("near_lake", e.target.checked)}
          />
          <Checkbox
            id="karaoke"
            label="Karaoke"
            checked={form.karaoke}
            onChange={(e) => set("karaoke", e.target.checked)}
          />
          <Checkbox
            id="bbq"
            label="BBQ"
            checked={form.bbq}
            onChange={(e) => set("bbq", e.target.checked)}
          />
          <Checkbox
            id="pickleball"
            label="Sân pickleball"
            checked={form.pickleball}
            onChange={(e) => set("pickleball", e.target.checked)}
          />
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-base text-ink">Ghi chú & liên kết</h2>
        <div>
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea
            id="note"
            value={form.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Ghi chú nội bộ cho sale..."
          />
        </div>
        <div>
          <Label htmlFor="google_maps_url">Link Google Maps</Label>
          <Input
            id="google_maps_url"
            value={form.google_maps_url ?? ""}
            onChange={(e) => set("google_maps_url", e.target.value)}
            placeholder="https://maps.google.com/..."
          />
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-base text-ink">Ảnh sản phẩm</h2>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {imageItems.map((item, i) => (
            <div key={item.url + i} className="relative aspect-square overflow-hidden rounded-xl bg-paper-dim">
              {item.kind === "existing" ? (
                <ProductImage src={item.url} alt="" sizes="120px" />
              ) : (
                <Image src={item.url} alt="" fill className="object-cover" sizes="120px" unoptimized />
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 rounded-full bg-ink/60 p-1 text-white hover:bg-ink/80"
                aria-label="Xóa ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-ink-muted hover:bg-paper-dim">
            <Upload className="h-5 w-5" />
            <span className="text-xs">Thêm ảnh</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      </Card>

      {form.type === "hotel" && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base text-ink">Bảng giá</h2>
            {rates && rates.length > 0 && (
              <span className="text-xs text-ink-muted">
                Cập nhật lần cuối:{" "}
                {new Date(
                  Math.max(...rates.map((r) => new Date(r.updated_at).getTime()))
                ).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
          <HotelRateEditor value={rateItems} onChange={setRateItems} />
        </Card>
      )}

      {error && (
        <p className="rounded-xl bg-danger-light px-3.5 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="flex gap-3 pb-6">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.push("/admin/products")}
          disabled={saving}
        >
          Hủy
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
        </Button>
      </div>
    </form>
  );
}
