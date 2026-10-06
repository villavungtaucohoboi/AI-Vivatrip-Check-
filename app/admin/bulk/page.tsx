import Link from "next/link";
import { ArrowLeft, Building2, Home, Ship } from "lucide-react";

const SECTIONS = [
  {
    key: "villa",
    title: "Villa",
    desc: "Giá 3 khung (T2-T5, T6 & CN, T7 & Lễ), chiết khấu, phụ thu, tiện ích, ảnh.",
    icon: Home,
  },
  {
    key: "cruise",
    title: "Du thuyền Hạ Long",
    desc: "Tour trong ngày & qua đêm: giá, bữa ăn, dịch vụ bao gồm, lịch trình, cabin, file lịch trình.",
    icon: Ship,
  },
  {
    key: "resort",
    title: "Resort / Hotel",
    desc: "Nhiều hạng phòng mỗi nơi: giá/đêm, sức chứa, extra bed, ăn sáng, tiện ích, ảnh.",
    icon: Building2,
  },
] as const;

export default function BulkHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quay lại Quản lý sản phẩm
      </Link>
      <h1 className="font-display text-2xl text-ink">Thêm / sửa hàng loạt</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Dành cho Admin khi cần cập nhật nhiều sản phẩm một lúc. Muốn thêm hoặc sửa từng sản phẩm thì vẫn dùng nút <b>Thêm sản phẩm</b> và biểu tượng bút ở Quản lý sản phẩm như cũ — hai cách dùng riêng, không ảnh hưởng nhau.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SECTIONS.map(({ key, title, desc, icon: Icon }) => (
          <div key={key} className="flex flex-col rounded-2xl border border-border bg-white p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
              <Icon className="h-5 w-5 text-teal-dark" />
            </div>
            <p className="text-[15px] font-bold text-ink">{title}</p>
            <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-muted">{desc}</p>
            <div className="mt-4 space-y-2">
              <Link
                href={`/admin/bulk/${key}/edit`}
                className="block rounded-xl bg-teal px-3 py-2.5 text-center text-[13px] font-bold text-white hover:bg-teal-dark"
              >
                Sửa giá hàng loạt
              </Link>
              <Link
                href={`/admin/bulk/${key}/add`}
                className="block rounded-xl border border-border px-3 py-2.5 text-center text-[13px] font-bold text-ink hover:bg-paper-dim"
              >
                Thêm hàng loạt
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
