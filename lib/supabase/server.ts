import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Dùng trong Server Components / Route Handlers / Server Actions.
// Server Components không được phép ghi cookie, nên các lỗi khi setAll
// bên trong Server Component là bình thường và có thể bỏ qua — middleware.ts
// đã lo việc refresh session rồi.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component gọi setAll -> bỏ qua, middleware sẽ xử lý.
          }
        },
      },
    }
  );
}

// Trả về profile (kèm role) của user đang đăng nhập, hoặc null nếu chưa đăng nhập.
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}
