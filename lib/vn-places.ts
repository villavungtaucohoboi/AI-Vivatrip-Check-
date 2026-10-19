/**
 * ĐỊA DANH DU LỊCH VIỆT NAM: tỉnh → khu vực → điểm nhỏ.
 * Dùng cho ô tìm resort/khách sạn: gõ "khách sạn Quảng Ninh" → ra Hạ Long, Bãi Cháy,
 * Tuần Châu, Vân Đồn…; gõ "Tuần Châu" → chỉ khách sạn ở Tuần Châu (không có thì ra Hạ Long).
 * Khớp theo NGUYÊN CỤM TỪ (không khớp lẻ chữ "sơn", "long"…) trên: khu vực + địa chỉ + tên khách sạn.
 * Thêm địa danh: thêm vào mảng `kids` của tỉnh / khu vực tương ứng.
 */

export interface Place {
  name: string;
  /** cách gọi khác (không dấu cũng được) */
  alias?: string[];
  kids?: Place[];
}

const P = (name: string, kids: (Place | string)[] = [], alias: string[] = []): Place => ({
  name,
  alias,
  kids: kids.map((k) => (typeof k === "string" ? { name: k } : k)),
});

export const VN_PLACES: Place[] = [
  // ---- Miền Bắc
  P("Quảng Ninh", [
    P("Hạ Long", ["Bãi Cháy", "Tuần Châu", "Hòn Gai", "Hùng Thắng", "Hồng Gai"], ["Halong", "Vịnh Hạ Long"]),
    P("Quang Hanh", [], ["Cẩm Phả"]),
    P("Vân Đồn", ["Quan Lạn", "Minh Châu", "Ngọc Vừng", "Cái Bầu"]),
    P("Cô Tô"),
    P("Móng Cái", ["Trà Cổ"]),
    P("Yên Tử", ["Uông Bí"]),
    P("Đông Triều"),
  ]),
  P("Hải Phòng", [P("Cát Bà", ["Lan Hạ"]), "Đồ Sơn"]),
  P("Hà Nội", ["Sóc Sơn", "Ba Vì", "Sơn Tây", "Thạch Thất", "Hòa Lạc", "Đồng Mô", "Tây Hồ", "Hoàn Kiếm", "Long Biên", "Cầu Giấy", "Ba Đình"], ["Ha Noi", "HN"]),
  P("Vĩnh Phúc", ["Tam Đảo", "Đại Lải", "Flamingo Đại Lải"]),
  P("Hòa Bình", ["Lương Sơn", "Mai Châu", "Kim Bôi", "Đồng Đò"], ["Hoà Bình"]),
  P("Ninh Bình", ["Tràng An", "Tam Cốc", "Bái Đính", "Hoa Lư", "Gia Viễn", "Cúc Phương", "Vân Long", "Kênh Gà"]),
  P("Lào Cai", [P("Sapa", ["Fansipan", "Tả Van", "Cát Cát"], ["Sa Pa"]), "Bắc Hà", "Y Tý"]),
  P("Yên Bái", ["Mù Cang Chải", "Tú Lệ", "Nghĩa Lộ"]),
  P("Hà Giang", ["Đồng Văn", "Mèo Vạc", "Lũng Cú", "Hoàng Su Phì"]),
  P("Sơn La", ["Mộc Châu"]),
  P("Điện Biên"),
  P("Tuyên Quang", ["Tân Trào", "Na Hang"]),
  P("Cao Bằng", ["Bản Giốc"]),
  P("Lạng Sơn", ["Mẫu Sơn"]),
  P("Bắc Ninh"),
  P("Bắc Giang"),
  P("Phú Thọ"),
  P("Thái Nguyên"),
  P("Hà Nam", ["Tam Chúc"]),
  P("Nam Định", ["Thịnh Long", "Quất Lâm"]),
  P("Thái Bình"),
  // ---- Bắc Trung Bộ
  P("Thanh Hóa", ["Sầm Sơn", "Hải Tiến", "Hải Hòa", "Pù Luông", "Bến En"], ["Thanh Hoá"]),
  P("Nghệ An", ["Cửa Lò", "TP Vinh", "Quỳnh Lưu", "Bãi Lữ"]),
  P("Hà Tĩnh", ["Thiên Cầm", "Xuân Thành"]),
  P("Quảng Bình", ["Đồng Hới", "Phong Nha", "Nhật Lệ", "Bảo Ninh"]),
  P("Quảng Trị", ["Cửa Tùng", "Cửa Việt"]),
  P("Huế", ["Lăng Cô", "Thuận An", "Chân Mây"], ["Thừa Thiên Huế", "TT Huế"]),
  // ---- Nam Trung Bộ
  P("Đà Nẵng", ["Sơn Trà", "Non Nước", "Bà Nà", "Mỹ Khê", "Ngũ Hành Sơn"], ["Da Nang"]),
  P("Quảng Nam", [P("Hội An", ["Cửa Đại", "An Bàng", "Cù Lao Chàm"]), "Tam Kỳ"]),
  P("Quảng Ngãi", ["Lý Sơn"]),
  P("Bình Định", [P("Quy Nhơn", ["Nhơn Lý", "Kỳ Co", "Eo Gió", "Ghềnh Ráng"], ["Qui Nhơn"])]),
  P("Phú Yên", ["Tuy Hòa", "Gành Đá Đĩa", "Vũng Rô"]),
  P("Khánh Hòa", [P("Nha Trang", ["Hòn Tằm", "Ninh Vân", "Dốc Lết", "Hòn Tre", "Vinpearl Nha Trang"]), P("Cam Ranh", ["Bãi Dài Cam Ranh", "Bình Ba"])], ["Khánh Hoà"]),
  P("Ninh Thuận", ["Phan Rang", "Ninh Chữ", "Vĩnh Hy"]),
  P("Bình Thuận", [P("Phan Thiết", ["Tiến Thành", "Hòn Rơm"]), P("Mũi Né", ["Hòn Rơm"]), "Kê Gà", "La Gi", "Cam Bình", "Tuy Phong"]),
  // ---- Tây Nguyên
  P("Lâm Đồng", [P("Đà Lạt", ["Tuyền Lâm"], ["Da Lat"]), "Bảo Lộc"]),
  P("Đắk Lắk", ["Buôn Ma Thuột", "Buôn Đôn"], ["Dak Lak"]),
  P("Gia Lai", ["Pleiku"]),
  P("Kon Tum", ["Măng Đen"]),
  // ---- Miền Nam
  P("TP.HCM", ["Cần Giờ", "Quận 1", "Thủ Đức"], ["Hồ Chí Minh", "HCM", "Sài Gòn", "TPHCM", "Sài Gòn"]),
  P("Bà Rịa - Vũng Tàu", [P("Vũng Tàu", ["Bãi Sau", "Bãi Trước", "Long Cung"]), "Hồ Tràm", "Hồ Cốc", "Bình Châu", "Long Hải", "Phước Hải", P("Côn Đảo")], ["Bà Rịa Vũng Tàu", "BRVT"]),
  P("Kiên Giang", [P("Phú Quốc", ["Dương Đông", "An Thới", "Bãi Trường", "Bãi Kem", "Bãi Khem", "Hòn Thơm", "Gành Dầu", "Bãi Dài Phú Quốc", "Bãi Sao", "Cửa Cạn", "Grand World"], ["Phu Quoc"]), "Hà Tiên", "Nam Du", "Rạch Giá"]),
  P("Cần Thơ"),
  P("Bình Dương"),
  P("Đồng Nai"),
  P("Tây Ninh", ["Núi Bà Đen"]),
  P("Bến Tre"),
  P("Tiền Giang"),
  P("An Giang", ["Châu Đốc"]),
  P("Cà Mau"),
];

