"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  alt,
}: {
  images: { image_url: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-paper-dim text-sm text-ink-muted">
        Chưa có ảnh
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-paper-dim">
        <ProductImage
          src={images[active].image_url}
          alt={alt}
          priority
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={img.image_url + i}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2",
                i === active ? "border-teal" : "border-transparent"
              )}
            >
              <Image src={img.image_url} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
