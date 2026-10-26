/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // TẮT tối ưu ảnh của Vercel: gói Hobby chỉ có 5.000 lượt/tháng, vượt là bị khoá web.
    // Ảnh đã được nén khi up lên (lib/compress-image.ts) nên hiển thị thẳng từ Supabase vẫn nhẹ.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        // Chỉ dùng cho ảnh mẫu (seed data) — có thể xóa khi đã thay bằng ảnh thật
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
