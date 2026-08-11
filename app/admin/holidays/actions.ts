"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
}

export async function addHoliday(
  holiday_date: string,
  holiday_name: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("holidays").insert({ holiday_date, holiday_name });
  if (error) {
    return {
      error: error.message.includes("holidays_holiday_date_key")
        ? "Ngày này đã có trong danh sách ngày lễ."
        : error.message,
    };
  }

  revalidatePath("/admin/holidays");
  revalidatePath("/api/search");
  return { ok: true };
}

export async function deleteHoliday(id: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/holidays");
  return { ok: true };
}
