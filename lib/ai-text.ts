import "server-only";

/**
 * Gọi AI để viết lại chữ (dùng chung cho rút gọn nội dung căn & lịch trình).
 * Thứ tự: Claude (ANTHROPIC_API_KEY) → Gemini (GEMINI_API_KEY, có gói miễn phí).
 * Không có key / lỗi / hết lượt → trả về text = null kèm lý do, để nơi gọi
 * tự dùng bản xử lý miễn phí.
 */
export interface AIImage {
  mime: string; // image/jpeg | image/png | image/webp
  data: string; // base64 (không kèm "data:...;base64,")
}

export async function callAI(
  prompt: string,
  raw: string,
  maxTokens = 900,
  opts: { image?: AIImage; json?: boolean } = {}
): Promise<{ text: string | null; error?: string }> {
  const content = raw.trim()
    ? `${prompt}\n\nNỘI DUNG GỐC:\n"""\n${raw.slice(0, 20000)}\n"""`
    : prompt;
  let error: string | undefined;

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
              content: opts.image
                ? [
                    { type: "image", source: { type: "base64", media_type: opts.image.mime, data: opts.image.data } },
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
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gemini)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: opts.image
                  ? [{ inline_data: { mime_type: opts.image.mime, data: opts.image.data } }, { text: content }]
                  : [{ text: content }],
              },
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.1,
              ...(opts.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const out = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("").trim();
        if (out) return { text: out };
        error = "Gemini không trả nội dung";
      } else if (res.status === 429) error = "Gemini hết lượt miễn phí (thử lại sau)";
      else if (res.status === 404) error = `Gemini không có model "${model}" — đổi biến GEMINI_MODEL`;
      else if (res.status === 400 || res.status === 403) error = "Key Gemini không hợp lệ";
      else error = `Gemini lỗi ${res.status}`;
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
