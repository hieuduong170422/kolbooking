import type pg from 'pg';
import { InMemoryAuditRepository } from '../../src/modules/audit/audit.repository.memory.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';
import { PostgresAuditRepository } from '../../src/modules/audit/audit.repository.pg.js';
import type { SessionRepository } from '../../src/modules/auth/session.repository.js';
import { InMemorySessionRepository } from '../../src/modules/auth/session.repository.memory.js';
import { PostgresSessionRepository } from '../../src/modules/auth/session.repository.pg.js';
import type { VerificationTokenRepository } from '../../src/modules/auth/verification.repository.js';
import { InMemoryVerificationTokenRepository } from '../../src/modules/auth/verification.repository.memory.js';
import { PostgresVerificationTokenRepository } from '../../src/modules/auth/verification.repository.pg.js';
import type { BookingRepository } from '../../src/modules/bookings/booking.repository.js';
import { InMemoryBookingRepository } from '../../src/modules/bookings/booking.repository.memory.js';
import { PostgresBookingRepository } from '../../src/modules/bookings/booking.repository.pg.js';
import type { BrandRepository } from '../../src/modules/brands/brand.repository.js';
import { InMemoryBrandRepository } from '../../src/modules/brands/brand.repository.memory.js';
import { PostgresBrandRepository } from '../../src/modules/brands/brand.repository.pg.js';
import type { ConversationRepository } from '../../src/modules/conversations/conversation.repository.js';
import { InMemoryConversationRepository } from '../../src/modules/conversations/conversation.repository.memory.js';
import { PostgresConversationRepository } from '../../src/modules/conversations/conversation.repository.pg.js';
import type { CreatorRepository } from '../../src/modules/creators/creator.repository.js';
import { InMemoryCreatorRepository } from '../../src/modules/creators/creator.repository.memory.js';
import { PostgresCreatorRepository } from '../../src/modules/creators/creator.repository.pg.js';
import type { FavoriteRepository } from '../../src/modules/favorites/favorite.repository.js';
import { InMemoryFavoriteRepository } from '../../src/modules/favorites/favorite.repository.memory.js';
import { PostgresFavoriteRepository } from '../../src/modules/favorites/favorite.repository.pg.js';
import type { MessageRepository } from '../../src/modules/messages/message.repository.js';
import { InMemoryMessageRepository } from '../../src/modules/messages/message.repository.memory.js';
import { PostgresMessageRepository } from '../../src/modules/messages/message.repository.pg.js';
import type { NotificationRepository } from '../../src/modules/notifications/notification.repository.js';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/notification.repository.memory.js';
import { PostgresNotificationRepository } from '../../src/modules/notifications/notification.repository.pg.js';
import type { PackageRepository } from '../../src/modules/packages/package.repository.js';
import { InMemoryPackageRepository } from '../../src/modules/packages/package.repository.memory.js';
import { PostgresPackageRepository } from '../../src/modules/packages/package.repository.pg.js';
import type { ReportRepository } from '../../src/modules/reports/report.repository.js';
import { InMemoryReportRepository } from '../../src/modules/reports/report.repository.memory.js';
import { PostgresReportRepository } from '../../src/modules/reports/report.repository.pg.js';
import type { SubmissionRepository } from '../../src/modules/submissions/submission.repository.js';
import { InMemorySubmissionRepository } from '../../src/modules/submissions/submission.repository.memory.js';
import { PostgresSubmissionRepository } from '../../src/modules/submissions/submission.repository.pg.js';
import type { UserRepository } from '../../src/modules/users/user.repository.js';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository.memory.js';
import { PostgresUserRepository } from '../../src/modules/users/user.repository.pg.js';
import { migrate } from '../../src/shared/db/migrate.js';
import { createPool } from '../../src/shared/db/pool.js';

/** Bộ repository dùng chung cho test hợp đồng — mỗi test nhận một bộ sạch. */
export interface RepositorySet {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly verificationTokens: VerificationTokenRepository;
  readonly creators: CreatorRepository;
  readonly packages: PackageRepository;
  readonly brands: BrandRepository;
  readonly bookings: BookingRepository;
  readonly conversations: ConversationRepository;
  readonly messages: MessageRepository;
  readonly submissions: SubmissionRepository;
  readonly notifications: NotificationRepository;
  readonly favorites: FavoriteRepository;
  readonly reports: ReportRepository;
  readonly audit: AuditRepository;
}

