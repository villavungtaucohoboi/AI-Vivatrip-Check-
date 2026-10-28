"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { thumbOf } from "@/lib/img-url";

export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  fill = true,
  unoptimized,
  className,
  thumb,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  unoptimized?: boolean;
  className?: string;
  /** Dùng ảnh NHỎ của kho R2 (danh sách / ô nhỏ); lỗi thì tự quay về ảnh gốc */
  thumb?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [useFull, setUseFull] = useState(false);
  const small = thumb && !useFull ? thumbOf(src) : src;

  if (!src || failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-paper-dim", className)}>
        <ImageOff className="h-6 w-6 text-ink-muted/60" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={small || src!}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn("object-cover", className)}
      onError={() => (small !== src && !useFull ? setUseFull(true) : setFailed(true))}
    />
  );
}
