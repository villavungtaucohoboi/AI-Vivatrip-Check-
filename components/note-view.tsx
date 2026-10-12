import { isNoteHeading } from "@/lib/villa-text";

/** Hiển thị nội dung căn theo khung: tiêu đề mục in đậm màu, mỗi ý 1 dòng có sticker. */
export function NoteView({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        return (
          <div key={bi} className="space-y-1">
            {lines.map((line, li) =>
              isNoteHeading(line) ? (
                <p key={li} className="text-[13px] font-extrabold tracking-wide text-teal-dark">
                  {line.trim()}
                </p>
              ) : (
                <p key={li} className="text-[14px] leading-relaxed text-ink">
                  {line.trim()}
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
