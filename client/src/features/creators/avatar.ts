/**
 * Ảnh đại diện thay thế khi creator chưa tải ảnh lên.
 *
 * Tách ra dùng chung vì trước đây thẻ creator và trang hồ sơ tự dựng riêng:
 * cùng một người mà thẻ hiện "LC" trên nền gradient, trang hồ sơ lại hiện "L"
 * trên nền phẳng — trông như hai người khác nhau.
 */

/** "Lan Chi Foodie" → "LC". Lấy tối đa 2 chữ đầu cho dễ đọc ở cỡ nhỏ. */
export const creatorInitials = (displayName: string): string =>
  displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

/**
 * Palette tuyển chọn quanh hệ Tím Măng Cụt — chọn ổn định theo tên (không
 * random) để mỗi creator giữ một màu nhất quán giữa các lần render và giữa
 * các màn hình.
 */
const COVER_GRADIENTS = [
  'linear-gradient(150deg, #8b4ddb, #43167a)', // tím măng cụt
  'linear-gradient(150deg, #b65fa8, #6d2260)', // hồng mận
  'linear-gradient(150deg, #e8a020, #9a5b08)', // vàng nghệ
  'linear-gradient(150deg, #2f9e8f, #14574e)', // xanh ngọc
  'linear-gradient(150deg, #5b7bd6, #2b3f8f)', // xanh chàm
  'linear-gradient(150deg, #d96f4b, #8f3a1e)', // cam đất
] as const;

export const coverGradient = (displayName: string): string => {
  let hash = 0;
  for (const char of displayName) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length] as string;
};
