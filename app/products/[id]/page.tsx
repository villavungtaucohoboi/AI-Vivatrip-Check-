import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  BedSingle,
  Droplet,
  UserPlus,
  Dumbbell,
  Eye,
  ExternalLink,
  Flame,
  MapPin,
  Music2,
  Users,
  Waves,
} from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public-client";
import { villaQuoteText } from "@/lib/villa-text";
import { NoteView } from "@/components/note-view";
import { ProductGallery } from "@/components/product-gallery";
import { CopyButton } from "@/components/copy-button";
import { DownloadImagesButton } from "@/components/download-images-button";
import { ResortDetailPanel } from "@/components/resort/resort-detail-panel";
import { getAllProducts, getAllRates } from "@/lib/catalog";
import { groupKeyOf } from "@/lib/hotel-group";
import { VillaPricingTable } from "@/components/villa-pricing-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import { resolveProductPricing } from "@/lib/pricing";
import { PRODUCT_TYPE_LABEL, type Holiday, type HotelRate, type Product, type ProductImage } from "@/lib/types";

const AMENITIES = [
  { key: "pool" as const, label: "Hồ bơi riêng", Icon: Waves },
  { key: "near_beach" as const, label: "Sát biển", Icon: MapPin },
  { key: "sea_view" as const, label: "View biển", Icon: Eye },
  { key: "near_lake" as const, label: "View hồ", Icon: Droplet },
  { key: "karaoke" as const, label: "Phòng karaoke", Icon: Music2 },
  { key: "bbq" as const, label: "Khu BBQ", Icon: Flame },
  { key: "pickleball" as const, label: "Sân pickleball", Icon: Dumbbell },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export const revalidate = 30;

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; guests?: string; checkout?: string }>;
}) {
  const { id } = await params;
  const { date, checkout } = await searchParams;
  const supabase = createPublicClient();

  const { data: productRow } = await supabase.from("products").select("*").eq("id", id).single();

  if (!productRow) notFound();
  const product = productRow as Product;
  const isVilla = product.type === "villa";

  const backHref = isVilla ? "/search" : "/search-resort";

  const [{ data: images }, { data: rates }, { data: holidays }] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    !isVilla
      ? supabase.from("hotel_rates").select("*").eq("product_id", id).order("sort_order").order("price")
      : Promise.resolve({ data: [] as HotelRate[] }),
    supabase.from("holidays").select("*"),
  ]);

  const gallery: ProductImage[] = images?.length
    ? images
    : product.thumbnail_url
    ? [{ id: "thumb", product_id: id, image_url: product.thumbnail_url, sort_order: 0 }]
    : [];

  const activeAmenities = AMENITIES.filter(({ key }) => product[key]);

  const pricingContext =
    isVilla && date ? resolveProductPricing(product, { date }, (holidays ?? []) as Holiday[]).context : undefined;


  // Cùng khách sạn ở các ĐỐI TÁC khác (để so giá / chốt thêm)
  let partners: { product: Product; rates: HotelRate[] }[] = [];
  if (!isVilla) {
    const [all, allRates] = await Promise.all([getAllProducts(), getAllRates()]);
    const gk = groupKeyOf(product);
    partners = all
      .filter((p) => p.id !== product.id && p.type !== "villa" && groupKeyOf(p) === gk)
      .map((p) => ({ product: p, rates: allRates.filter((r) => r.product_id === p.id) }));
  }

  if (!isVilla) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Tìm Resort / Khách sạn
        </Link>

        <ProductGallery images={gallery} alt={product.product_name} />

        <div className="mt-5">
          <Badge variant="neutral" className="mb-2">
            {PRODUCT_TYPE_LABEL[product.type]}
          </Badge>
          <h1 className="font-display text-2xl font-bold text-ink">
            {product.product_name}
            {product.star ? <span className="ml-2 align-middle text-[18px] text-amber-500">{"★".repeat(product.star)}</span> : null}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-teal">
            <MapPin className="h-4 w-4" />
            {product.address || product.area}
          </p>
        </div>

        {activeAmenities.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-[13px] font-bold tracking-wide text-ink-muted">TIỆN ÍCH CHUNG</h2>
            <div className="grid grid-cols-2 gap-2">
              {activeAmenities.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white p-3 text-[12.5px] text-ink"
                >
                  <Icon className="h-4 w-4 shrink-0 text-teal-dark" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {product.note && (
          <Card className="mt-5 p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base text-ink">Ghi chú</h2>
              <CopyButton text={product.note} />
            </div>
            <NoteView text={product.note} />
          </Card>
        )}

        <div className="mt-5">
          <ResortDetailPanel
            product={product}
            rates={(rates ?? []) as HotelRate[]}
            holidays={(holidays ?? []) as Holiday[]}
            images={gallery.map((g) => g.image_url)}
            partners={partners}
            initialCheckin={date}
            initialCheckout={checkout}
          />
        </div>

        {product.google_maps_url && (
          <a href={product.google_maps_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4" />
              Xem trên Google Maps
            </Button>
          </a>
        )}
      </main>
    );
  }

  const stats = [
    { show: product.bedrooms != null, Icon: BedDouble, value: product.bedrooms, label: "Phòng ngủ", tone: "bg-teal-light text-teal-dark" },
    { show: product.beds != null, Icon: BedSingle, value: product.beds, label: "Giường", tone: "bg-sky-50 text-sky-700" },
    { show: product.standard_guests != null, Icon: Users, value: product.standard_guests, label: "Khách chuẩn", tone: "bg-amber-50 text-amber-700" },
    { show: product.max_guests != null, Icon: UserPlus, value: product.max_guests, label: "Tối đa", tone: "bg-rose-50 text-rose-700" },
  ].filter((x) => x.show);

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-muted shadow-sm hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại tìm kiếm
      </Link>

      <ProductGallery images={gallery} alt={product.product_name} />

      {/* Tên + vị trí */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="rounded-full bg-teal px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {PRODUCT_TYPE_LABEL[product.type]}
          </span>
          {product.product_code && (
            <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">Mã {product.product_code}</span>
          )}
        </div>
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">{product.product_name}</h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-[14px] font-medium text-teal">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {product.address || (product.sub_region ? `${product.sub_region}, ${product.area}` : product.area)}
        </p>
      </div>

      {/* Thông số nhanh */}
      {stats.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map(({ Icon, value, label, tone }) => (
            <div key={label} className="flex flex-col items-center rounded-2xl border border-border bg-white px-1 py-2.5 shadow-card">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-1 text-[17px] font-extrabold leading-none text-ink">{value}</span>
              <span className="mt-0.5 text-[10.5px] font-medium text-ink-muted">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tiện ích */}
      {activeAmenities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeAmenities.map(({ key, label, Icon }) => (
            <span key={key} className="flex items-center gap-1.5 rounded-full bg-teal-light px-3 py-1.5 text-[12.5px] font-semibold text-teal-dark">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Bảng giá */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-extrabold text-ink">Bảng giá / đêm</h2>
          <CopyButton
            text={villaQuoteText(product)}
            label="Copy gửi khách"
            toastText="Đã copy nội dung — dán vào Zalo gửi khách"
            className="bg-gradient-to-r from-teal-dark to-teal !text-white font-bold shadow-sm hover:opacity-95"
          />
        </div>
        <VillaPricingTable product={product} context={pricingContext} />
      </Card>

      {/* Nội dung căn */}
      {product.note && (
        <Card className="mt-4 p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Thông tin căn</h2>
            <CopyButton text={product.note} />
          </div>
          <NoteView text={product.note} />
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
        {gallery.length > 0 && <DownloadImagesButton images={gallery} productName={product.product_name} />}
        {product.google_maps_url && (
          <a href={product.google_maps_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="h-4 w-4" />
              Xem trên Google Maps
            </Button>
          </a>
        )}
      </div>
    </main>
  );
}
