/**
 * E2E luồng booking (P3) — chạy trên dev server đang bật:
 *   npm run dev        # cửa sổ khác
 *   npm run e2e:booking
 *
 * Cố tình KHÔNG chụp ảnh: assert bằng text nên output gọn, chạy nhanh
 * và nói rõ bước nào hỏng. Ảnh chỉ dùng khi cần đánh giá thẩm mỹ.
 */
import { chromium } from 'playwright';

let pass = 0, fail = 0;
const check = (label, ok) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`); };

const browser = await chromium.launch();
const openAs = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('Demo@1234');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('**/dashboard');
  return { ctx, page };
};

// Brand đặt booking
const brand = await openAs('brand@demo.vn');
await brand.page.goto('http://localhost:5173/creators/crt_0001');
await brand.page.getByRole('link', { name: 'Đặt gói này' }).first().click();
await brand.page.waitForURL('**/book**');
check('brand mở được trang đặt booking', brand.page.url().includes('/book'));

await brand.page.getByLabel('Mục tiêu chiến dịch').fill('Giới thiệu món mới cho quán cà phê tại Hoàn Kiếm.');
await brand.page.getByLabel('Key message').fill('Cà phê muối vị mới, giá sinh viên.');
await brand.page.getByLabel('Deadline mong muốn').fill('2026-09-01');
await brand.page.getByRole('button', { name: 'Tạo yêu cầu booking' }).click();
await brand.page.waitForURL(/\/bookings\/bkg_/);
const detailText = await brand.page.locator('.page').innerText();
check('tạo booking → vào trang chi tiết có mã KB-', /KB-\d{6}-/.test(detailText));
check('trạng thái ban đầu là Nháp', detailText.includes('Nháp'));
check('breakdown hiện phí nền tảng', detailText.includes('Phí nền tảng'));

await brand.page.getByRole('button', { name: 'Gửi yêu cầu cho creator' }).click();
await brand.page.waitForTimeout(700);
check('gửi xong chuyển sang Chờ creator phản hồi',
  (await brand.page.locator('.page').innerText()).includes('Chờ creator phản hồi'));
const bookingUrl = brand.page.url();
await brand.ctx.close();

// Creator chấp nhận
const creator = await openAs('creator2@demo.vn');
await creator.page.goto('http://localhost:5173/bookings');
const listText = await creator.page.locator('.page').innerText();
check('creator thấy booking trong danh sách của mình', /KB-\d{6}-/.test(listText));

await creator.page.goto(bookingUrl);
await creator.page.waitForTimeout(500);
await creator.page.getByRole('button', { name: 'Chấp nhận booking' }).click();
await creator.page.waitForTimeout(700);
const afterAccept = await creator.page.locator('.page').innerText();
check('creator accept → Chờ thanh toán', afterAccept.includes('Chờ thanh toán'));
check('accept khóa điều khoản (hiện mục Điều khoản đã khóa)', afterAccept.includes('Điều khoản đã khóa'));
await creator.ctx.close();

// Người ngoài không xem được
const outsider = await openAs('admin@demo.vn');
await outsider.page.goto(bookingUrl);
await outsider.page.waitForTimeout(600);
const adminText = await outsider.page.locator('.page').innerText();
check('admin xem được booking để hỗ trợ', adminText.includes('Chờ thanh toán'));
await outsider.page.getByRole('button', { name: 'Xác nhận đã thanh toán' }).click();
await outsider.page.waitForTimeout(700);
check('admin xác nhận thanh toán → Đã xác nhận',
  (await outsider.page.locator('.page').innerText()).includes('Đã xác nhận'));
await outsider.ctx.close();

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
