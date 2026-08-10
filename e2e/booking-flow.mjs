/**
 * E2E luồng booking + chat (P3, P4) — chạy trên dev server đang bật:
 *   npm run dev        # cửa sổ khác
 *   npm run e2e:booking
 *
 * Cố tình KHÔNG chụp ảnh: assert bằng text nên output gọn, chạy nhanh và
 * nói rõ bước nào hỏng. Ảnh chỉ dùng khi cần đánh giá thẩm mỹ.
 *
 * Mỗi vai đăng nhập ĐÚNG MỘT LẦN rồi tái dùng context — /auth có rate
 * limit 10 request/phút nên đăng nhập lặp sẽ bị 429.
 */
import { chromium } from 'playwright';

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
};

const browser = await chromium.launch();
const openAs = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('Demo@1234');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('**/dashboard');
  return page;
};

const brand = await openAs('brand@demo.vn');
const creator = await openAs('creator2@demo.vn');
const admin = await openAs('admin@demo.vn');

// --- P3: tạo booking và đi hết vòng tới CONFIRMED ---
await brand.goto('http://localhost:5173/creators/crt_0001');
await brand.getByRole('link', { name: 'Đặt gói này' }).first().click();
await brand.waitForURL('**/book**');
check('brand mở được trang đặt booking', brand.url().includes('/book'));

await brand.getByLabel('Mục tiêu chiến dịch').fill('Giới thiệu món mới cho quán cà phê tại Hoàn Kiếm.');
await brand.getByLabel('Key message').fill('Cà phê muối vị mới, giá sinh viên.');
await brand.getByLabel('Deadline mong muốn').fill('2026-09-01');
await brand.getByRole('button', { name: 'Tạo yêu cầu booking' }).click();
await brand.waitForURL(/\/bookings\/bkg_/);
const bookingUrl = brand.url();
const detailText = await brand.locator('.page').innerText();
check('tạo booking → vào trang chi tiết có mã KB-', /KB-\d{6}-/.test(detailText));
check('trạng thái ban đầu là Nháp', detailText.includes('Nháp'));
check('breakdown hiện phí nền tảng', detailText.includes('Phí nền tảng'));

await brand.getByRole('button', { name: 'Gửi yêu cầu cho creator' }).click();
await brand.waitForTimeout(700);
check(
  'gửi xong chuyển sang Chờ creator phản hồi',
  (await brand.locator('.page').innerText()).includes('Chờ creator phản hồi'),
);

await creator.goto('http://localhost:5173/bookings');
// Chờ ĐÚNG hàng booking — '.feedback' cũng là class của trạng thái đang tải
// nên chờ nó sẽ khớp ngay lập tức và đọc text quá sớm.
const creatorSeesBooking = await creator
  .waitForSelector('.booking-row', { timeout: 10000 })
  .then(() => true)
  .catch(() => false);
check('creator thấy booking trong danh sách của mình', creatorSeesBooking);

await creator.goto(bookingUrl);
await creator.waitForSelector('.next-action');
await creator.getByRole('button', { name: 'Chấp nhận booking' }).click();
await creator.waitForTimeout(700);
const afterAccept = await creator.locator('.page').innerText();
check('creator accept → Chờ thanh toán', afterAccept.includes('Chờ thanh toán'));
check('accept khóa điều khoản', afterAccept.includes('Điều khoản đã khóa'));

await admin.goto(bookingUrl);
await admin.waitForSelector('.next-action');
check('admin xem được booking để hỗ trợ',
  (await admin.locator('.page').innerText()).includes('Chờ thanh toán'));
await admin.getByRole('button', { name: 'Xác nhận đã thanh toán' }).click();
await admin.waitForTimeout(700);
check(
  'admin xác nhận thanh toán → Đã xác nhận',
  (await admin.locator('.page').innerText()).includes('Đã xác nhận'),
);

// --- P4: chat trong booking + thông báo ---
await brand.goto(bookingUrl);
try {
  await brand.waitForSelector('.chat__composer', { timeout: 15000 });
} catch {
  console.log('DIAG brand page:', (await brand.locator('body').innerText()).slice(0, 400).replace(/\n/g, ' | '));
  throw new Error('chat composer không xuất hiện');
}
await brand.getByLabel('Nội dung tin nhắn').fill('Chào bạn, mình muốn quay cuối tuần này nhé.');
await brand.getByRole('button', { name: 'Gửi', exact: true }).click();
await brand.waitForTimeout(800);
check(
  'brand gửi được tin nhắn trong booking',
  (await brand.locator('.chat__thread').innerText()).includes('quay cuối tuần này'),
);

await creator.goto(bookingUrl);
await creator.waitForSelector('.chat__thread');
await creator.waitForTimeout(500);
check(
  'creator đọc được tin của brand cùng thread',
  (await creator.locator('.chat__thread').innerText()).includes('quay cuối tuần này'),
);

await creator.getByLabel('Nội dung tin nhắn').fill('Mình nhận nhé, thứ 7 quay được không?');
await creator.getByRole('button', { name: 'Gửi', exact: true }).click();
await creator.waitForTimeout(800);

// Thông báo: brand phải nhận được tin nhắn mới từ creator
await brand.reload();
await brand.waitForTimeout(1500);
check('brand thấy badge chuông thông báo', (await brand.locator('.notif__badge').count()) > 0);
await brand.locator('.notif__bell').click();
await brand.waitForSelector('.notif__panel');
check(
  'panel thông báo có mục tin nhắn mới',
  (await brand.locator('.notif__panel').innerText()).includes('Tin nhắn mới'),
);
await brand.locator('.notif__item').first().click();
await brand.waitForTimeout(800);
check('bấm thông báo nhảy đúng booking (deep link)', brand.url().includes('/bookings/bkg_'));

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
