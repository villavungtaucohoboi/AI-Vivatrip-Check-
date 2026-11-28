// LỊCH TRÌNH TOUR GỬI KHÁCH (in A4 / lưu PDF) — /lich-trinh/[id]
// Chỉ thông tin gửi khách được: KHÔNG có đối tác, com, số chỗ, điều khoản sale, link file gốc.
import { COMPANY } from "@/lib/quote-types";
import type { TourDeparture, TourWithDeps } from "@/lib/tour-types";
import { WDL, dmy, flagOf, vnd, weekday } from "@/lib/tour-utils";
import { cn } from "@/lib/utils";

/** Ảnh tour: images, thiếu thì dùng cover_url */
export function tourImages(t: Pick<TourWithDeps, "images" | "cover_url">): string[] {
  const list = (t.images ?? []).filter(Boolean);
  return list.length ? list : t.cover_url ? [t.cover_url] : [];
}

/** Tên tour gọn cho khách: bỏ phần ghi chú khách sạn sau " / " và dấu "…" cuối */
export function cleanTourName(name: string): string {
  const head = name.split(" / ")[0].replace(/[\s/…]+$/, "").trim();
  return head || name;
}

export function TourPdf({ tour: t, departures }: { tour: TourWithDeps; departures: TourDeparture[] }) {
  const imgs = tourImages(t).slice(0, 7);
  const facts = [
    t.days ? `${t.days} ngày ${t.nights ?? t.days - 1} đêm` : "",
    t.from_city ? `Khởi hành ${t.from_city}` : "",
    t.airline ? `Bay ${t.airline}` : "",
  ].filter(Boolean);
  const hasChild = departures.some((d) => d.child != null);
  const hasInfant = departures.some((d) => d.infant != null);

  return (
    <article className="tour-pdf quote-doc mx-auto w-full max-w-[860px] overflow-hidden bg-white [overflow-wrap:anywhere] text-[13.5px] leading-relaxed text-ink shadow-card sm:rounded-2xl print:max-w-none print:rounded-none print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b-[3px] border-teal px-5 pb-4 pt-5 sm:px-8 sm:pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/vivatrip-logo.png" alt="VivaTrip" className="h-10 w-auto sm:h-12" />
        <div className="hidden text-right text-[11.5px] leading-snug text-ink-muted sm:block print:block">
          <p className="text-[12.5px] font-bold text-ink">{COMPANY.name}</p>
          <p>{COMPANY.address}</p>
          <p>
            {COMPANY.hotline} · {COMPANY.email} · {COMPANY.website}
          </p>
        </div>
      </header>

      {/* Tên tour */}
      <div className="px-5 pt-5 sm:px-8">
        <p className="text-[12.5px] font-bold uppercase tracking-wider text-teal-dark">
          {flagOf(t)} {t.country}
        </p>
        <h1 className="mt-1 font-display text-[24px] font-bold leading-tight text-ink sm:text-[28px]">{cleanTourName(t.name)}</h1>
        {t.route_text && <p className="mt-1 text-[13px] text-ink-muted">{t.route_text}</p>}
        {facts.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <span key={f} className="rounded-full bg-teal-light px-2.5 py-1 text-[12px] font-bold text-teal-dark">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ảnh */}
      {imgs.length > 0 && (
        <div className="quote-block mt-4 px-5 sm:px-8">
          <div className={cn("grid gap-1.5", imgs.length >= 3 ? "grid-cols-3 grid-rows-2" : imgs.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
            {imgs.slice(0, 3).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className={cn(
                  "h-full w-full rounded-xl object-cover",
                  imgs.length >= 3 && i === 0 ? "col-span-2 row-span-2" : imgs.length >= 3 ? "aspect-[4/3]" : "aspect-[16/9] max-h-[320px]"
                )}
              />
            ))}
          </div>
          {imgs.length > 3 && (
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {imgs.slice(3, 7).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Điểm nổi bật */}
      {t.highlights.length > 0 && (
        <section className="mx-5 mt-5 rounded-2xl bg-gradient-to-br from-teal-light to-sand-light p-4 sm:mx-8">
          <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-teal-dark">Điểm nổi bật của tour</h2>
          <ul className="grid gap-1.5 sm:grid-cols-2 print:grid-cols-2">
            {t.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lịch trình */}
      {t.itinerary.length > 0 && (
        <section className="mt-5 px-5 sm:px-8">
          <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-teal-dark">Lịch trình chi tiết</h2>
          <ol className="space-y-3 border-l-2 border-teal-light pl-4">
            {t.itinerary.map((d, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-extrabold text-white">{i + 1}</span>
                <p className="font-bold text-ink [break-after:avoid]">
                  Ngày {i + 1}: {d.t}
                  {d.meals && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-700">Bữa ăn: {d.meals}</span>}
                </p>
                <div className="mt-0.5 space-y-0.5 text-[13px]">
                  {d.items.filter(Boolean).map((x, j) => (
                    <p key={j}>• {x}</p>
                  ))}
                  {d.hotel && <p className="text-[12px] text-ink-muted">Nghỉ đêm: {d.hotel}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Giá */}
      {departures.length > 0 && (
        <section className="mt-5 px-5 sm:px-8">
          <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-teal-dark [break-after:avoid]">Ngày khởi hành & giá tour</h2>
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="border-b-2 border-teal text-left text-[11px] uppercase text-ink-muted">
                <th className="py-1.5 pr-2">Ngày khởi hành</th>
                <th className="py-1.5 pr-2 text-right">Người lớn</th>
                {hasChild && <th className="py-1.5 pr-2 text-right">Trẻ em</th>}
                {hasInfant && <th className="py-1.5 text-right">Em bé</th>}
              </tr>
            </thead>
            <tbody>
              {departures.map((d) => (
                <tr key={d.depart_date} className="quote-row border-b border-border">
                  <td className="py-1.5 pr-2">
                    <b>{dmy(d.depart_date)}</b> <span className="text-[11.5px] text-ink-muted">{WDL[weekday(d.depart_date)]}</span>
                    {d.tag && <span className="ml-1 rounded bg-sand px-1 text-[10px] font-extrabold text-white">{d.tag}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    {d.old_adult && d.old_adult > d.adult ? <s className="mr-1.5 text-[11.5px] text-ink-muted">{vnd(d.old_adult)}</s> : null}
                    <b className="text-hot">{vnd(d.adult)}</b>
                  </td>
                  {hasChild && <td className="py-1.5 pr-2 text-right">{d.child != null ? vnd(d.child) : "Liên hệ"}</td>}
                  {hasInfant && <td className="py-1.5 text-right">{d.infant != null ? vnd(d.infant) : "Liên hệ"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11.5px] text-ink-muted">Giá tính theo khách, áp dụng tại thời điểm gửi; có thể thay đổi theo tình trạng chỗ.</p>
        </section>
      )}

      {/* Bao gồm / không bao gồm */}
      {(t.includes.length > 0 || t.excludes.length > 0) && (
        <div className="mt-5 grid gap-4 px-5 sm:grid-cols-2 sm:px-8 print:grid-cols-2">
          {t.includes.length > 0 && (
            <section>
              <h2 className="mb-1.5 text-[13px] font-extrabold uppercase tracking-wider text-emerald-700 [break-after:avoid]">Giá tour bao gồm</h2>
              <ul className="list-disc space-y-0.5 pl-4 text-[12.5px]">
                {t.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          )}
          {t.excludes.length > 0 && (
            <section>
              <h2 className="mb-1.5 text-[13px] font-extrabold uppercase tracking-wider text-hot [break-after:avoid]">Không bao gồm</h2>
              <ul className="list-disc space-y-0.5 pl-4 text-[12.5px]">
                {t.excludes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {t.visa_notes.length > 0 && (
        <section className="mt-5 px-5 sm:px-8">
          <h2 className="mb-1.5 text-[13px] font-extrabold uppercase tracking-wider text-teal-dark">Visa & lưu ý</h2>
          <ul className="list-disc space-y-0.5 pl-4 text-[12.5px]">
            {t.visa_notes.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {(t.image_credits ?? []).length > 0 && (
        <p className="mt-4 px-5 text-[9.5px] leading-snug text-ink-muted sm:px-8">Ảnh minh hoạ: {t.image_credits.join(" · ")}</p>
      )}

      <footer className="quote-block mt-6 bg-teal px-5 py-4 text-center text-[12.5px] text-white sm:px-8">
        <p className="font-bold">Liên hệ VivaTrip để giữ chỗ và nhận tư vấn chi tiết</p>
        <p className="text-white/90">
          {COMPANY.hotline} · {COMPANY.email} · {COMPANY.website}
        </p>
      </footer>
    </article>
  );
}
