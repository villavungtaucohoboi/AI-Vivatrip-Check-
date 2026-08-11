import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  ExternalLink,
  Flame,
  MapPin,
  Music2,
  Users,
  Waves,
} from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { ProductGallery } from "@/components/product-gallery";
import { HotelRateTable } from "@/components/hotel-rate-table";
import { VillaPricingTable } from "@/components/villa-pricing-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import { resolveProductPricing } from "@/lib/pricing";
import { PRODUCT_TYPE_LABEL, type Holiday, type HotelRate, type Product, type ProductImage } from "@/lib/types";

const AMENITIES = [
  { key: "pool" as const, label: "Hồ bơi riêng", Icon: Waves },
  { key: "near_beach" as const, label: "Gần biển", Icon: MapPin },
  { key: "karaoke" as const, label: "Phòng karaoke", Icon: Music2 },
  { key: "bbq" as const, label: "Khu BBQ", Icon: Flame },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: productRow } = await supabase.from("products").select("*").eq("id", id).single();

  if (!productRow) notFound();
  const product = productRow as Product;

  const [{ data: images }, { data: rates }, { data: holidays }] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    product.type === "hotel"
      ? supabase.from("hotel_rates").select("*").eq("product_id", id).order("price")
      : Promise.resolve({ data: [] as HotelRate[] }),
    product.type !== "hotel"
      ? supabase.from("holidays").select("*")
      : Promise.resolve({ data: [] as Holiday[] }),
  ]);

  const gallery: ProductImage[] = images?.length
    ? images
    : product.thumbnail_url
    ? [{ id: "thumb", product_id: id, image_url: product.thumbnail_url, sort_order: 0 }]
    : [];

  const activeAmenities = AMENITIES.filter(({ key }) => product[key]);

  const pricingContext =
    product.type !== "hotel" && date
      ? resolveProductPricing(product, { date }, (holidays ?? []) as Holiday[]).context
      : undefined;

  const heroPrice =
    product.type === "hotel"
      ? product.price
      : pricingContext?.finalPrice ?? pricingContext?.basePrice ?? product.price_weekday;

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role={profile?.role ?? "sale"} name={profile?.name} />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/search"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại tìm kiếm
        </Link>

        <ProductGallery images={gallery} alt={product.product_name} />

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="neutral" className="mb-2">
              {PRODUCT_TYPE_LABEL[product.type]}
            </Badge>
            <h1 className="font-display text-2xl text-ink">{product.product_name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin className="h-4 w-4" />
              {product.address || product.area}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular-price font-display text-2xl text-teal-dark">
              {formatVND(heroPrice)}
            </p>
            {product.type === "hotel" && (
              <p className="text-xs text-ink-muted">giá phòng thấp nhất / đêm</p>
            )}
            {product.type !== "hotel" && !date && (
              <p className="text-xs text-ink-muted">giá Thứ 2 - Thứ 5, xem đủ bảng giá bên dưới</p>
            )}
          </div>
        </div>

        {activeAmenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeAmenities.map(({ key, label, Icon }) => (
              <Badge key={key} variant="default">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Badge>
            ))}
          </div>
        )}

        <Card className="mt-5 p-4 sm:p-5">
          <h2 className="mb-1 font-display text-base text-ink">Thông tin sản phẩm</h2>
          <InfoRow label="Mã sản phẩm" value={product.product_code} />
          <InfoRow label="Khu vực" value={product.area} />
          {product.bedrooms != null && (
            <InfoRow
              label="Số phòng ngủ"
              value={
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4 text-ink-muted" />
                  {product.bedrooms}
                </span>
              }
            />
          )}
          {product.beds != null && <InfoRow label="Số giường" value={product.beds} />}
          {product.standard_guests != null && (
            <InfoRow label="Sức chứa tiêu chuẩn" value={`${product.standard_guests} khách`} />
          )}
          {product.max_guests != null && (
            <InfoRow
              label="Sức chứa tối đa"
              value={
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-ink-muted" />
                  {product.max_guests} khách
                </span>
              }
            />
          )}
        </Card>

        {product.note && (
          <Card className="mt-4 p-4 sm:p-5">
            <h2 className="mb-2 font-display text-base text-ink">Ghi chú</h2>
            <p className="whitespace-pre-line text-sm text-ink-muted">{product.note}</p>
          </Card>
        )}

        {product.type === "hotel" ? (
          <Card className="mt-4 p-4 sm:p-5">
            <h2 className="mb-3 font-display text-base text-ink">Bảng giá</h2>
            <HotelRateTable rates={(rates ?? []) as HotelRate[]} />
          </Card>
        ) : (
          <Card className="mt-4 p-4 sm:p-5">
            <h2 className="mb-3 font-display text-base text-ink">Bảng giá</h2>
            <VillaPricingTable product={product} context={pricingContext} />
          </Card>
        )}

        {product.google_maps_url && (
          <a href={product.google_maps_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="mt-5 w-full sm:w-auto">
              <ExternalLink className="h-4 w-4" />
              Xem trên Google Maps
            </Button>
          </a>
        )}
      </main>

      <BottomNav role={profile?.role ?? "sale"} />
    </div>
  );
}