export const placeNorm = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[,;()/|.]+/g, " | ") // dấu phẩy… tách đoạn → cụm từ không khớp vắt qua 2 đoạn ("Ninh Hải, Hoa Lư")
    .replace(/[^a-z0-9|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Chữ có chứa NGUYÊN CỤM `term` (không dính chữ khác) — text & term đã placeNorm. */
export const hasPhrase = (text: string, term: string) => !!term && ` ${text} `.includes(` ${term} `);

interface Flat {
  name: string;
  keys: string[]; // cách gõ của chính địa danh
  terms: string[]; // chính nó + mọi địa danh con
  parent: Flat | null;
}
const FLAT: Flat[] = [];
(function build(list: Place[], parent: Flat | null) {
  for (const p of list) {
    const f: Flat = { name: p.name, keys: [...new Set([p.name, ...(p.alias ?? [])].map(placeNorm))].filter(Boolean), terms: [], parent };
    FLAT.push(f);
    build(p.kids ?? [], f);
  }
})(VN_PLACES, null);
for (const f of FLAT) {
  // terms = keys của chính nó + của mọi con cháu
  const all = new Set(f.keys);
  for (const g of FLAT) {
    let a = g.parent;
    while (a) {
      if (a === f) g.keys.forEach((k) => all.add(k));
      a = a.parent;
    }
  }
  f.terms = [...all];
}
// Cụm dài khớp trước ("bai dai phu quoc" trước "phu quoc")
const BY_KEY = FLAT.flatMap((f) => f.keys.map((k) => ({ k, f }))).sort((a, b) => b.k.length - a.k.length);

const BY_EXACT = new Map<string, Flat>();
for (const f of FLAT) for (const k of f.keys) if (!BY_EXACT.has(k)) BY_EXACT.set(k, f);

/** Hàm kiểm tra 1 khách sạn (khu vực + phần chữ còn lại: địa chỉ, tên…) có thuộc các địa danh này không. */
export type PlaceTest = (area: string, other: string) => boolean;
function makeTest(nodes: Flat[]): PlaceTest {
  const terms = [...new Set(nodes.flatMap((f) => f.terms))];
  return (area, other) => {
    const an = BY_EXACT.get(placeNorm(area ?? ""));
    if (an) {
      // khu vực của khách sạn nằm trong địa danh cần tìm (VD tìm Quảng Ninh, KS ở Hạ Long)
      if (nodes.some((n) => n === an || isAncestor(n, an))) return true;
      // khu vực khác hẳn (VD KS Vũng Tàu ở đường "Hạ Long") → loại, không xét địa chỉ
      if (!nodes.some((n) => isAncestor(an, n))) return false;
      // khu vực rộng hơn (KS ghi Hạ Long, tìm Tuần Châu) → xem địa chỉ / tên
    }
    const t = placeNorm(`${area ?? ""} | ${other}`);
    return terms.some((x) => hasPhrase(t, x));
  };
}

export interface PlaceMatch {
  /** Tên hiển thị, VD "Quảng Ninh" */
  label: string;
  test: PlaceTest;
  /** Địa danh rộng hơn (khu vực / tỉnh cha) để dùng khi không có kết quả */
  wider: { label: string; test: PlaceTest } | null;
  /** Câu tìm kiếm sau khi bỏ địa danh (để tìm theo tên) */
  rest: string;
  /** Các chữ thuộc địa danh đã nhận ra (bỏ khỏi phần tìm theo tên) */
  words: string[];
}

/** Tìm địa danh trong câu tìm kiếm. Không có → null. */
export function matchPlaces(query: string): PlaceMatch | null {
  let text = ` ${placeNorm(query)} `;
  const hit: Flat[] = [];
  const words = new Set<string>();
  for (const { k, f } of BY_KEY) {
    if (k.length < 2 || !text.includes(` ${k} `)) continue;
    k.split(" ").forEach((w) => words.add(w));
    if (!hit.includes(f)) hit.push(f);
    text = text.replace(` ${k} `, " ");
  }
  if (!hit.length) return null;
  // bỏ địa danh con nếu đã có cha (VD "Tuần Châu Hạ Long" → giữ Tuần Châu cho chính xác)
  const narrow = hit.filter((f) => !hit.some((g) => g !== f && isAncestor(f, g)));
  const parents = [...new Set(narrow.map((f) => f.parent).filter((x): x is Flat => !!x))];
  return {
    label: narrow.map((f) => f.name).join(", "),
    test: makeTest(narrow),
    wider: parents.length ? { label: parents.map((p) => p.name).join(", "), test: makeTest(parents) } : null,
    rest: text.replace(/\s+/g, " ").trim(),
    words: [...words],
  };
}
function isAncestor(a: Flat, b: Flat) {
  let x = b.parent;
  while (x) {
    if (x === a) return true;
    x = x.parent;
  }
  return false;
}
