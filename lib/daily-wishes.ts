export type CustomerType =
  | "chung"
  | "than_thiet"
  | "doanh_nghiep"
  | "gia_dinh"
  | "tre"
  | "anh_chi";

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  chung: "Khách hàng chung",
  than_thiet: "Khách thân thiết",
  doanh_nghiep: "Khách doanh nghiệp",
  gia_dinh: "Gia đình",
  tre: "Khách trẻ",
  anh_chi: "Anh / Chị",
};

export interface Wish {
  id: string;
  text: string;
}

// 40 câu mẫu theo đúng đề bài — dùng cho "Khách hàng chung" và "Anh / Chị"
// (2 nhóm này dùng chung 1 văn phong lịch sự/thân thiện/chuyên nghiệp).
const CHUNG_TEXTS = [
  "VivaTrip chúc anh/chị một ngày mới thật nhiều năng lượng, công việc thuận lợi và luôn có những khoảnh khắc vui vẻ bên gia đình. Chúc hôm nay sẽ mang đến thật nhiều điều tích cực và đáng nhớ.",
  "Ngày mới bắt đầu rồi. VivaTrip chúc anh/chị luôn giữ được tinh thần thật tốt, mọi công việc đều suôn sẻ và có thêm nhiều niềm vui nhỏ trong ngày.",
  "VivaTrip chúc anh/chị một buổi sáng thật nhẹ nhàng, một ngày làm việc hiệu quả và mọi kế hoạch đều diễn ra thuận lợi như mong đợi.",
  "Chúc anh/chị hôm nay có thật nhiều năng lượng tích cực, gặp nhiều điều vui và hoàn thành mọi công việc thật thuận lợi. VivaTrip gửi đến anh/chị lời chúc một ngày thật đẹp.",
  "VivaTrip chúc anh/chị ngày mới nhiều sức khỏe, tinh thần thoải mái và mọi việc đều hanh thông. Mong hôm nay sẽ là một ngày thật đáng nhớ.",
  "Một ngày mới lại bắt đầu. VivaTrip chúc anh/chị luôn vui vẻ, nhiều năng lượng và gặp thật nhiều điều tích cực trong công việc cũng như cuộc sống.",
  "VivaTrip gửi lời chúc ngày mới đến anh/chị. Chúc anh/chị có một ngày làm việc nhẹ nhàng, hiệu quả và luôn giữ được thật nhiều niềm vui.",
  "Chúc anh/chị một ngày mới thật tươi vui, công việc thuận lợi và luôn có những khoảnh khắc ý nghĩa bên những người mình yêu quý. VivaTrip chúc anh/chị một ngày thật nhiều năng lượng.",
  "VivaTrip chúc anh/chị khởi đầu ngày mới với thật nhiều năng lượng, kết thúc ngày với nhiều niềm vui và mọi việc trong ngày đều diễn ra thật thuận lợi.",
  "Chúc anh/chị hôm nay gặp nhiều điều tốt đẹp, công việc trôi chảy và luôn giữ được tinh thần thật thoải mái. VivaTrip gửi đến anh/chị lời chúc một ngày bình an và nhiều niềm vui.",
  "VivaTrip kính chúc anh/chị một ngày làm việc hiệu quả, nhiều năng lượng và mọi kế hoạch đều diễn ra thuận lợi. Chúc anh/chị luôn có một ngày thật nhiều thành công.",
  "Chúc anh/chị một buổi sáng thật nhiều năng lượng và một ngày làm việc thật suôn sẻ. VivaTrip mong rằng hôm nay sẽ mang đến nhiều niềm vui và những điều tích cực.",
  "VivaTrip chúc anh/chị ngày mới an lành, công việc thuận lợi và luôn có thời gian dành cho những điều khiến mình vui vẻ.",
  "Chúc anh/chị ngày mới thật nhiều sức khỏe, tinh thần thoải mái và mọi dự định đều tiến triển tốt đẹp. VivaTrip chúc anh/chị một ngày thật trọn vẹn.",
  "VivaTrip gửi lời chúc buổi sáng đến anh/chị. Mong hôm nay mọi công việc đều diễn ra thật thuận lợi và anh/chị luôn có thật nhiều năng lượng tích cực.",
  "Một lời chúc nhỏ từ VivaTrip cho ngày mới: chúc anh/chị luôn vui vẻ, khỏe mạnh và có một ngày thật nhiều điều đáng nhớ.",
  "Chúc anh/chị bắt đầu ngày mới với một tinh thần thật tốt, gặp nhiều may mắn và có thêm thật nhiều niềm vui trong ngày. VivaTrip chúc anh/chị một ngày thật đẹp.",
  "VivaTrip chúc anh/chị hôm nay mọi việc đều nhẹ nhàng hơn một chút, niềm vui nhiều hơn một chút và ngày mới luôn đầy những điều tích cực.",
  "Chúc anh/chị một ngày mới bình an, nhiều năng lượng và thật nhiều khoảnh khắc vui vẻ. VivaTrip luôn mong những điều tốt đẹp sẽ đồng hành cùng anh/chị.",
  "VivaTrip chúc anh/chị một ngày thật nhiều niềm vui, công việc thuận lợi và luôn giữ được tinh thần tích cực từ sáng đến tối.",
  "Ngày mới, năng lượng mới. VivaTrip chúc anh/chị có một ngày thật vui, công việc trôi chảy và mọi điều đều thuận lợi hơn mong đợi.",
  "VivaTrip chúc anh/chị buổi sáng thật dễ chịu, ngày làm việc thật hiệu quả và buổi tối thật nhiều niềm vui bên gia đình.",
  "Chúc anh/chị hôm nay luôn giữ nụ cười, nhiều năng lượng và gặp thật nhiều điều tích cực. VivaTrip chúc anh/chị một ngày thật trọn vẹn.",
  "VivaTrip gửi đến anh/chị một lời chúc nhẹ nhàng cho ngày mới: nhiều sức khỏe, nhiều niềm vui và mọi công việc đều thật thuận lợi.",
  "Chúc anh/chị ngày mới thật nhiều cảm hứng, công việc hiệu quả và luôn có những phút giây thư giãn thật dễ chịu. VivaTrip chúc anh/chị một ngày tuyệt vời.",
  "VivaTrip chúc anh/chị một ngày mới thật bình an, tinh thần thoải mái và mọi kế hoạch đều diễn ra đúng như mong muốn.",
  "Chúc anh/chị hôm nay làm việc thật hiệu quả nhưng vẫn có thật nhiều thời gian cho những điều mình yêu thích. VivaTrip chúc anh/chị một ngày thật vui.",
  "VivaTrip chúc anh/chị một ngày mới nhiều may mắn, công việc thuận lợi và luôn có những điều tích cực bất ngờ xuất hiện trong ngày.",
  "Một ngày mới là thêm một cơ hội để có thật nhiều niềm vui. VivaTrip chúc anh/chị hôm nay luôn nhiều năng lượng và mọi việc đều thật thuận lợi.",
  "VivaTrip chúc anh/chị bắt đầu ngày mới thật nhẹ nhàng, làm việc thật hiệu quả và kết thúc ngày với thật nhiều niềm vui.",
  "Chúc anh/chị một ngày mới thật tươi sáng, nhiều sức khỏe và có thêm nhiều khoảnh khắc đáng nhớ. VivaTrip gửi đến anh/chị những lời chúc tốt đẹp nhất.",
  "VivaTrip chúc anh/chị hôm nay gặp nhiều thuận lợi, tinh thần thật thoải mái và luôn có những điều vui vẻ bên cạnh.",
  "Ngày mới thật nhiều năng lượng nhé anh/chị. VivaTrip chúc mọi công việc hôm nay đều trôi chảy và mang đến thật nhiều niềm vui.",
  "VivaTrip chúc anh/chị một ngày làm việc thật hiệu quả, mọi kế hoạch thuận lợi và luôn giữ được tâm trạng thật vui vẻ.",
  "Chúc anh/chị hôm nay có thật nhiều điều đáng vui, những công việc cần làm đều diễn ra thuận lợi và ngày mới luôn tràn đầy năng lượng tích cực. VivaTrip gửi lời chúc tốt đẹp đến anh/chị.",
  "VivaTrip chúc anh/chị ngày mới thật bình yên, nhiều niềm vui và có một ngày làm việc thật hiệu quả.",
  "Một lời chào ngày mới từ VivaTrip. Chúc anh/chị hôm nay thật nhiều năng lượng, nhiều niềm vui và mọi việc đều diễn ra thật suôn sẻ.",
  "Chúc anh/chị một ngày mới thật nhẹ nhàng, công việc hanh thông và luôn có thật nhiều điều tích cực quanh mình. VivaTrip chúc anh/chị một ngày thật vui.",
  "VivaTrip chúc anh/chị một ngày mới nhiều sức khỏe, nhiều may mắn và mọi dự định đều tiến triển thật tốt đẹp.",
  "Chúc anh/chị bắt đầu ngày mới bằng niềm vui, trải qua một ngày thật thuận lợi và kết thúc ngày với những khoảnh khắc thật đáng nhớ. VivaTrip gửi đến anh/chị lời chúc tốt đẹp nhất.",
];

