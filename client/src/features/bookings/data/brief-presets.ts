/**
 * Gợi ý dựng sẵn cho brief booking (BKG-002).
 *
 * Đối tượng dùng là local brand nhỏ, phần lớn chưa từng viết brief. Một ô
 * trống hỏi "Bạn muốn đạt được gì?" là chỗ họ bỏ dở nhiều nhất, nên mỗi mục
 * tiêu kèm sẵn một bản nháp để sửa thay vì bắt đầu từ số không.
 *
 * Preset LUÔN chỉ là điểm khởi đầu: mọi danh sách đều cho tự thêm mục riêng,
 * nếu không brand có yêu cầu đặc thù sẽ đi vòng qua chat — đúng thứ nền tảng
 * muốn tránh.
 */

export interface CampaignObjective {
  readonly id: string;
  readonly label: string;
  /** Điền sẵn vào ô mục tiêu; brand sửa lại cho khớp sản phẩm của mình. */
  readonly objectiveDraft: string;
  readonly keyMessageHint: string;
  readonly suggestedScenes: readonly string[];
  readonly suggestedProhibited: readonly string[];
}

export const CAMPAIGN_OBJECTIVES: readonly CampaignObjective[] = [
  {
    id: 'launch',
    label: 'Ra mắt sản phẩm mới',
    objectiveDraft:
      'Giới thiệu sản phẩm mới tới khách hàng địa phương, nhấn vào điểm khác biệt so với sản phẩm cũ.',
    keyMessageHint: 'VD: Trà sữa ít đường mới — ngọt vừa, không gắt',
    suggestedScenes: ['Cận cảnh sản phẩm', 'Cảnh dùng thử/trải nghiệm thật', 'Nêu tên sản phẩm rõ ràng'],
    suggestedProhibited: ['Không so sánh trực tiếp với đối thủ'],
  },
  {
    id: 'awareness',
    label: 'Tăng nhận diện thương hiệu',
    objectiveDraft:
      'Tăng mức độ nhận biết thương hiệu với nhóm khách hàng trong khu vực, ưu tiên nội dung dễ lan truyền.',
    keyMessageHint: 'VD: Quán cà phê rang xay tại chỗ ở Quận 1',
    suggestedScenes: ['Cảnh không gian/cửa hàng', 'Logo hoặc biển hiệu xuất hiện rõ'],
    suggestedProhibited: ['Không so sánh trực tiếp với đối thủ', 'Không dùng nhạc có bản quyền'],
  },
  {
    id: 'promotion',
    label: 'Đẩy khuyến mãi / giảm giá',
    objectiveDraft:
      'Truyền tải chương trình khuyến mãi đang chạy, thúc đẩy khách đến mua trong thời gian ưu đãi.',
    keyMessageHint: 'VD: Giảm 30% toàn menu từ 20/8 đến 30/8',
    suggestedScenes: ['Nêu rõ nội dung và thời hạn khuyến mãi', 'Cận cảnh sản phẩm'],
    suggestedProhibited: ['Không nêu sai giá hoặc thời hạn khuyến mãi'],
  },
  {
    id: 'review',
    label: 'Review trải nghiệm thật',
    objectiveDraft:
      'Ghi lại trải nghiệm thật khi dùng sản phẩm/dịch vụ, giữ giọng chân thực thay vì quảng cáo cứng.',
    keyMessageHint: 'VD: Đáng thử nếu bạn thích vị đậm',
    suggestedScenes: ['Cảnh dùng thử/trải nghiệm thật', 'Cảm nhận trực tiếp trên camera'],
    suggestedProhibited: ['Không nói quá công dụng', 'Không cam kết kết quả tuyệt đối'],
  },
  {
    id: 'store_visit',
    label: 'Kéo khách tới cửa hàng',
    objectiveDraft:
      'Thúc đẩy khách hàng trong khu vực ghé cửa hàng, nhấn vào vị trí và lý do nên đến.',
    keyMessageHint: 'VD: Ghé 12 Nguyễn Huệ, mở tới 22h mỗi ngày',
    suggestedScenes: ['Nêu rõ địa chỉ cửa hàng', 'Cảnh không gian/cửa hàng', 'Đường đi hoặc mặt tiền dễ nhận ra'],
    suggestedProhibited: ['Không quay mặt khách hàng khác khi chưa xin phép'],
  },
  {
    id: 'seeding',
    label: 'Nội dung để brand tự chạy quảng cáo',
    objectiveDraft:
      'Sản xuất nội dung cho thương hiệu dùng lại trên kênh riêng và chạy quảng cáo, không nhất thiết đăng trên kênh creator.',
    keyMessageHint: 'VD: Nhấn vào công dụng chính trong 3 giây đầu',
    suggestedScenes: ['Cận cảnh sản phẩm', 'Có khoảng trống để brand chèn chữ/logo'],
    suggestedProhibited: ['Không gắn nội dung của nhãn hàng khác trong cùng video'],
  },
];

/** Cảnh thường gặp theo lĩnh vực của gói dịch vụ — khớp `category` của package. */
const SCENES_BY_CATEGORY: Readonly<Record<string, readonly string[]>> = {
  'f&b': [
    'Cận cảnh món ăn/đồ uống',
    'Cảnh thưởng thức (ăn/uống thật)',
    'Cảnh không gian quán',
    'Nêu giá hoặc combo trong menu',
  ],
  lifestyle: [
    'Cảnh sử dụng trong sinh hoạt hằng ngày',
    'Cảnh trước - sau khi dùng',
    'Cận cảnh chi tiết sản phẩm',
  ],
  tech: [
    'Cận cảnh thiết bị và cổng kết nối',
    'Thao tác thực tế trên máy',
    'Nêu thông số chính',
  ],
};

/** Cảnh dùng được cho mọi lĩnh vực — luôn hiện kèm nhóm theo lĩnh vực. */
const COMMON_SCENES: readonly string[] = [
  'Cận cảnh sản phẩm',
  'Cảnh dùng thử/trải nghiệm thật',
  'Nêu tên thương hiệu rõ ràng',
  'Nêu rõ địa chỉ cửa hàng',
  'Kêu gọi hành động ở cuối (CTA)',
];

/** Điều cấm phổ biến — phần lớn brand đều cần ít nhất vài mục trong đây. */
export const PROHIBITED_PRESETS: readonly string[] = [
  'Không so sánh trực tiếp với đối thủ',
  'Không nói quá công dụng',
  'Không nhắc giá cụ thể',
  'Không dùng nhạc có bản quyền',
  'Không quay mặt khách hàng khác khi chưa xin phép',
  'Không gắn link tiếp thị liên kết của nhãn khác',
  'Không dùng từ ngữ nhạy cảm hoặc gây tranh cãi',
  'Không chỉnh màu làm sai lệch sản phẩm thật',
];

/**
 * Gợi ý cảnh quay cho một gói: nhóm theo lĩnh vực trước, rồi tới nhóm chung.
 * Lĩnh vực lạ (brand tự đặt category) vẫn có nhóm chung để chọn.
 */
export const scenePresetsFor = (category: string): readonly string[] => {
  const byCategory = SCENES_BY_CATEGORY[category.trim().toLowerCase()] ?? [];
  const merged = [...byCategory, ...COMMON_SCENES];
  return [...new Set(merged)];
};

export const findObjective = (id: string): CampaignObjective | undefined =>
  CAMPAIGN_OBJECTIVES.find((objective) => objective.id === id);
