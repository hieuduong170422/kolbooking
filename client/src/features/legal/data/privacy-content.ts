import { SUPPORT_EMAIL, type LegalDocument } from '../types/legal-types';

/**
 * Chính sách quyền riêng tư — liệt kê ĐÚNG những gì hệ thống đang lưu. Thêm
 * trường dữ liệu mới vào user/creator/brand/booking thì phải bổ sung ở đây,
 * nếu không văn bản này thành lời hứa sai.
 */
export const PRIVACY_DOCUMENT: LegalDocument = {
  title: 'Chính sách quyền riêng tư',
  summary:
    'Chính sách này nói rõ chúng tôi thu thập dữ liệu nào, dùng để làm gì, ai nhìn thấy được và bạn kiểm soát chúng ra sao.',
  effectiveDate: '20/08/2026',
  sections: [
    {
      heading: '1. Dữ liệu chúng tôi thu thập',
      bullets: [
        'Tài khoản: email, tên hiển thị, vai trò, trạng thái xác minh email, phiên bản điều khoản bạn đã đồng ý và thời điểm đồng ý. Mật khẩu chỉ được lưu dưới dạng băm — chúng tôi không có bản gốc.',
        'Hồ sơ creator: ảnh đại diện, giới thiệu, thành phố, lĩnh vực, loại hình, liên kết mạng xã hội và số liệu người theo dõi bạn tự khai, danh sách sản phẩm đã làm, lịch nhận việc.',
        'Hồ sơ brand: tên doanh nghiệp, ngành hàng, website, địa chỉ, thông tin người liên hệ và giấy tờ xác minh do bạn tải lên.',
        'Giao dịch: gói dịch vụ, brief, deadline, trạng thái booking, các mốc thời gian, bài nộp và tệp đính kèm, yêu cầu sửa, đánh giá.',
        'Trao đổi: tin nhắn giữa brand và creator trên nền tảng.',
        'Nhật ký hệ thống: các thao tác quan trọng (đăng ký, chuyển trạng thái booking, thao tác quản trị) kèm thời điểm và người thực hiện.',
        'Kỹ thuật: log truy cập của máy chủ phục vụ vận hành và chống lạm dụng.',
      ],
    },
    {
      heading: '2. Dùng để làm gì',
      bullets: [
        'Vận hành dịch vụ: tạo tài khoản, hiển thị hồ sơ, thực hiện và theo dõi booking, gửi thông báo.',
        'Xác minh: duyệt hồ sơ creator và brand, xác minh email.',
        'Bảo vệ giao dịch: chống gian lận, giới hạn số lần thử đăng nhập, giữ dấu vết để phân xử tranh chấp.',
        'Cải thiện sản phẩm dựa trên số liệu tổng hợp, không dùng để nhận dạng cá nhân.',
      ],
      paragraphs: [
        'Chúng tôi KHÔNG bán dữ liệu cá nhân của bạn và không dùng dữ liệu của bạn để quảng cáo cho bên thứ ba.',
      ],
    },
    {
      heading: '3. Ai nhìn thấy dữ liệu của bạn',
      bullets: [
        'Công khai: những gì bạn đặt trong hồ sơ creator (tên, ảnh, giới thiệu, lĩnh vực, liên kết mạng xã hội, sản phẩm đã làm, giá gói) hiển thị cho mọi người truy cập.',
        'Đối tác trong giao dịch: brand và creator của cùng một booking thấy brief, tin nhắn, bài nộp và trạng thái của booking đó.',
        'Đội vận hành: xem được hồ sơ, giao dịch và nhật ký khi duyệt hồ sơ, xử lý báo cáo vi phạm hoặc phân xử tranh chấp.',
        'Nhà cung cấp hạ tầng: máy chủ và dịch vụ gửi email cần thiết để chạy nền tảng.',
        'Cơ quan nhà nước: khi có yêu cầu hợp pháp.',
      ],
      paragraphs: [
        'Giấy tờ xác minh của brand được lưu ở kho riêng, không truy cập được qua đường dẫn công khai và chỉ đội vận hành mở được khi duyệt hồ sơ.',
      ],
    },
    {
      heading: '4. Cookie và phiên đăng nhập',
      paragraphs: [
        'Chúng tôi dùng một cookie kỹ thuật để giữ phiên đăng nhập (refresh token). Không có cookie quảng cáo, không có mã theo dõi của bên thứ ba. Xóa cookie này đồng nghĩa với đăng xuất.',
      ],
    },
    {
      heading: '5. Lưu trong bao lâu',
      bullets: [
        'Dữ liệu tài khoản và hồ sơ: lưu trong thời gian tài khoản còn hoạt động.',
        'Dữ liệu giao dịch (booking, brief, bài nộp, hóa đơn): lưu tiếp sau khi đóng tài khoản theo thời hạn kế toán và thời hiệu khiếu nại, vì đây là bằng chứng của một giao dịch giữa hai bên.',
        'Nhật ký thao tác: chỉ ghi thêm, không sửa và không xóa cứng — đây là cơ sở phân xử.',
      ],
    },
    {
      heading: '6. Bảo mật',
      bullets: [
        'Mật khẩu lưu dưới dạng băm; phiên đăng nhập dùng token có hạn và xoay vòng khi làm mới.',
        'Phân quyền kiểm ở máy chủ: mỗi người chỉ đọc được dữ liệu của giao dịch mình tham gia.',
        'Giới hạn số lần thử với đăng nhập, đăng ký, mã xác minh và đặt lại mật khẩu.',
        'Giấy tờ xác minh lưu tách khỏi kho tệp công khai.',
      ],
      paragraphs: [
        'Không hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố ảnh hưởng tới dữ liệu của bạn, chúng tôi sẽ thông báo cho người bị ảnh hưởng và cơ quan có thẩm quyền theo quy định.',
      ],
    },
    {
      heading: '7. Quyền của bạn',
      bullets: [
        'Xem và sửa dữ liệu hồ sơ ngay trong ứng dụng.',
        'Yêu cầu bản sao dữ liệu cá nhân của bạn.',
        'Yêu cầu xóa tài khoản. Chúng tôi xóa hoặc ẩn danh dữ liệu hồ sơ, nhưng vẫn giữ dữ liệu giao dịch cần thiết theo mục 5.',
        'Rút lại đồng ý. Việc rút đồng ý không ảnh hưởng tới tính hợp pháp của việc xử lý trước đó và có thể khiến bạn không tiếp tục dùng được dịch vụ.',
        'Khiếu nại về cách chúng tôi xử lý dữ liệu.',
      ],
      paragraphs: [
        `Gửi yêu cầu tới ${SUPPORT_EMAIL} từ email đã đăng ký. Chúng tôi phản hồi trong vòng 5 ngày làm việc.`,
      ],
    },
    {
      heading: '8. Người dưới 16 tuổi',
      paragraphs: [
        'Dịch vụ không dành cho người dưới 16 tuổi. Nếu phát hiện tài khoản thuộc người dưới 16 tuổi, chúng tôi sẽ khóa tài khoản và xóa dữ liệu liên quan.',
      ],
    },
    {
      heading: '9. Thay đổi chính sách',
      paragraphs: [
        'Bản đang áp dụng luôn hiển thị ở trang này kèm ngày áp dụng. Thay đổi ảnh hưởng tới quyền của bạn sẽ được thông báo trước khi có hiệu lực.',
      ],
    },
  ],
};
