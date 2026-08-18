import type { HelmetOptions } from 'helmet';

/**
 * Tùy chọn helmet theo việc trình duyệt đang nói chuyện qua HTTPS hay HTTP.
 *
 * Mặc định helmet bật hai thứ chỉ đúng khi có HTTPS:
 * - CSP `upgrade-insecure-requests`: buộc trình duyệt nâng MỌI request lên
 *   https. Chạy HTTP trần thì CSS/JS bị tải qua https, nhận ERR_SSL_PROTOCOL_ERROR
 *   và trang trắng hoàn toàn. Lỗi này không lộ ra khi phát triển vì trình duyệt
 *   xem localhost là origin tin cậy nên bỏ qua directive.
 * - HSTS: dặn trình duyệt "từ nay chỉ dùng https với host này". Trên http thì
 *   header bị bỏ qua, nhưng nếu host từng phục vụ https, người dùng sẽ kẹt
 *   không vào lại được bằng http.
 *
 * `overHttps` lấy từ COOKIE_SECURE — cùng một câu hỏi: kết nối tới trình duyệt
 * có phải HTTPS không (kể cả khi TLS được kết thúc ở reverse proxy đứng trước).
 */
export const buildHelmetOptions = (overHttps: boolean): HelmetOptions => {
  if (overHttps) {
    return {};
  }

  return {
    contentSecurityPolicy: {
      useDefaults: true,
      // null = bỏ hẳn directive khỏi CSP mặc định.
      directives: { upgradeInsecureRequests: null },
    },
    strictTransportSecurity: false,
  };
};
