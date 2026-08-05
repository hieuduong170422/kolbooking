# KOL Booking — Creator Service Marketplace (MVP)

Nền tảng booking trực tiếp giữa local brand và nano/micro/UGC creator (theo SRS-CM-MVP-1.0).

Monorepo npm workspaces gồm 2 workspace:

| Workspace | Stack | Vai trò |
|---|---|---|
| [`client/`](client/) | React 19 + Vite + TypeScript | UI (Brand portal / Creator PWA — responsive) |
| [`server/`](server/) | Node.js + Express 5 + TypeScript | REST API `/api/v1` |

## Chạy dự án

```bash
npm install          # cài toàn bộ workspace

npm run dev          # chạy song song server (:4000) + client (:5173)
npm run dev:server   # chỉ API
npm run dev:client   # chỉ UI (proxy /api → :4000)

npm test             # test server + client
npm run build        # build server + client
```

Cấu hình server: copy [`server/.env.example`](server/.env.example) → `server/.env` (có default hợp lệ, không bắt buộc).

## Kiến trúc server — layer rõ ràng

```
server/src/
├── index.ts                  # bootstrap + graceful shutdown
├── app.ts                    # app factory (nhận dependencies → dễ test)
├── config/env.ts             # env validate bằng Zod, fail-fast khi thiếu
├── routes/v1.ts              # mount route các module vào /api/v1
├── shared/                   # hạ tầng dùng chung
│   ├── errors/api-error.ts   # ApiError + factory (badRequest, notFound...)
│   ├── http/api-response.ts  # envelope { success, data, error, meta }
│   ├── logger/logger.ts      # pino structured log, redact secrets
│   └── middlewares/          # error-handler, not-found, validate (Zod), rate-limiter
└── modules/<domain>/         # tổ chức theo domain (bounded context)
    ├── *.routes.ts           #   HTTP routes + composition (DI tại biên module)
    ├── *.controller.ts       #   đọc input đã validate → gọi service → envelope
    ├── *.service.ts          #   business rules
    ├── *.repository.ts       #   interface truy cập dữ liệu (Repository Pattern)
    ├── *.repository.memory.ts#   impl in-memory (thay bằng PostgreSQL sau)
    ├── *.validation.ts       #   Zod schemas cho query/params/body
    ├── *.mapper.ts           #   entity → public DTO (không lộ PII — CRE-009)
    ├── *.types.ts            #   domain types
    └── *.seed.ts             #   dữ liệu mẫu dev/test
```

Luồng request: `routes → validate (Zod) → controller → service → repository`, lỗi đi qua error-handler chung, response luôn theo envelope.

**Nguyên tắc đã cài sẵn** (bám SRS §6.3, §12, §13): tính tiền/logic phía server, input validation tại biên, rate limit, Helmet, CORS whitelist, structured log có redact, phân trang bắt buộc, immutable data (không mutate).

## Kiến trúc client — feature-based

```
client/src/
├── main.tsx                  # entry
├── app/                      # khung ứng dụng
│   ├── App.tsx               # providers + router
│   ├── routes.tsx            # định nghĩa route
│   └── providers/            # TanStack Query provider
├── pages/                    # mỗi route một page component
├── features/<feature>/       # tổ chức theo tính năng
│   ├── api/                  #   gọi REST API
│   ├── hooks/                #   TanStack Query hooks
│   ├── components/           #   UI riêng của feature
│   └── types/                #   types (mirror DTO server)
├── shared/                   # dùng chung
│   ├── api/                  #   axios client + chuẩn hóa lỗi (ApiClientError)
│   ├── components/           #   layout, feedback (loading/error/empty), pagination
│   ├── config/env.ts         #   Vite env
│   └── utils/                #   format tiền VND, số rút gọn
└── styles/index.css          # design tokens + styles
```

Filter/search state nằm trên URL (`useSearchParams`) để chia sẻ được link (SRCH-003).

## REST API hiện có

Envelope chung: `{ success, data, error, meta? }` — lỗi có `error.code` ổn định + `error.details[]` khi validate fail.

