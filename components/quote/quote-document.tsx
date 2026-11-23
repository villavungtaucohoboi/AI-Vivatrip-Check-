// BẢN BÁO GIÁ GỬI KHÁCH — dùng chung cho trang khách /bg/[code], xem trước trong trình soạn, và bản in PDF.
// Không dùng hook → render được cả ở server lẫn client.
// Chỉ hiện những gì sale nhập — không có chiết khấu / com / nguồn giá.
import { cheapestOptionId, lineAmount, nightsBetween, optionTotals, perPax, qtyLabel } from "@/lib/quote-calc";
import { COMPANY, QUOTE_GROUPS, type Quote, type QuoteInput, type QuoteOption } from "@/lib/quote-types";
import { vnd } from "@/lib/tour-utils";
import { cn } from "@/lib/utils";

type DocQuote = QuoteInput & Partial<Pick<Quote, "number" | "updated_at" | "created_at">>;

const dmy = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const dateRange = (from: string | null, to: string | null) => {
  if (!from) return "";
  if (!to || to === from) return dmy(from);
  return from.slice(0, 7) === to.slice(0, 7) ? `${from.slice(8, 10)} – ${dmy(to)}` : `${dmy(from)} – ${dmy(to)}`;
};
const stamp = (iso: string | undefined) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3600e3);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