const THAN_THIET_TEXTS = [
  "VivaTrip chúc anh/chị một ngày mới thật vui, nhớ dành chút thời gian cho bản thân giữa bao bận rộn nhé. Chúc mọi việc đều suôn sẻ và nhẹ nhàng.",
  "Chào ngày mới! VivaTrip mong anh/chị hôm nay luôn vui vẻ, gặp nhiều điều may mắn và có thêm thật nhiều năng lượng cho một ngày dài.",
  "Hôm nay trời đẹp, VivaTrip chúc anh/chị cũng có một ngày thật đẹp — công việc thuận lợi, tinh thần thoải mái nhé.",
  "VivaTrip gửi lời chúc thân thương đến anh/chị: chúc một ngày mới nhẹ nhàng, nhiều niềm vui và luôn giữ được nụ cười trên môi.",
  "Chúc anh/chị ngày mới thật ấm áp, công việc trôi chảy và có thêm nhiều khoảnh khắc vui vẻ bên những người thân quen. VivaTrip luôn nhớ đến anh/chị.",
  "VivaTrip chúc anh/chị hôm nay bớt bận rộn hơn một chút, vui vẻ hơn một chút và mọi thứ đều diễn ra như ý.",
  "Một ngày mới, VivaTrip chúc anh/chị luôn khỏe mạnh, tinh thần phơi phới và có thật nhiều lý do để mỉm cười.",
  "Chúc anh/chị buổi sáng thật dễ chịu nhé, mong hôm nay công việc nhẹ nhàng và có thêm thời gian nghỉ ngơi. VivaTrip luôn đồng hành cùng anh/chị.",
  "VivaTrip chúc anh/chị ngày mới tràn đầy năng lượng, gặp nhiều điều vui và mọi kế hoạch đều thuận buồm xuôi gió.",
  "Chúc anh/chị một ngày thật trọn vẹn — công việc suôn sẻ, tâm trạng thoải mái. VivaTrip luôn mong những điều tốt đẹp đến với anh/chị.",
];

