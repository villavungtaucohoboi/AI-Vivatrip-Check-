"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  fill = true,
  unoptimized,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  unoptimized?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-paper-dim", className)}>
        <ImageOff className="h-6 w-6 text-ink-muted/60" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
