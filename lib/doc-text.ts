import "server-only";
import JSZip from "jszip";

// ĐỌC FILE LỊCH TRÌNH TOUR từ link Google Drive / Docs, hoặc file Word up lên.
// Không cần thư viện mới: .docx là file zip → đọc word/document.xml.

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

/** .docx → chữ (giữ xuống dòng, bảng thành "ô | ô"). */
export async function docxToText(buf: ArrayBuffer | Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("File Word không đọc được.");
  const text = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    // ô bảng: các đoạn trong 1 ô nối bằng dấu cách, ô cách nhau " | ", mỗi hàng 1 dòng
    .replace(/<w:tc[ >][\s\S]*?<\/w:tc>/g, (tc) => tc.replace(/<\/w:p>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() + " | ")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decode(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type Fetched = { kind: "text"; text: string } | { kind: "pdf"; data: string };

/** Lấy ID file từ link Google Docs / Drive. */
export function googleId(link: string): { id: string; doc: boolean } | null {
  const m = link.match(/docs\.google\.com\/document\/d\/([\w-]{20,})/);
  if (m) return { id: m[1], doc: true };
  const f = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{20,})/);
  if (f) return { id: f[1], doc: false };
  return null;
}

const NOT_PUBLIC = "Link chưa mở quyền xem — trên Drive bấm Chia sẻ → “Bất kỳ ai có đường liên kết” → Người xem, rồi thử lại. Hoặc tải file về rồi up lên.";

async function asContent(res: Response): Promise<Fetched> {
  const type = res.headers.get("content-type") ?? "";
  const buf = await res.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 5));
  const isZip = head[0] === 0x50 && head[1] === 0x4b;
  const isPdf = String.fromCharCode(...head) === "%PDF-";
  if (isPdf || type.includes("pdf")) return { kind: "pdf", data: Buffer.from(buf).toString("base64") };
  if (isZip) return { kind: "text", text: await docxToText(buf) };
  const text = new TextDecoder().decode(buf);
  if (/<html|accounts\.google\.com|ServiceLogin/i.test(text.slice(0, 3000))) throw new Error(NOT_PUBLIC);
  return { kind: "text", text: text.trim() };
}

/** Tải nội dung từ link (Google Docs native, file Word/PDF trên Drive, hoặc link tải trực tiếp). */
export async function fetchLinkContent(link: string): Promise<Fetched> {
  const g = googleId(link);
  const tries: string[] = [];
  if (g?.doc) tries.push(`https://docs.google.com/document/d/${g.id}/export?format=txt`);
  if (g) tries.push(`https://drive.google.com/uc?export=download&id=${g.id}`);
  if (!g) tries.push(link);
  let lastErr: unknown = null;
  for (const url of tries) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 VivaTrip" } });
      if (!res.ok) {
        lastErr = new Error(res.status === 401 || res.status === 403 || res.status === 404 ? NOT_PUBLIC : `Không tải được link (lỗi ${res.status}).`);
        continue;
      }
      const c = await asContent(res);
      if (c.kind === "text" && c.text.length < 50) {
        lastErr = new Error("File gần như trống — kiểm tra lại link.");
        continue;
      }
      return c;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Không tải được link.");
}
