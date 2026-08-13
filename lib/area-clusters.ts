function normalizeAreaKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Mỗi mảng con là 1 "vùng miền" — các khu vực trong cùng 1 mảng được coi là
 * gần nhau, khách tìm khu vực này có thể chấp nhận xem cả khu vực kia.
 * Khu vực nào KHÔNG có trong danh sách này thì không bị giới hạn gì thêm
 * (coi như đứng riêng 1 mình) — an toàn khi Admin thêm khu vực mới lạ.
 *
 * Đây là danh sách tự biên soạn dựa trên vị trí địa lý thực tế — Admin có
 * thể nhờ chỉnh sửa nếu cần thêm/bớt khu vực nào.
 */
const AREA_CLUSTERS: string[][] = [
  // Quanh Hà Nội / miền Bắc gần thủ đô
  [
    "Hà Nội", "Sóc Sơn", "Ba Vì", "Hòa Bình", "Thạch Thất", "Sơn Tây",
    "Tam Đảo", "Đại Lải", "Mộc Châu", "Ninh Bình", "Hòa Lạc", "Đồng Đò", "Lương Sơn",
  ],
  // Hạ Long / Quảng Ninh
  ["Hạ Long", "Quảng Ninh", "Cát Bà", "Hải Phòng"],
  // Miền Nam biển
  ["Vũng Tàu", "Phú Quốc", "Côn Đảo", "Cần Thơ", "Long Hải"],
  // Nam Trung Bộ
  ["Phan Thiết", "Mũi Né", "Nha Trang", "Đà Nẵng", "Hội An", "Quy Nhơn", "Cam Ranh"],
  // Tây Nguyên
  ["Đà Lạt", "Bảo Lộc"],
];

// Cụm phủ 1 vùng lớn (không phải tên khu vực cụ thể nào) — cho câu kiểu
// "villa quanh Hà Nội" khớp thẳng ra cả cụm, không cần trùng đúng 1 khu vực.
const REGION_PHRASE_TO_CLUSTER: { phrase: string; clusterIndex: number }[] = [
  { phrase: "quanh ha noi", clusterIndex: 0 },
  { phrase: "gan ha noi", clusterIndex: 0 },
  { phrase: "ha noi", clusterIndex: 0 },
  { phrase: "ha long", clusterIndex: 1 },
  { phrase: "quang ninh", clusterIndex: 1 },
  { phrase: "vung tau", clusterIndex: 2 },
  { phrase: "phan thiet", clusterIndex: 3 },
  { phrase: "mui ne", clusterIndex: 3 },
  { phrase: "nha trang", clusterIndex: 3 },
  { phrase: "da nang", clusterIndex: 3 },
  { phrase: "da lat", clusterIndex: 4 },
];

/** Trả về toàn bộ khu vực cùng "vùng miền" với 1 khu vực cụ thể (bao gồm chính nó). */
export function getClusterAreas(area: string): string[] {
  const key = normalizeAreaKey(area);
  const cluster = AREA_CLUSTERS.find((c) => c.some((a) => normalizeAreaKey(a) === key));
  return cluster ?? [area];
}

/**
 * Nhận diện câu tìm kiếm có nhắc tới 1 "vùng lớn" (VD "quanh Hà Nội") hay
 * không, trả về toàn bộ khu vực trong vùng đó — dùng khi câu tìm kiếm không
 * khớp đúng tên bất kỳ khu vực cụ thể nào trong DB.
 */
export function findClusterByPhrase(normalizedQuery: string): string[] | null {
  for (const { phrase, clusterIndex } of REGION_PHRASE_TO_CLUSTER) {
    if (normalizedQuery.includes(phrase)) return AREA_CLUSTERS[clusterIndex];
  }
  return null;
}
