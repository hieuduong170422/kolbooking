import { SUPPORT_EMAIL, type LegalDocument } from '../types/legal-types';

/**
 * Điều khoản sử dụng — mô tả đúng cơ chế đang chạy trong sản phẩm (giữ tiền
 * tới lúc nghiệm thu, phí nền tảng cộng vào giá brand trả, điều khoản khóa
 * thành snapshot khi creator đồng ý). Sửa cơ chế thì phải sửa cả ở đây.
 */
export const TERMS_DOCUMENT: LegalDocument = {
  title: 'Điều khoản sử dụng',
  summary:
    'Điều khoản này áp dụng cho mọi tài khoản brand, creator và mọi booking thực hiện trên KOL Booking. Đăng ký tài khoản nghĩa là bạn đồng ý với toàn bộ nội dung dưới đây.',
  effectiveDate: '20/08/2026',
  sections: [
    {
      heading: '1. KOL Booking là gì trong giao dịch của bạn',
      paragraphs: [
        'KOL Booking là nền tảng trung gian kết nối nhãn hàng (brand) với người sáng tạo nội dung (creator). Chúng tôi cung cấp công cụ đăng gói dịch vụ, đặt booking, trao đổi, nộp bài, nghiệm thu và giữ tiền cho tới khi hai bên hoàn tất.',
        'Chúng tôi KHÔNG phải là bên sản xuất nội dung và không phải người sử dụng lao động của creator. Nội dung do creator thực hiện; brand là bên đặt hàng và nghiệm thu. Chúng tôi chịu trách nhiệm về việc vận hành nền tảng và về quy trình phân xử khi có tranh chấp.',
      ],
    },
    {
      heading: '2. Tài khoản',
      bullets: [
        'Mỗi người dùng chịu trách nhiệm về thông tin đã khai và về mọi hoạt động diễn ra trong tài khoản của mình.',
        'Email phải được xác minh trước khi thực hiện giao dịch (tạo booking, nhận booking).',
        'Hồ sơ creator và hồ sơ brand phải được đội vận hành duyệt trước khi bán gói dịch vụ hoặc gửi yêu cầu booking.',
        'Không tạo tài khoản mạo danh người khác, không dùng lại tài khoản đã bị khóa.',
        'Chúng tôi có quyền khóa tài khoản hoặc tạm dừng hồ sơ khi phát hiện vi phạm, kèm lý do gửi cho chủ tài khoản.',
      ],
    },
    {
      heading: '3. Gói dịch vụ và yêu cầu booking',
      bullets: [
        'Creator tự đặt giá, đầu ra, thời gian hoàn thành, số vòng sửa và quyền sử dụng của mỗi gói. Những thông tin này hiển thị công khai trước khi brand đặt.',
        'Brand gửi yêu cầu kèm brief (mục tiêu, key message, cảnh bắt buộc, điều cấm, deadline mong muốn). Deadline phải cách hôm nay ít nhất bằng thời gian sản xuất của gói; chọn thêm add-on giao nhanh thì thời gian sản xuất rút lại tương ứng.',
        'Creator có quyền từ chối yêu cầu. Yêu cầu không được phản hồi trong thời hạn quy định sẽ tự hết hạn.',
        'Khi creator đồng ý, toàn bộ điều khoản (đầu ra, giá, thời gian, số vòng sửa, quyền sử dụng, brief) được khóa lại thành một bản không đổi. Bản khóa này là căn cứ khi phân xử; đổi phạm vi công việc sau đó cần tạo thỏa thuận mới.',
      ],
    },
    {
      heading: '4. Giá, phí nền tảng và thanh toán',
      bullets: [
        'Giá brand trả = giá gói + add-on đã chọn + phí nền tảng. Phí nền tảng và tổng tiền hiển thị đầy đủ trước khi bạn tạo yêu cầu booking.',
        'Mọi số tiền đều do máy chủ tính; số hiển thị ở trình duyệt chỉ là ước tính và số của máy chủ là số cuối cùng.',
        'Creator nhận đúng giá niêm yết của gói cộng add-on; phí nền tảng do brand trả.',
        'Tiền được giữ lại sau khi brand thanh toán và chỉ giải ngân cho creator sau khi brand nghiệm thu hoặc sau khi đội vận hành ra quyết định phân xử.',
      ],
    },
    {
      heading: '5. Nộp bài, sửa và nghiệm thu',
      bullets: [
        'Creator nộp bài trong booking, kèm bằng chứng đăng tải nếu gói yêu cầu đăng trên kênh của creator.',
        'Brand có số vòng sửa đúng bằng số đã mua trong gói. Mỗi yêu cầu sửa phải nêu lý do cụ thể; hết số vòng sửa mà vẫn muốn sửa thì cần thỏa thuận thêm.',
        'Brand nghiệm thu hoặc yêu cầu sửa trong thời hạn quy định. Quá hạn mà không phản hồi, hệ thống coi như hoàn tất để creator không bị treo tiền vô thời hạn.',
      ],
    },
    {
      heading: '6. Hủy và hết hạn',
      bullets: [
        'Brand có thể hủy khi booking chưa được creator đồng ý mà không mất phí.',
        'Sau khi điều khoản đã khóa, việc hủy cần lý do và có thể phát sinh khoản bù cho phần công việc đã thực hiện.',
        'Booking không được phản hồi hoặc không được thanh toán trong thời hạn quy định sẽ tự hết hạn.',
      ],
    },
    {
      heading: '7. Quyền sử dụng nội dung',
      paragraphs: [
        'Phạm vi quyền sử dụng (đăng lại, chạy quảng cáo, thời hạn, kênh được dùng) ghi trong từng gói và được khóa cùng điều khoản khi creator đồng ý. Dùng nội dung ngoài phạm vi đó — ví dụ chạy quảng cáo khi gói không bao gồm — là vi phạm điều khoản và creator có quyền khiếu nại.',
        'Creator bảo đảm nội dung do mình thực hiện, không xâm phạm quyền của bên thứ ba (hình ảnh, âm nhạc, thương hiệu).',
      ],
    },
    {
      heading: '8. Nội dung và hành vi bị cấm',
      bullets: [
        'Nội dung vi phạm pháp luật Việt Nam, xâm phạm quyền của người khác hoặc gây hiểu nhầm nghiêm trọng cho người tiêu dùng.',
        'Quảng cáo sai sự thật về công dụng sản phẩm, đặc biệt với thực phẩm, mỹ phẩm, thuốc và dịch vụ y tế.',
        'Đưa giao dịch ra ngoài nền tảng nhằm né phí sau khi đã ghép cặp qua nền tảng.',
        'Mua bán, trao đổi đánh giá; tạo booking giả để làm đẹp hồ sơ.',
        'Quấy rối, đe dọa hoặc phân biệt đối xử với người dùng khác trong tin nhắn và brief.',
      ],
    },
    {
      heading: '9. Đánh giá',
      paragraphs: [
        'Chỉ booking đã hoàn tất mới tạo được đánh giá, để điểm số phản ánh giao dịch thật. Chúng tôi gỡ đánh giá có nội dung vi phạm hoặc được xác định là gian lận, kèm thông báo lý do.',
      ],
    },
    {
      heading: '10. Tranh chấp',
      paragraphs: [
        'Khi hai bên không thống nhất được, mỗi bên có thể yêu cầu đội vận hành phân xử. Chúng tôi xem xét dựa trên bản điều khoản đã khóa, brief, lịch sử trao đổi trong booking và bài đã nộp.',
        'Quyết định phân xử áp dụng cho việc giải ngân khoản tiền đang giữ. Việc này không thay thế quyền khởi kiện của các bên theo pháp luật.',
      ],
    },
    {
      heading: '11. Giới hạn trách nhiệm',
      paragraphs: [
        'Chúng tôi chịu trách nhiệm về việc vận hành nền tảng và về khoản tiền đang giữ. Chúng tôi không chịu trách nhiệm về hiệu quả kinh doanh của chiến dịch, về chất lượng cảm tính của nội dung ngoài phạm vi đã mô tả trong gói, hay về thiệt hại gián tiếp phát sinh từ việc sử dụng nội dung.',
        'Trách nhiệm của chúng tôi trong mọi trường hợp không vượt quá tổng số tiền của booking liên quan.',
      ],
    },
    {
      heading: '12. Thay đổi điều khoản',
      paragraphs: [
        'Chúng tôi có thể cập nhật điều khoản. Bản đang áp dụng luôn hiển thị ở trang này kèm ngày áp dụng, và hệ thống lưu lại phiên bản bạn đã đồng ý tại thời điểm đăng ký. Thay đổi ảnh hưởng tới quyền lợi sẽ được thông báo trước khi có hiệu lực.',
      ],
    },
    {
      heading: '13. Liên hệ',
      paragraphs: [
        `Câu hỏi về điều khoản hoặc khiếu nại: ${SUPPORT_EMAIL}. Chúng tôi phản hồi trong vòng 5 ngày làm việc.`,
      ],
    },
  ],
};