const DOANH_NGHIEP_TEXTS = [
  "VivaTrip kính chúc anh/chị một ngày làm việc hiệu quả, nhiều năng lượng và mọi kế hoạch đều diễn ra thuận lợi. Chúc anh/chị luôn giữ được tinh thần tích cực và có một ngày thật nhiều thành công.",
  "Kính chúc anh/chị một ngày mới nhiều thuận lợi, công việc hanh thông và mọi mục tiêu đều sớm đạt được. Trân trọng, VivaTrip.",
  "VivaTrip kính chúc anh/chị một tuần làm việc hiệu quả, các kế hoạch đều tiến triển tốt đẹp và luôn giữ vững phong độ.",
  "Kính chúc anh/chị ngày mới an khang, công việc hanh thông và mọi quyết định đều sáng suốt, thuận lợi. VivaTrip trân trọng kính chúc.",
  "VivaTrip kính chúc anh/chị một ngày làm việc năng suất, tinh thần vững vàng và mọi hợp tác đều diễn ra suôn sẻ.",
  "Kính chúc anh/chị sức khỏe dồi dào, công việc thuận buồm xuôi gió và luôn đạt được những mục tiêu đề ra. Trân trọng từ VivaTrip.",
  "VivaTrip kính chúc anh/chị một ngày mới hiệu quả, nhiều cơ hội tốt đẹp và mọi kế hoạch đều được thực hiện đúng tiến độ.",
  "Kính chúc anh/chị một ngày làm việc thuận lợi, các cuộc gặp gỡ và quyết định quan trọng đều diễn ra tốt đẹp. VivaTrip trân trọng kính chúc.",
];

