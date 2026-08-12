"use client";

import { useState } from "react";
import { Copy, Dices, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_TYPE_LABEL,
  pickRandomWish,
  type CustomerType,
  type Wish,
} from "@/lib/daily-wishes";
import { getRecentWishIds, getRecentWishes, recordWishUsed } from "@/lib/wish-history";

const CUSTOMER_TYPES = Object.keys(CUSTOMER_TYPE_LABEL) as CustomerType[];

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function DailyWishesApp() {
  const [customerType, setCustomerType] = useState<CustomerType>("chung");
  const [currentWish, setCurrentWish] = useState<Wish | null>(null);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState(() => getRecentWishes());

  function handleRandom() {
    const wish = pickRandomWish(customerType, getRecentWishIds());
    setCurrentWish(wish);
    setCopied(false);
    recordWishUsed(wish);
    setRecent(getRecentWishes());
  }

  async function handleCopy(text: string) {
    await copyToClipboard(text);
    setCopied(true);
    toast.success("Đã copy lời chúc");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Lời chúc hôm nay</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          Tạo nhanh một lời chúc chuyên nghiệp để gửi khách hàng.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Đối tượng</p>
        <div className="flex flex-wrap gap-1.5">
          {CUSTOMER_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setCustomerType(type)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                customerType === type
                  ? "border-teal bg-teal text-white"
                  : "border-border bg-white text-ink-muted hover:bg-paper-dim"
              )}
            >
              {CUSTOMER_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={handleRandom}>
        <Dices className="h-5 w-5" />
        Random lời chúc
      </Button>

      {currentWish && (
        <Card className="border-teal/30 bg-teal-light/40 p-5">
          <p className="text-[15px] leading-relaxed text-ink">{currentWish.text}</p>
          <div className="mt-4 flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={() => handleCopy(currentWish.text)}>
              {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
              {copied ? "Đã copy" : "Copy"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleRandom}>
              <Dices className="h-4 w-4" />
              Câu khác
            </Button>
          </div>
        </Card>
      )}

      {recent.length > 0 && (
        <div>
          <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Đã dùng gần đây</p>
          <div className="space-y-2">
            {recent.map((w) => (
              <div
                key={w.usedAt}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-3"
              >
                <p className="text-[12.5px] leading-relaxed text-ink-muted line-clamp-2">{w.text}</p>
                <button
                  onClick={() => handleCopy(w.text)}
                  className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim hover:text-ink"
                  aria-label="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
