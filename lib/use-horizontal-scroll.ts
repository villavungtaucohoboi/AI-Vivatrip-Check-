"use client";

import { useEffect, useRef } from "react";

/**
 * Gắn vào bất kỳ hàng cuộn ngang nào có class overflow-x-auto + ẩn thanh
 * cuộn (VD dãy tab khu vực, dãy sheet, dãy ảnh thumbnail). Trên máy tính
 * dùng chuột thường (không cảm ứng, không touchpad) trước đây KHÔNG có
 * cách nào cuộn sang được — hook này thêm 2 cách:
 *   1. Lăn chuột dọc như bình thường -> tự đổi thành cuộn ngang.
 *   2. Giữ chuột kéo ngang trực tiếp (giống kéo carousel).
 */
export function useHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el!.scrollWidth <= el!.clientWidth) return;
      el!.scrollLeft += e.deltaY;
      e.preventDefault();
    }

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    function handleMouseDown(e: MouseEvent) {
      isDown = true;
      el!.classList.add("cursor-grabbing");
      startX = e.pageX;
      startScrollLeft = el!.scrollLeft;
    }
    function handleMouseMove(e: MouseEvent) {
      if (!isDown) return;
      e.preventDefault();
      el!.scrollLeft = startScrollLeft - (e.pageX - startX);
    }
    function stopDrag() {
      isDown = false;
      el!.classList.remove("cursor-grabbing");
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  return ref;
}