export interface RepositoryDriver {
  readonly name: string;
  readonly create: () => Promise<RepositorySet>;
}

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** Mọi bảng đều bị dọn giữa các test để chúng không phụ thuộc thứ tự chạy. */
const ALL_TABLES = [
  'users',
  'refresh_sessions',
  'verification_tokens',
  'creators',
  'packages',
  'brands',
  'bookings',
  'conversations',
  'messages',
  'submissions',
  'revision_requests',
  'notifications',
  'favorites',
  'reports',
  'audit_entries',
].join(', ');

let poolPromise: Promise<pg.Pool> | null = null;

/**
 * Vitest chạy mỗi file test trong một tiến trình riêng và chạy các file song
 * song. Dùng chung một schema thì file này TRUNCATE mất dữ liệu của file kia,
 * nên mỗi tiến trình làm việc trong schema riêng của mình.
 */
const TEST_SCHEMA = `kb_test_${process.pid}`;

const getTestPool = async (connectionString: string): Promise<pg.Pool> => {
  poolPromise ??= (async () => {
    const pool = createPool({ connectionString, max: 5, schema: TEST_SCHEMA });
    // CREATE SCHEMA không phụ thuộc search_path nên chạy được ngay cả khi
    // schema trong search_path chưa tồn tại.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${TEST_SCHEMA}`);
    await migrate(pool);
    return pool;
  })();
  return poolPromise;
};

/** Gọi trong afterAll của mỗi file test dùng driver PostgreSQL. */
export const closeTestPool = async (): Promise<void> => {
  if (poolPromise === null) {
    return;
  }
  const pool = await poolPromise;
  poolPromise = null;
  // Dọn schema tạm, nếu không database test sẽ đầy dần schema theo từng lần chạy.
  await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await pool.end();
};

const memoryDriver: RepositoryDriver = {
  name: 'in-memory',
  create: () =>
    Promise.resolve({
      users: new InMemoryUserRepository(),
      sessions: new InMemorySessionRepository(),
      verificationTokens: new InMemoryVerificationTokenRepository(),
      creators: new InMemoryCreatorRepository([]),
      packages: new InMemoryPackageRepository(),
      brands: new InMemoryBrandRepository(),
      bookings: new InMemoryBookingRepository(),
      conversations: new InMemoryConversationRepository(),
      messages: new InMemoryMessageRepository(),
      submissions: new InMemorySubmissionRepository(),
      notifications: new InMemoryNotificationRepository(),
      favorites: new InMemoryFavoriteRepository(),
      reports: new InMemoryReportRepository(),
      audit: new InMemoryAuditRepository(),
    }),
};

const postgresDriver = (connectionString: string): RepositoryDriver => ({
  name: 'postgres',
  create: async () => {
    const pool = await getTestPool(connectionString);
    await pool.query(`TRUNCATE ${ALL_TABLES} RESTART IDENTITY`);
    return {
      users: new PostgresUserRepository(pool),
      sessions: new PostgresSessionRepository(pool),
      verificationTokens: new PostgresVerificationTokenRepository(pool),
      creators: new PostgresCreatorRepository(pool),
      packages: new PostgresPackageRepository(pool),
      brands: new PostgresBrandRepository(pool),
      bookings: new PostgresBookingRepository(pool),
      conversations: new PostgresConversationRepository(pool),
      messages: new PostgresMessageRepository(pool),
      submissions: new PostgresSubmissionRepository(pool),
      notifications: new PostgresNotificationRepository(pool),
      favorites: new PostgresFavoriteRepository(pool),
      reports: new PostgresReportRepository(pool),
      audit: new PostgresAuditRepository(pool),
    };
  },
});

/**
 * Driver được kiểm thử. Bản in-memory luôn chạy; bản PostgreSQL chỉ chạy khi
 * có TEST_DATABASE_URL, để `npm test` trên máy chưa dựng database vẫn xanh.
 * Cùng một bộ assertion chạy cho cả hai — đó là điều bảo đảm hai tầng lưu trữ
 * hành xử giống nhau.
 */
export const REPOSITORY_DRIVERS: readonly RepositoryDriver[] = TEST_DATABASE_URL
  ? [memoryDriver, postgresDriver(TEST_DATABASE_URL)]
  : [memoryDriver];

export const HAS_POSTGRES_DRIVER = TEST_DATABASE_URL !== undefined;
