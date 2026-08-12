import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase "thuần", không đọc cookies() — an toàn để dùng bên trong
 * unstable_cache (Next.js không cho phép gọi API động như cookies() trong
 * hàm được cache). Chỉ dùng cho các truy vấn ĐỌC công khai (RLS đã mở cho
 * anon toàn bộ ứng dụng), không dùng cho các thao tác cần biết phiên đăng nhập.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
