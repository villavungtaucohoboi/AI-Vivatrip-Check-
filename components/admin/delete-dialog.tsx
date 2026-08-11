"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Xóa sản phẩm?"
      description={`Bạn có chắc muốn xóa "${itemName}"? Thao tác này không thể hoàn tác.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Xóa sản phẩm
          </Button>
        </>
      }
    />
  );
}