| Endpoint | Mô tả |
|---|---|
| `GET /api/v1/health` | Health check |
| `POST /api/v1/auth/register` | Đăng ký (role `creator`/`brand`) → user + access token, set refresh cookie |
| `POST /api/v1/auth/login` | Đăng nhập → user + access token, set refresh cookie |
| `POST /api/v1/auth/refresh` | Cấp access token mới từ refresh cookie (xoay vòng, chống replay) |
| `POST /api/v1/auth/logout` | Thu hồi refresh token + xóa cookie |
| `GET /api/v1/auth/me` | User hiện tại (Bearer access token) |
| `GET /api/v1/creators` | Danh sách creator công khai — filter `search, city, creatorType, platform, serviceMode, minPrice, maxPrice`, sort `rating\|price_asc\|price_desc\|newest`, phân trang `page, limit` |
| `GET /api/v1/creators/:id` | Chi tiết creator (chỉ creator `verified`) |
| `GET /api/v1/creators/me` | Hồ sơ creator đang đăng nhập (CRE-001, role creator) |
| `PUT /api/v1/creators/me` | Tạo/cập nhật hồ sơ theo transition matrix (CRE-002, CRE-007) |
| `PATCH /api/v1/creators/me/availability` | Cập nhật lịch nhận việc (CRE-010) |
| `POST /api/v1/creators/me/submit-review` | Gửi hồ sơ chờ admin duyệt (CRE-001) |
| `POST /api/v1/creators/me/portfolio` | Thêm mục portfolio — upload file hoặc link JSON (CRE-004) |
| `DELETE /api/v1/creators/me/portfolio/:itemId` | Xóa mục portfolio (CRE-004) |
| `POST /api/v1/creators/me/avatar` | Upload ảnh đại diện (CRE-004) |
| `GET /api/v1/creators/reviews` | Hàng chờ duyệt theo trạng thái (CRE-008, role admin) |
| `POST /api/v1/creators/:id/review` | Duyệt/từ chối/yêu cầu bổ sung/tạm khóa (CRE-008, role admin) |

**Cơ chế auth**: access token JWT (HS256, mặc định 15 phút) gửi qua header `Authorization: Bearer`; refresh token opaque nằm trong httpOnly cookie (7 ngày), chỉ lưu hash phía server, xoay vòng mỗi lần refresh. Mật khẩu hash bằng scrypt. RBAC qua middleware `requireAuth` + `requireRole(...)` (AUTH-005). Client giữ access token trong bộ nhớ (không localStorage), tự refresh khi gặp 401.

**Tài khoản demo (dev)**: `creator@demo.vn`, `brand@demo.vn`, `admin@demo.vn` — mật khẩu `Demo@1234` (`locked@demo.vn` để thử tài khoản bị khóa). Không seed khi `NODE_ENV=production`.

Module `creators` là **module mẫu end-to-end** thể hiện đủ các layer; các module tiếp theo copy đúng cấu trúc này.

## Lộ trình module (theo SRS Epic)

- [x] E0 — Base structure + discovery skeleton (creators)
- [~] E1 Identity & Profiles — **đã có**: register/login/refresh/logout/me, RBAC, khóa tài khoản, onboarding hồ sơ creator + admin review queue (CRE-001..010); **còn lại**: xác minh email/OTP (AUTH-002), quên mật khẩu (AUTH-004), 2FA admin (AUTH-008), onboarding hồ sơ brand
- [ ] E2 Catalog & Discovery — package, portfolio, search/filter đầy đủ
- [ ] E3 Booking Core — brief, snapshot, state machine, chat, notification
- [ ] E4 Fulfillment — submission, revision, approval
- [ ] E5 Payment & Finance — payment, ledger, refund, settlement
- [ ] E6 Trust & Operations — review, dispute, moderation, admin
- [ ] E7 Hardening — security, performance, observability

Khi thêm module mới phía server: tạo `src/modules/<tên>/` theo cấu trúc trên rồi mount 1 dòng trong [`routes/v1.ts`](server/src/routes/v1.ts). Khi cần PostgreSQL: viết `*.repository.postgres.ts` implement cùng interface, đổi composition ở [`index.ts`](server/src/index.ts).
