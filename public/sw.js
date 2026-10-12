const CACHE_NAME = "vivatrip-shell-v2";
const SHELL_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Chỉ lưu vào máy các file tĩnh của web (JS/CSS/font/icon) — những file
// này có tên kèm mã phiên bản nên không bao giờ bị cũ. KHÔNG lưu ảnh, API,
// trang HTML như trước (trước đây lưu mọi thứ, không giới hạn → bộ nhớ điện
// thoại nhân viên phình dần mà không làm web nhanh hơn).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (!isStatic) return; // để trình duyệt tự xử lý như bình thường

  // Cache-first cho file tĩnh: mở web lần sau gần như tức thì.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
