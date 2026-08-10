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

/** Trạng thái booking = pill ở header, KHÔNG quét cả trang (nhãn nút dễ trùng). */
const statusOf = async (page) => (await page.locator('.page__header--row .pill').innerText()).trim();

const brand = await openAs('brand@demo.vn');
const creator = await openAs('creator2@demo.vn');
const admin = await openAs('admin@demo.vn');

// --- Chat trước booking (OD-09): hỏi rồi mới đặt ---
await brand.goto('http://localhost:5173/creators/crt_0001');
await brand.waitForSelector('.booking-panel');
await brand.getByRole('button', { name: 'Nhắn tin cho creator' }).click();
await brand.waitForURL('**/messages**');
check('brand mở được luồng chat từ hồ sơ creator', brand.url().includes('/messages'));

await brand.waitForSelector('.chat__composer');
await brand.getByLabel('Nội dung tin nhắn').fill('Chào bạn, tuần này bạn còn nhận lịch quay không?');
await brand.getByRole('button', { name: 'Gửi', exact: true }).click();
await brand.waitForTimeout(900);
check('gửi được tin khi CHƯA có booking nào',
  (await brand.locator('.chat__thread').innerText()).includes('còn nhận lịch quay'));

await brand.getByLabel('Nội dung tin nhắn').fill('Hay bạn cho mình số 0912345678 nhé.');
await brand.getByRole('button', { name: 'Gửi', exact: true }).click();
await brand.waitForTimeout(900);
check('chat trước booking: gửi SĐT bị cảnh báo (CHAT-004)',
  (await brand.locator('.chat__thread').innerText()).includes('mất bảo đảm thanh toán'));

await creator.goto('http://localhost:5173/messages');
await creator.waitForSelector('.conversation-item');
check('creator thấy hội thoại brand gửi tới',
  (await creator.locator('.conversation-list').innerText()).includes('Brand Demo'));

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
check(
  'chat trong booking hiện luôn lịch sử hỏi trước đó (cùng một luồng)',
  (await brand.locator('.chat__thread').innerText()).includes('còn nhận lịch quay'),
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
  (await brand.locator('.notif__panel').innerText()).includes('tin nhắn mới'),
);
await brand.locator('.notif__item').first().click();
await brand.waitForTimeout(900);
// Thông báo tin nhắn dẫn về luồng chat (chat nay độc lập với booking).
check('bấm thông báo nhảy đúng luồng chat (deep link)', brand.url().includes('/messages?c=cnv_'));

// --- P5: nộp bài → yêu cầu sửa → nộp lại → nghiệm thu → hoàn tất ---
await creator.goto(bookingUrl);
await creator.waitForSelector('.next-action');
await creator.getByRole('button', { name: 'Bắt đầu sản xuất' }).click();
await creator.waitForTimeout(700);
check('creator bắt đầu sản xuất', (await statusOf(creator)) === 'Đang sản xuất');

const fillSubmission = async (page, link, desc) => {
  try {
    await page.waitForSelector('.submit-form', { timeout: 12000 });
  } catch {
    console.log('DIAG url:', page.url());
    console.log('DIAG body:', (await page.locator('body').innerText()).slice(0, 200).replace(/\n/g, ' | '));
    console.log('DIAG fulfillment:', await page.locator('.fulfillment').innerText().catch(() => 'KHÔNG CÓ PANEL'));
    throw new Error('không thấy form nộp bài');
  }
  await page.locator('.submit-form input[type="url"]').first().fill(link);
  await page.locator('.submit-form input[type="text"]').first().fill(desc);
  await page.locator('.submit-form input[type="url"]').last().fill(link);
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await page.waitForTimeout(900);
};

await fillSubmission(creator, 'https://www.tiktok.com/@lanchifoodie/video/1', 'Video 45 giây quay dọc');
check('creator nộp bài → Đã nộp bài', (await statusOf(creator)) === 'Đã nộp bài');

await brand.goto(bookingUrl);
await brand.waitForSelector('.fulfillment');
check('brand thấy bản nộp 1', (await brand.locator('.fulfillment').innerText()).includes('Bản 1'));

await brand.getByRole('button', { name: /Yêu cầu sửa \(/ }).click();
await brand.waitForSelector('.modal__card');
await brand.getByLabel('Nội dung cần sửa').fill('Cảnh mở đầu chưa thấy rõ biển hiệu quán, nhờ bạn quay lại.');
await brand.getByRole('button', { name: 'Gửi yêu cầu sửa' }).click();
await brand.waitForTimeout(900);
check('yêu cầu sửa → trạng thái Yêu cầu sửa', (await statusOf(brand)) === 'Yêu cầu sửa');

await creator.goto(bookingUrl);
await fillSubmission(creator, 'https://www.tiktok.com/@lanchifoodie/video/2', 'Bản sửa cảnh mở đầu');
check('creator nộp lại → có bản 2',
  (await creator.locator('.fulfillment').innerText()).includes('Bản 2'));

await brand.goto(bookingUrl);
await brand.waitForSelector('.next-action');
check('hết lượt sửa thì không còn nút yêu cầu sửa',
  (await brand.getByRole('button', { name: /Yêu cầu sửa \(/ }).count()) === 0);
await brand.getByRole('button', { name: 'Nghiệm thu nội dung' }).click();
await brand.waitForTimeout(800);
check('brand nghiệm thu → Đã nghiệm thu', (await statusOf(brand)) === 'Đã nghiệm thu');

await admin.goto(bookingUrl);
await admin.waitForSelector('.next-action');
await admin.getByRole('button', { name: 'Chốt hoàn tất' }).click();
await admin.waitForTimeout(800);
check('admin chốt hoàn tất → Hoàn tất', (await statusOf(admin)) === 'Hoàn tất');

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