const GIA_DINH_TEXTS = [
  "VivaTrip chúc anh/chị và gia đình một ngày mới thật ấm áp, nhiều sức khỏe và luôn quây quần bên nhau trong những khoảnh khắc vui vẻ.",
  "Chúc anh/chị cùng gia đình luôn mạnh khỏe, ngày mới an lành và có thêm thật nhiều tiếng cười bên nhau. VivaTrip gửi lời chúc ấm áp đến cả nhà.",
  "VivaTrip chúc gia đình mình một ngày mới bình an, mọi người luôn khỏe mạnh và dành cho nhau thật nhiều yêu thương.",
  "Chúc anh/chị một ngày thật vui bên gia đình, công việc nhẹ nhàng để có thêm thời gian cho những người thân yêu. VivaTrip luôn chúc những điều tốt đẹp nhất.",
  "VivaTrip chúc cả nhà mình luôn vui khỏe, ngày mới nhiều niềm vui và những bữa cơm sum vầy ấm áp bên nhau.",
  "Chúc anh/chị và gia đình một ngày mới tràn đầy năng lượng, sức khỏe dồi dào và luôn bên nhau trong mọi khoảnh khắc đáng nhớ.",
  "VivaTrip chúc gia đình anh/chị luôn hạnh phúc, bình an và có thật nhiều thời gian quý giá dành cho nhau mỗi ngày.",
  "Chúc anh/chị một ngày mới nhẹ nhàng, về nhà sớm để cùng gia đình có một buổi tối thật ấm cúng. VivaTrip luôn đồng hành cùng gia đình mình.",
];

const TRE_TEXTS = [
  "Chào ngày mới nhé! VivaTrip chúc bạn một ngày thật chill, làm gì cũng suôn sẻ và tràn đầy năng lượng tích cực 🌤️",
  "Ngày mới rồi, chúc bạn hôm nay vui hết cỡ, việc gì cũng thuận lợi và luôn giữ vibe tốt cả ngày nha. VivaTrip chúc bạn xịn xò!",
  "VivaTrip chúc bạn một ngày mới đầy năng lượng, gặp toàn điều hay ho và tâm trạng lúc nào cũng cực kỳ ổn áp.",
  "Hôm nay chắc chắn sẽ là một ngày tuyệt vời — VivaTrip chúc bạn nhiều may mắn, nhiều niềm vui và cứ tự tin tỏa sáng nhé.",
  "Chúc bạn ngày mới thật nhẹ nhàng, việc gì cũng trôi chảy và có thêm thật nhiều khoảnh khắc đáng nhớ. VivaTrip luôn ủng hộ bạn.",
  "VivaTrip gửi năng lượng tích cực cho bạn ngày hôm nay: vui vẻ, tự tin và làm gì cũng đạt kết quả tốt nha!",
  "Ngày mới, mood mới! Chúc bạn hôm nay thật vui, gặp nhiều điều thú vị và luôn tràn đầy nhiệt huyết. VivaTrip chúc bạn một ngày cực chất.",
  "VivaTrip chúc bạn một ngày mới bùng nổ năng lượng, mọi kế hoạch đều suôn sẻ và luôn giữ được sự lạc quan.",
];

const WISH_BANK: Record<CustomerType, Wish[]> = {
  chung: CHUNG_TEXTS.map((text, i) => ({ id: `chung-${i}`, text })),
  than_thiet: THAN_THIET_TEXTS.map((text, i) => ({ id: `than_thiet-${i}`, text })),
  doanh_nghiep: DOANH_NGHIEP_TEXTS.map((text, i) => ({ id: `doanh_nghiep-${i}`, text })),
  gia_dinh: GIA_DINH_TEXTS.map((text, i) => ({ id: `gia_dinh-${i}`, text })),
  tre: TRE_TEXTS.map((text, i) => ({ id: `tre-${i}`, text })),
  // "Anh / Chị" dùng chung kho câu lịch sự/chuyên nghiệp — cách xưng hô
  // "anh/chị" đã có sẵn xuyên suốt các câu trong nhóm này.
  anh_chi: CHUNG_TEXTS.map((text, i) => ({ id: `anh_chi-${i}`, text })),
};

/**
 * Chọn ngẫu nhiên 1 lời chúc theo đối tượng khách, tránh lặp lại những câu
 * vừa dùng gần đây (excludeIds). Nếu đã dùng hết cả kho thì cho phép lặp lại
 * (không để chức năng "kẹt" không random ra được gì).
 */
export function pickRandomWish(customerType: CustomerType, excludeIds: string[]): Wish {
  const pool = WISH_BANK[customerType];
  const available = pool.filter((w) => !excludeIds.includes(w.id));
  const candidates = available.length > 0 ? available : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