export function QuoteDocument({ quote: q }: { quote: DocQuote }) {
  const opts = q.options;
  const multi = opts.length > 1;
  const best = cheapestOptionId(opts, q.vat_rate);
  const nights = nightsBetween(q.program.date_from, q.program.date_to);
  const customer = q.customer.company || q.customer.name;

  return (
    <article className="quote-doc mx-auto w-full max-w-[860px] overflow-hidden bg-white text-[13.5px] leading-relaxed text-ink shadow-card sm:rounded-2xl print:max-w-none print:rounded-none print:shadow-none">
      {/* Đầu trang */}
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

      <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 sm:px-8">
        <h1 className="font-display text-[24px] font-bold tracking-wide text-teal-dark sm:text-[27px]">BÁO GIÁ CHƯƠNG TRÌNH</h1>
        <p className="text-[11.5px] leading-snug text-ink-muted sm:text-right">
          {q.number ? `Số: ${q.number} · ` : ""}Ngày {dmy(q.created_at) || dmy(new Date(Date.now() + 7 * 3600e3).toISOString())}
          {q.valid_until ? (
            <>
              <br />
              Hiệu lực đến {dmy(q.valid_until)}
            </>
          ) : null}
        </p>
      </div>

      {/* Dải thông tin */}
      <dl className="mx-5 mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-paper sm:mx-8 sm:grid-cols-4">
        {[
          ["Khách hàng", customer],
          ["Chương trình", q.program.title],
          ["Thời gian", [dateRange(q.program.date_from, q.program.date_to), nights ? `${nights} đêm` : ""].filter(Boolean).join(" · ")],
          ["Số khách", q.program.pax_text || (q.program.pax_count ? `${q.program.pax_count} khách` : "")],
        ].map(([k, v], i) => (
          <div key={k} className={cn("px-3.5 py-2.5", i % 2 === 1 && "border-l border-border", i >= 2 && "border-t border-border sm:border-t-0", i === 2 && "sm:border-l")}>
            <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{k}</dt>
            <dd className="font-bold text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      {q.program.itinerary_note && <p className="mx-5 mt-2 whitespace-pre-line text-[12.5px] text-ink-muted sm:mx-8">{q.program.itinerary_note}</p>}

      {multi ? (
        <>
          <H2>1 · Lựa chọn nơi nghỉ</H2>
          <div className="mx-5 grid gap-3 sm:mx-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {opts.map((o) => (
              <OptionCard key={o.id} o={o} q={q} best={o.id === best} />
            ))}
          </div>
          <H2>2 · Tổng hợp chi phí</H2>
          <CompareTable q={q} />
          {opts.map((o, i) => (
            <section key={o.id} className={cn(i > 0 && "quote-page-break")}>
              <H2>{`${i + 3} · Chi tiết phương án ${i + 1}: ${o.name || `Phương án ${i + 1}`}`}</H2>
              <OptionDetail o={o} q={q} />
            </section>
          ))}
        </>
      ) : opts[0] ? (
        <section>
          <SingleHead o={opts[0]} />
          <OptionDetail o={opts[0]} q={q} />
        </section>
      ) : null}

      {q.notes.length > 0 && (
        <section className="quote-block">
          <H2>Ghi chú</H2>
          <ul className="mx-5 list-disc space-y-0.5 pl-5 text-[12.5px] text-ink-muted sm:mx-8">
            {q.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 bg-ink px-5 py-4 text-[12.5px] text-white sm:px-8">
        <span>
          {q.sale_name || q.sale_phone ? (
            <>
              Người phụ trách: <b className="text-sand">{q.sale_name || "VivaTrip"}</b>
              {q.sale_phone ? ` · ${q.sale_phone}` : ""}
            </>
          ) : (
            <>VivaTrip · {COMPANY.hotline}</>
          )}
        </span>
        <span>
          Cảm ơn Quý khách đã tin chọn <b className="text-sand">VivaTrip</b>
        </span>
      </footer>
      {q.updated_at && <p className="bg-ink px-5 pb-3 text-[10.5px] text-white/50 sm:px-8">Cập nhật lúc {stamp(q.updated_at)}</p>}
    </article>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-5 mb-2.5 mt-6 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-teal-dark after:h-px after:flex-1 after:bg-border sm:mx-8">
      {children}
    </h2>
  );
}

function Photo({ o, className }: { o: QuoteOption; className?: string }) {
  return o.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={o.image_url} alt={o.name} className={cn("object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center bg-gradient-to-br from-sand-light to-teal-light text-[13px] font-bold text-teal-dark/70", className)}>{o.name}</div>
  );
}

function SingleHead({ o }: { o: QuoteOption }) {
  if (!o.name && !o.image_url && !o.highlights.some(Boolean)) return <div className="h-2" />;
  return (
    <div className="mx-5 mt-5 flex flex-col gap-3 overflow-hidden rounded-xl border border-border sm:mx-8 sm:flex-row print:flex-row">
      <Photo o={o} className="h-40 w-full sm:h-auto sm:w-56 print:h-auto print:w-56" />
      <div className="p-3.5">
        <p className="text-[16px] font-extrabold">{o.name}</p>
        {o.place && <p className="text-[12.5px] text-ink-muted">{o.place}</p>}
        {o.highlights.some(Boolean) && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12.5px] text-ink-muted">
            {o.highlights.filter(Boolean).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OptionCard({ o, q, best }: { o: QuoteOption; q: DocQuote; best: boolean }) {
  const t = optionTotals(o, q.vat_rate);
  const pp = perPax(t.total, q.program.pax_count);
  return (
    <div className={cn("quote-block flex flex-col overflow-hidden rounded-xl border", best ? "border-2 border-teal" : "border-border")}>
      <div className="relative">
        <Photo o={o} className="h-28 w-full" />
        {best && <span className="absolute left-2 top-2 rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold text-white">Tiết kiệm nhất</span>}
      </div>
      <div className="flex flex-1 flex-col px-3 py-2.5">
        <p className="font-extrabold leading-snug">{o.name || "Phương án"}</p>
        {o.place && <p className="text-[12px] text-ink-muted">{o.place}</p>}
        {o.highlights.some(Boolean) && (
          <ul className="mt-1 list-disc pl-4 text-[12px] text-ink-muted">
            {o.highlights.filter(Boolean).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        <p className="mt-auto flex justify-between border-t border-dashed border-border pt-1.5 text-[12px]">
          <span className="text-ink-muted">Nơi nghỉ</span>
          <b>{vnd(t.byGroup["Nơi nghỉ"])}</b>
        </p>
      </div>
      <div className="bg-teal-light px-3 py-2">
        <p className="text-[10.5px] font-bold uppercase text-teal-dark">Tổng trọn gói</p>
        <p className="text-[19px] font-extrabold leading-tight text-teal-dark tabular-nums">{vnd(t.total)}</p>
        {pp != null && <p className="text-[11px] text-ink-muted">≈ {vnd(pp)}/khách</p>}
      </div>
    </div>
  );
}

function CompareTable({ q }: { q: DocQuote }) {
  const totals = q.options.map((o) => optionTotals(o, q.vat_rate));
  const groups = QUOTE_GROUPS.filter((g) => totals.some((t) => t.byGroup[g] > 0));
  return (
    <div className="quote-block mx-5 overflow-x-auto sm:mx-8 print:overflow-visible">
      <table className="w-full text-[12.5px] tabular-nums print:table-fixed print:text-[10.5px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-ink-muted">
            <th className="w-28 py-1.5 pr-2 text-left font-bold" />
            {q.options.map((o, i) => (
              <th key={o.id} className="py-1.5 pl-3 text-right font-bold">
                {o.name || `Phương án ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g} className="border-t border-border">
              <td className="whitespace-nowrap py-1.5 pr-2">{g}</td>
              {totals.map((t, i) => (
                <td key={i} className="whitespace-nowrap py-1.5 pl-3 text-right print:whitespace-normal">
                  {t.byGroup[g] ? vnd(t.byGroup[g]) : "—"}
                </td>
              ))}
            </tr>
          ))}
          {totals.some((t) => t.vat > 0) && (
            <tr className="border-t border-border">
              <td className="whitespace-nowrap py-1.5 pr-2">VAT {q.vat_rate}%</td>
              {totals.map((t, i) => (
                <td key={i} className="whitespace-nowrap py-1.5 pl-3 text-right print:whitespace-normal">
                  {t.vat ? vnd(t.vat) : "—"}
                </td>
              ))}
            </tr>
          )}
          <tr className="border-t border-border bg-teal-light font-extrabold text-teal-dark">
            <td className="py-2 pl-2 pr-2">Tổng</td>
            {totals.map((t, i) => (
              <td key={i} className="whitespace-nowrap py-2 pl-3 pr-2 text-right text-[14px] print:whitespace-normal print:text-[11.5px]">
                {vnd(t.total)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function OptionDetail({ o, q }: { o: QuoteOption; q: DocQuote }) {
  const t = optionTotals(o, q.vat_rate);
  const pp = perPax(t.total, q.program.pax_count);
  const groups = QUOTE_GROUPS.filter((g) => o.items.some((it) => it.group === g));
  return (
    <div className="mx-5 mt-3 sm:mx-8">
      <table className="w-full text-[12.5px] sm:text-[13px]">
        <thead>
          <tr className="border-b border-border text-[10.5px] uppercase tracking-wider text-ink-muted">
            <th className="py-1.5 pr-2 text-left font-bold">Dịch vụ</th>
            <th className="py-1.5 pr-2 text-left font-bold">Số lượng</th>
            <th className="hidden py-1.5 pr-2 text-right font-bold sm:table-cell print:table-cell">Đơn giá</th>
            <th className="py-1.5 text-right font-bold">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <GroupRows key={g} g={g} o={o} vatRate={q.vat_rate} />
          ))}
        </tbody>
      </table>
      <div className="quote-block ml-auto mt-2 w-full max-w-[360px] text-[13px] tabular-nums">
        <Row label="Cộng" value={vnd(t.subtotal)} />
        {t.vat > 0 && <Row label={`VAT ${q.vat_rate}% (các mục có VAT)`} value={vnd(t.vat)} />}
        <div className="mt-1 flex items-baseline justify-between rounded-lg bg-teal-light px-3 py-2 font-extrabold text-teal-dark">
          <span>TỔNG THANH TOÁN</span>
          <span className="text-[17px]">{vnd(t.total)}</span>
        </div>
        {pp != null && <p className="mt-1 text-right text-[11.5px] text-ink-muted">≈ {vnd(pp)}/khách</p>}
        {t.hasTbd && <p className="mt-1 text-right text-[11.5px] text-ink-muted">Chưa gồm các mục tính theo thực tế.</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1">
      <span className="text-ink-muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function GroupRows({ g, o, vatRate }: { g: string; o: QuoteOption; vatRate: number }) {
  const items = o.items.filter((it) => it.group === g);
  return (
    <>
      <tr className="bg-paper">
        <td colSpan={4} className="px-2 py-1 text-[11.5px] font-bold text-teal-dark">
          {g}
        </td>
      </tr>
      {items.map((it) => {
        const a = lineAmount(it);
        return (
          <tr key={it.id} className="quote-row border-b border-border align-top">
            <td className="py-1.5 pr-2">
              {it.name || "—"}
              {it.vat && vatRate > 0 ? <span className="ml-1 text-[10px] text-ink-muted">(+VAT)</span> : null}
              {it.note && <span className="quote-note block text-[11.5px] text-ink-muted">{it.note}</span>}
            </td>
            <td className="py-1.5 pr-2 sm:whitespace-nowrap print:whitespace-nowrap">
              {qtyLabel(it)}
              {it.unit_price != null && <span className="block text-[11px] text-ink-muted sm:hidden print:hidden">× {vnd(it.unit_price)}</span>}
            </td>
            <td className="hidden whitespace-nowrap py-1.5 pr-2 text-right tabular-nums sm:table-cell print:table-cell">{it.unit_price != null ? vnd(it.unit_price) : "—"}</td>
            <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums">{a != null ? vnd(a) : <span className="font-normal text-ink-muted">Theo thực tế</span>}</td>
          </tr>
        );
      })}
    </>
  );
}
