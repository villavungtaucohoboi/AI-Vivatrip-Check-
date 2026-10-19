import "server-only";

/**
 * Gọi AI để viết lại chữ (dùng chung cho rút gọn nội dung căn & lịch trình).
 * Thứ tự: Claude (ANTHROPIC_API_KEY) → Gemini (GEMINI_API_KEY, có gói miễn phí).
 * Không có key / lỗi / hết lượt → trả về text = null kèm lý do, để nơi gọi
 * tự dùng bản xử lý miễn phí.
 */
// Model Gemini dùng được (dò 1 lần rồi nhớ trong lúc server còn chạy)
let cachedGeminiModel: string | null = null;

/** Hỏi Google danh sách model đang có, chọn model "Flash" mới nhất hỗ trợ generateContent. */
async function discoverGeminiModel(key: string, skip: Set<string>): Promise<string | null> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /flash/i.test(n) && !/(tts|image|audio|live|embedding|thinking|exp)/i.test(n) && !skip.has(n));
    const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0");
    names.sort((a, b) => {
      // ưu tiên: bản "latest" → phiên bản cao → không phải lite → không phải preview
      const sa = (/latest/.test(a) ? 100 : 0) + ver(a) * 10 - (/lite/.test(a) ? 1 : 0) - (/preview/.test(a) ? 2 : 0);
      const sb = (/latest/.test(b) ? 100 : 0) + ver(b) * 10 - (/lite/.test(b) ? 1 : 0) - (/preview/.test(b) ? 2 : 0);
      return sb - sa;
    });
    return names[0] ?? null;
  } catch {
    return null;
  }
}

export interface AIImage {
  mime: string; // image/jpeg | image/png | image/webp | application/pdf
  data: string; // base64 (không kèm "data:...;base64,")
}

export async function callAI(
  prompt: string,
  raw: string,
  maxTokens = 900,
  opts: { image?: AIImage; images?: AIImage[]; json?: boolean; maxInput?: number } = {}
): Promise<{ text: string | null; error?: string }> {
  const content = raw.trim()
    ? `${prompt}\n\nNỘI DUNG GỐC:\n"""\n${raw.slice(0, opts.maxInput ?? 20000)}\n"""`
    : prompt;
  let error: string | undefined;
  const imgs = [...(opts.images ?? []), ...(opts.image ? [opts.image] : [])].slice(0, 6);

  const claude = process.env.ANTHROPIC_API_KEY;
  if (claude) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": claude, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
          max_tokens: maxTokens,
          messages: [
            {
              role: "user",
              content: imgs.length
                ? [
                    ...imgs.map((im) =>
                      im.mime === "application/pdf"
                        ? { type: "document", source: { type: "base64", media_type: im.mime, data: im.data } }
                        : { type: "image", source: { type: "base64", media_type: im.mime, data: im.data } }
                    ),
                    { type: "text", text: content },
                  ]
                : content,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const out = data.content?.find((c) => c.type === "text")?.text?.trim();
        if (out) return { text: out };
      } else error = `Claude lỗi ${res.status}`;
    } catch {
      error = "Không kết nối được Claude";
    }
  }

  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    // Model Flash mới "suy nghĩ" trước khi trả lời — phần nghĩ ăn hết maxOutputTokens → câu trả lời rỗng/cụt.
    // Tắt suy nghĩ (thinkingBudget 0); model nào không nhận tham số này thì tự gửi lại không có nó.
    let noThinking = true;
    const makeBody = () =>
      JSON.stringify({
        contents: [{ role: "user", parts: [...imgs.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })), { text: content }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.1,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
          ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      });
    try {
      // Thử model đã cài / đã dò được; tên model bị Google đổi (404) → tự dò model Flash đang có rồi thử lại
      const tried = new Set<string>();
      let model = cachedGeminiModel || process.env.GEMINI_MODEL || "gemini-flash-latest";
      for (let attempt = 0; attempt < 4; attempt++) {
        tried.add(model);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gemini)}`,
          { method: "POST", headers: { "content-type": "application/json" }, body: makeBody() }
        );
        if (res.ok) {
          cachedGeminiModel = model;
          const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const out = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("").trim();
          if (out) return { text: out };
          error = "Gemini không trả nội dung (thử lại hoặc cắt ảnh rõ hơn)";
          break;
        }
        const detail = await res.text().catch(() => "");
        if (res.status === 400 && noThinking && /thinking/i.test(detail)) {
          noThinking = false;
          continue;
        }
        if (res.status === 404) {
          const next = await discoverGeminiModel(gemini, tried);
          if (next) {
            model = next;
            continue;
          }
          error = `Không tìm được model Gemini phù hợp (đã thử: ${[...tried].join(", ")})`;
        } else if (res.status === 429) error = "Gemini hết lượt miễn phí — đợi 1 phút hoặc thử lại sau";
        else if (res.status === 403 || /API key not valid|API_KEY_INVALID/i.test(detail)) error = "Key Gemini không hợp lệ — kiểm tra lại GEMINI_API_KEY";
        else if (res.status === 400) error = `Gemini từ chối yêu cầu: ${(detail.match(/"message":\s*"([^"]+)/)?.[1] ?? "dữ liệu không hợp lệ").slice(0, 160)}`;
        else error = `Gemini lỗi ${res.status}`;
        break;
      }
    } catch {
      error = "Không kết nối được Gemini";
    }
  }

  if (!claude && !gemini) error = "Chưa cài GEMINI_API_KEY trên Vercel";
  return { text: null, error };
}

/** Bỏ ``` và dòng dẫn mà AI đôi khi tự thêm. */
export function cleanAIOutput(s: string): string {
  return s
    .replace(/^```[a-z]*\n?|```$/gim, "")
    .replace(/^(đây là|dưới đây là|kết quả)[^\n]*:\s*\n/i, "")
    .trim();
}

/** Lấy object JSON từ câu trả lời của AI (kể cả khi AI bọc trong ```json). */
export function extractJSON<T>(s: string): T | null {
  const cleaned = s.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
