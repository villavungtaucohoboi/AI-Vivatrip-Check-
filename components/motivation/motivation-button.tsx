"use client";

import { useState } from "react";
import { MotivationModal } from "@/components/motivation/motivation-modal";

export function MotivationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-teal/20 bg-gradient-to-br from-teal-light to-white px-4 py-3.5 text-left transition-shadow hover:shadow-md"
      >
        <div>
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-teal-dark">
            ❤️ Khi áp lực nhất, bấm vào đây
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">Dành 15 giây cho chính mình</p>
        </div>
        <span className="text-lg text-teal-dark">→</span>
      </button>

      <MotivationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
