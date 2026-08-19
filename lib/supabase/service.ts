import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase dùng SERVICE ROLE KEY — bỏ qua RLS hoàn toàn.
 *
 * CHỈ dùng trong các API route /api/payroll/* (server-side). Các bảng lương
 * (employees, payslips, payslip_items...) đặt RLS chặn TOÀN BỘ anon/authenticated
 * ở tầng database — nghĩa là dù ai đó có được anon key cũng KHÔNG truy vấn
 * trực tiếp được dữ liệu lương từ trình duyệt. Client này là con đường DUY
 * NHẤT để đọc/ghi dữ liệu lương, và mỗi route tự kiểm tra phiên đăng nhập
 * nhân viên (cookie đã ký) trước khi lọc đúng employee_id của người đó.
 *
 * Không import file này ở bất kỳ Client Component nào — SUPABASE_SERVICE_ROLE_KEY
 * tuyệt đối không được lộ ra trình duyệt.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY (hoặc NEXT_PUBLIC_SUPABASE_URL) trong biến môi trường — bắt buộc để dùng module Bảng lương."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
