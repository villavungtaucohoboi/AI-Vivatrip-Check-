// Hàng đợi tự lưu: không bao giờ gửi 2 lần lưu chồng nhau; luôn lưu bản MỚI NHẤT.
// flush() trả true khi mọi thay đổi đã lưu, false nếu lần lưu gần nhất lỗi.

export function createSaveQueue<T>(save: (value: T) => Promise<void>) {
  let latest: T | undefined;
  let lastSaved: T | undefined;
  let inflight: Promise<boolean> | null = null;

  async function loop(): Promise<boolean> {
    while (latest !== undefined && latest !== lastSaved) {
      const body = latest;
      try {
        await save(body);
        lastSaved = body;
      } catch {
        return false;
      }
    }
    return true;
  }

  return {
    set(value: T) {
      latest = value;
    },
    isClean() {
      return latest === undefined || latest === lastSaved;
    },
    flush(): Promise<boolean> {
      if (!inflight) inflight = loop().finally(() => (inflight = null));
      return inflight;
    },
  };
}
