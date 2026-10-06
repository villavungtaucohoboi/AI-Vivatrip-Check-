import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu giá / chiết khấu / phụ thu của NHIỀU villa trong 1 lần bấm. Chỉ nhận đúng
// các cột trong danh sách trắng bên dưới (không cho sửa tên, mã, khu vực...).
// Route nằm dưới /api/admin/* nên middleware đã chặn người chưa đăng nhập Admin.

const INT_KEYS = new Set([
  "price_weekday",
  "price_friday_sunday",
  "price_saturday_holiday",
  "extra_guest_fee",
  "discount_value",
  "discount_weekday_value",
  "discount_friday_sunday_value",
  "discount_saturday_holiday_value",
]);
const NULLABLE_KEYS = new Set(["extra_guest_fee"]);
const TYPE_KEYS = new Set([
  "discount_type",
  "discount_weekday_type",
  "discount_friday_sunday_type",
  "discount_saturday_holiday_type",
]);
const TYPE_VALUE_PAIRS: Record<string, string> = {
  discount_type: "discount_value",
  discount_weekday_type: "discount_weekday_value",
  discount_friday_sunday_type: "discount_friday_sunday_value",
  discount_saturday_holiday_type: "discount_saturday_holiday_value",
};

interface UpdateItem {
  id: string;
  fields: Record<string, unknown>;
}

function sanitize(fields: Record<string, unknown>): { clean?: Record<string, unknown>; error?: string } {
  const clean: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (INT_KEYS.has(key)) {
      if (raw === null && NULLABLE_KEYS.has(key)) {
        clean[key] = null;
        continue;
      }
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
        return { error: `Giá trị "${key}" không hợp lệ.` };
      }
      clean[key] = Math.round(raw);
    } else if (TYPE_KEYS.has(key)) {
      if (raw !== "percent" && raw !== "amount") return { error: `Kiểu chiết khấu "${key}" không hợp lệ.` };
      clean[key] = raw;
    } else if (key === "discount_scheme") {
      if (raw !== "uniform" && raw !== "by_day_type") return { error: "Chế độ chiết khấu không hợp lệ." };
      clean[key] = raw;
    } else {
      return { error: `Không được sửa cột "${key}" ở bảng hàng loạt.` };
    }
  }
  for (const [typeKey, valueKey] of Object.entries(TYPE_VALUE_PAIRS)) {
    if (clean[typeKey] === "percent" && typeof clean[valueKey] === "number" && (clean[valueKey] as number) > 100) {
      return { error: "Chiết khấu % không được lớn hơn 100." };
    }
  }
  return { clean };
}

export async function POST(req: NextRequest) {
  const body: { updates?: UpdateItem[] } = await req.json();
  const updates = body.updates ?? [];
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });
  }
  if (updates.length > 500) {
    return NextResponse.json({ error: "Tối đa 500 sản phẩm mỗi lần lưu." }, { status: 400 });
  }

  const supabase = await createClient();

  const ids = updates.map((u) => u.id);
  const { data: existing, error: lookupError } = await supabase.from("products").select("id, type").in("id", ids);
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
  const typeById = new Map((existing ?? []).map((p) => [p.id as string, p.type as string]));

  const failed: { id: string; error: string }[] = [];
  let saved = 0;

  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    await Promise.all(
      chunk.map(async (u) => {
        const type = typeById.get(u.id);
        if (!type) return void failed.push({ id: u.id, error: "Không tìm thấy sản phẩm." });
        if (type !== "villa") return void failed.push({ id: u.id, error: "Bảng này chỉ dành cho Villa." });

        const { clean, error } = sanitize(u.fields ?? {});
        if (error || !clean) return void failed.push({ id: u.id, error: error ?? "Dữ liệu không hợp lệ." });
        if (Object.keys(clean).length === 0) return;

        // Villa: cột `price` luôn đồng bộ = giá T2-T5 (giống form sửa từng cái).
        if ("price_weekday" in clean) clean.price = clean.price_weekday;

        const { error: updateError } = await supabase.from("products").update(clean).eq("id", u.id);
        if (updateError) failed.push({ id: u.id, error: updateError.message });
        else saved++;
      })
    );
  }

  revalidatePath("/admin/products");
  revalidatePath("/search");
  revalidateTag("products");
  return NextResponse.json({ saved, failed });
}
