/**
 * Schema PostgreSQL — nhúng thẳng trong TypeScript (không phải file .sql rời)
 * vì `tsc` chỉ biên dịch .ts sang dist/: file .sql sẽ không được sao chép và
 * bản build production sẽ thiếu schema lúc chạy migration.
 *
 * Quy ước:
 * - Mọi mốc thời gian lưu dạng `text` chứa chuỗi ISO-8601 UTC, đúng như domain
 *   sinh ra bằng `new Date().toISOString()`. Domain so sánh và sắp xếp thời gian
 *   bằng so sánh chuỗi (localeCompare); lưu `timestamptz` sẽ phải chuyển đổi
 *   hai chiều và có nguy cơ lệch độ chính xác micro giây so với bản in-memory.
 * - Entity có cấu trúc lồng nhau (creator, package, brand, booking) lưu nguyên
 *   bản trong cột `data jsonb`, kèm các cột phẳng phục vụ lọc/sắp xếp/index.
 *   Nguồn sự thật khi đọc luôn là `data` — cột phẳng chỉ là chỉ mục truy vấn.
 * - Toàn bộ câu lệnh idempotent (IF NOT EXISTS) để chạy lại mỗi lần khởi động.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL,
  status text NOT NULL,
  email_verified_at text,
  consent jsonb,
  created_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at text NOT NULL,
  revoked_at text
);
CREATE INDEX IF NOT EXISTS refresh_sessions_user_idx ON refresh_sessions (user_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  expires_at text NOT NULL,
  consumed_at text,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_tokens_lookup_idx
  ON verification_tokens (user_id, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS creators (
  id text PRIMARY KEY,
  user_id text,
  display_name text NOT NULL,
  bio text NOT NULL,
  city text NOT NULL,
  niches text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  creator_type text NOT NULL,
  service_mode text NOT NULL,
  status text NOT NULL,
  price_from_vnd bigint NOT NULL DEFAULT 0,
  rating double precision NOT NULL DEFAULT 0,
  completed_bookings integer NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS creators_status_idx ON creators (status);
CREATE INDEX IF NOT EXISTS creators_user_idx ON creators (user_id);
CREATE INDEX IF NOT EXISTS creators_city_idx ON creators (lower(city));

CREATE TABLE IF NOT EXISTS packages (
  id text PRIMARY KEY,
  creator_id text NOT NULL,
  status text NOT NULL,
  price_vnd bigint NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS packages_creator_idx ON packages (creator_id, status);
CREATE INDEX IF NOT EXISTS packages_status_updated_idx ON packages (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS brands (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  status text NOT NULL,
  created_at text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS brands_user_idx ON brands (user_id);
CREATE INDEX IF NOT EXISTS brands_status_idx ON brands (status, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  brand_user_id text NOT NULL,
  creator_id text NOT NULL,
  creator_user_id text,
  package_id text NOT NULL,
  status text NOT NULL,
  expires_at text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS bookings_brand_idx ON bookings (brand_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS bookings_creator_idx ON bookings (creator_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS bookings_expiry_idx ON bookings (status, expires_at);

CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  brand_user_id text NOT NULL,
  creator_id text NOT NULL,
  creator_user_id text,
  created_at text NOT NULL,
  last_message_at text
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_key
  ON conversations (brand_user_id, creator_id);
CREATE INDEX IF NOT EXISTS conversations_creator_idx ON conversations (creator_id);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL,
  booking_id text,
  sender_user_id text NOT NULL,
  sender_role text NOT NULL,
  type text NOT NULL,
  body text NOT NULL,
  file_url text,
  file_name text,
  read_by_user_ids text[] NOT NULL DEFAULT '{}',
  off_platform_flagged boolean NOT NULL DEFAULT false,
  deleted_at text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS submissions (
  id text PRIMARY KEY,
  booking_id text NOT NULL,
  version integer NOT NULL,
  note text NOT NULL,
  items jsonb NOT NULL,
  posting_proofs jsonb NOT NULL,
  submitted_by_user_id text NOT NULL,
  created_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_booking_version_key
  ON submissions (booking_id, version);

CREATE TABLE IF NOT EXISTS revision_requests (
  id text PRIMARY KEY,
  booking_id text NOT NULL,
  submission_version integer NOT NULL,
  reason text NOT NULL,
  requested_by_user_id text NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS revision_requests_booking_idx
  ON revision_requests (booking_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text NOT NULL,
  read_at text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id text NOT NULL,
  creator_id text NOT NULL,
  created_at text NOT NULL,
  PRIMARY KEY (user_id, creator_id)
);
CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  description text NOT NULL,
  reporter_user_id text,
  status text NOT NULL,
  resolution_note text,
  created_at text NOT NULL,
  resolved_at text
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at);

CREATE TABLE IF NOT EXISTS audit_entries (
  id text PRIMARY KEY,
  seq bigserial NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  before jsonb,
  after jsonb,
  reason text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_entries_target_idx ON audit_entries (target_type, target_id, seq);
CREATE INDEX IF NOT EXISTS audit_entries_seq_idx ON audit_entries (seq DESC);
`;
