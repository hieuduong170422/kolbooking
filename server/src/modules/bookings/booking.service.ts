import { randomBytes } from 'node:crypto';
import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { PackageRepository } from '../packages/package.repository.js';
import type { PackageAddOn, ServicePackage } from '../packages/package.types.js';
import {
  earliestDeadlineDay,
  effectiveTurnaroundDays,
  formatDayVi,
  isDeadlineTooEarly,
} from './booking.deadline.js';
import { calculateTotals, generateBookingCode } from './booking.pricing.js';
import type { BookingRepository } from './booking.repository.js';
import {
  resolveTransition,
  type BookingAction,
  type BookingActorRole,
} from './booking.state-machine.js';
import type {
  Booking,
  BookingBrief,
  BookingListFilter,
  BookingSnapshot,
  CreateBookingInput,
} from './booking.types.js';

const HOUR_MS = 60 * 60 * 1000;

export interface BookingListPage {
  readonly items: readonly Booking[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/** Danh tính người gọi — dùng để phân quyền object-level (SEC-003). */
export interface BookingActor {
  readonly userId: string;
  readonly role: BookingActorRole;
  /** creatorId hồ sơ, chỉ có khi role = creator. */
  readonly creatorId?: string | undefined;
}

/**
 * Business rules booking (BKG-001..BKG-011, BR-003..BR-005).
 *
 * Nguyên tắc: mọi chuyển trạng thái đều đi qua transition table; tiền tính
 * ở server; điều khoản khóa thành snapshot bất biến khi creator đồng ý;
 * mỗi thay đổi ghi một mốc timeline để hai bên và admin cùng đọc được.
 */
export class BookingService {
  private readonly bookings: BookingRepository;
  private readonly packages: PackageRepository;
  private readonly creators: CreatorRepository;
  private readonly audit: AuditRepository;
  /** Tùy chọn: thiếu kênh thông báo thì booking vẫn phải chạy đúng. */
  private readonly notifications: NotificationService | undefined;

  constructor(
    bookings: BookingRepository,
    packages: PackageRepository,
    creators: CreatorRepository,
    audit: AuditRepository,
    notifications?: NotificationService,
  ) {
    this.bookings = bookings;
    this.packages = packages;
    this.creators = creators;
    this.audit = audit;
    this.notifications = notifications;
  }

  /** Tạo booking nháp từ package đang bán (BKG-001, BKG-002). */
  async create(input: CreateBookingInput): Promise<Booking> {
    const pkg = await this.packages.findById(input.packageId);
    if (!pkg || pkg.status !== 'published') {
      throw ApiError.notFound('Không tìm thấy gói dịch vụ đang bán này.');
    }
    if (pkg.creatorId !== input.creatorId) {
      throw ApiError.badRequest('Gói dịch vụ không thuộc creator được chọn.');
    }

    const creator = await this.creators.findById(input.creatorId);
    if (!creator || creator.status !== 'verified') {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    if (creator.availability.isPaused) {
      throw ApiError.conflict('Creator đang tạm dừng nhận booking mới.');
    }

    const selectedAddOns = this.resolveAddOns(pkg, input.selectedAddOnIds);
    const totals = calculateTotals(pkg.priceVnd, selectedAddOns);
    const now = new Date();
    const nowIso = now.toISOString();

    this.assertDeadlineFeasible(input.brief.desiredDeadline, pkg, selectedAddOns, now);

    const created = await this.bookings.create({
      id: '', // repository sinh bkg_ + uuid
      code: generateBookingCode(now, randomBytes(4)),
      brandUserId: input.brandUserId,
      creatorId: input.creatorId,
      creatorUserId: creator.userId,
      packageId: pkg.id,
      status: 'draft',
      brief: { ...input.brief, version: 1 },
      selectedAddOnIds: input.selectedAddOnIds,
      totals,
      snapshot: null,
      statusReason: null,
      expiresAt: null,
      timeline: [
        {
          at: nowIso,
          actorUserId: input.brandUserId,
          action: 'create',
          fromStatus: null,
          toStatus: 'draft',
          note: null,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return created;
  }

  /** Sửa brief khi còn nháp — mỗi lần sửa tăng version (BKG-002). */
  async updateBrief(
    actor: BookingActor,
    bookingId: string,
    brief: Omit<BookingBrief, 'version'>,
  ): Promise<Booking> {
    const booking = await this.requireAccess(actor, bookingId);
    if (actor.role !== 'brand') {
      throw ApiError.forbidden('Chỉ brand tạo booking mới sửa được brief.');
    }
    if (booking.status !== 'draft') {
      throw ApiError.conflict('Chỉ sửa được brief khi booking còn ở trạng thái nháp.');
    }

    // Sửa brief cũng phải qua cùng một cửa kiểm deadline như lúc tạo —
    // nếu không thì đây là đường vòng để đặt deadline quá khứ.
    const pkg = await this.packages.findById(booking.packageId);
    if (pkg) {
      const selectedAddOns = this.resolveAddOns(pkg, booking.selectedAddOnIds);
      this.assertDeadlineFeasible(brief.desiredDeadline, pkg, selectedAddOns, new Date());
    }

    return this.persist({
      ...booking,
      brief: { ...brief, version: booking.brief.version + 1 },
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Deadline phải đủ chỗ cho thời gian sản xuất (BKG-002). Client đã chặn
   * bằng `min` của input date, nhưng đó chỉ là gợi ý của trình duyệt — gọi
   * thẳng API vẫn tạo được booking với deadline quá khứ nếu server không kiểm.
   */
  private assertDeadlineFeasible(
    desiredDeadline: string,
    pkg: ServicePackage,
    selectedAddOns: readonly PackageAddOn[],
    now: Date,
  ): void {
    const turnaround = effectiveTurnaroundDays(pkg.turnaroundDays, selectedAddOns);
    if (!isDeadlineTooEarly(desiredDeadline, turnaround, now)) {
      return;
    }
    const earliest = formatDayVi(earliestDeadlineDay(turnaround, now));
    throw ApiError.badRequest(
      `Deadline quá sớm: gói này cần ${turnaround} ngày sản xuất, sớm nhất là ${earliest}.`,
      [{ field: 'brief.desiredDeadline', message: `Chọn từ ngày ${earliest} trở đi.` }],
    );
  }

  /**
   * Thực hiện một transition (SRS §9.2). Mọi thay đổi trạng thái — kể cả
   * của admin — đều đi qua đây để không có đường tắt bỏ qua precondition.
   */
  async transition(
    actor: BookingActor,
    bookingId: string,
    action: BookingAction,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.requireAccess(actor, bookingId);
    const rule = resolveTransition(action, booking.status, actor.role, reason);

    const now = new Date();
    const nowIso = now.toISOString();
    const normalizedReason = reason?.trim() ?? null;

    // Creator đồng ý → khóa điều khoản thành snapshot bất biến (BKG-006, BR-003).
    const snapshot =
      action === 'accept' ? await this.buildSnapshot(booking, nowIso) : booking.snapshot;

    const updated = await this.persist({
      ...booking,
      status: rule.to,
      statusReason: normalizedReason,
      snapshot,
      expiresAt:
        rule.expiresInHours === null
          ? null
          : new Date(now.getTime() + rule.expiresInHours * HOUR_MS).toISOString(),
      timeline: [
        ...booking.timeline,
        {
          at: nowIso,
          actorUserId: actor.role === 'system' ? null : actor.userId,
          action,
          fromStatus: booking.status,
          toStatus: rule.to,
          note: normalizedReason,
        },
      ],
      updatedAt: nowIso,
    });

    // Audit MỌI chuyển trạng thái, không riêng thao tác của admin. Timeline
    // nằm trong chính booking nên nó chỉ trả lời "booking này đã đi qua đâu";
    // khi phân xử, admin cần tra chéo theo actor/thời điểm trên toàn hệ thống
    // và cần một bản ghi append-only tách khỏi dữ liệu có thể bị sửa.
    await this.audit.create({
      actorId: actor.userId,
      action: `booking.${action}`,
      targetType: 'booking',
      targetId: bookingId,
      before: booking.status,
      after: updated.status,
      reason: normalizedReason,
    });

    // Báo cho phía còn lại biết booking đổi trạng thái (NTF-001).
    await this.notifyStatusChange(updated, actor.userId);

    return updated;
  }

  /** Scheduler quét booking quá hạn phản hồi/thanh toán (BKG-005, BR-005). */
  async expireOverdue(now: Date = new Date()): Promise<number> {
    const overdue = await this.bookings.findExpired(now.toISOString());
    for (const booking of overdue) {
      await this.transition(
        { userId: 'system', role: 'system' },
        booking.id,
        'expire',
      );
    }
    return overdue.length;
  }

  private async notifyStatusChange(booking: Booking, actorUserId: string): Promise<void> {
    if (this.notifications === undefined) return;
    const recipients = [booking.brandUserId, booking.creatorUserId].filter(
      (userId): userId is string => userId !== null && userId !== actorUserId,
    );
    await this.notifications.notifyMany(recipients, {
      type: 'booking_status',
      title: `Booking ${booking.code}: ${booking.status}`,
      body: booking.statusReason ?? 'Booking vừa chuyển trạng thái, xem việc cần làm tiếp.',
      link: `/bookings/${booking.id}`,
    });
  }

  async getById(actor: BookingActor, bookingId: string): Promise<Booking> {
    return this.requireAccess(actor, bookingId);
  }

  /** Danh sách theo vai: brand thấy booking của mình, creator thấy của mình. */
  async list(actor: BookingActor, filter: BookingListFilter): Promise<BookingListPage> {
    const result =
      actor.role === 'admin'
        ? await this.bookings.findAll(filter)
        : actor.role === 'creator'
          ? await this.bookings.findByCreator(actor.creatorId ?? '', filter)
          : await this.bookings.findByBrand(actor.userId, filter);

    return { items: result.items, total: result.total, page: filter.page, limit: filter.limit };
  }

  /**
   * Object-level authorization (SEC-003, AC-09): chỉ hai bên tham gia và
   * admin đọc được booking. Người ngoài nhận 404 chứ không phải 403 —
   * không tiết lộ booking đó có tồn tại hay không.
   */
  private async requireAccess(actor: BookingActor, bookingId: string): Promise<Booking> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Không tìm thấy booking này.');
    }
    if (actor.role === 'admin' || actor.role === 'system') {
      return booking;
    }
    const isBrand = booking.brandUserId === actor.userId;
    const isCreator = actor.creatorId !== undefined && booking.creatorId === actor.creatorId;
    if (!isBrand && !isCreator) {
      throw ApiError.notFound('Không tìm thấy booking này.');
    }
    return booking;
  }

  /** Khóa điều khoản theo package tại thời điểm đồng ý — đọc lại từ nguồn. */
  private async buildSnapshot(booking: Booking, lockedAt: string): Promise<BookingSnapshot> {
    const pkg = await this.packages.findById(booking.packageId);
    if (!pkg) {
      throw ApiError.conflict('Gói dịch vụ không còn tồn tại, không thể chốt booking.');
    }
    const selectedAddOns = this.resolveAddOns(pkg, booking.selectedAddOnIds);
    return {
      packageId: pkg.id,
      packageVersion: pkg.version,
      packageName: pkg.name,
      platforms: pkg.platforms,
      deliverables: pkg.deliverables,
      usageRights: pkg.usageRights,
      // Điều khoản chốt phải ghi thời gian đã mua, không phải thời gian niêm
      // yết của gói — brand trả tiền add-on giao nhanh thì snapshot phải nói thế.
      turnaroundDays: effectiveTurnaroundDays(pkg.turnaroundDays, selectedAddOns),
      revisionsIncluded: pkg.revisionsIncluded,
      selectedAddOns,
      // Tính lại tại thời điểm chốt — giá package có thể đã đổi từ lúc tạo nháp.
      totals: calculateTotals(pkg.priceVnd, selectedAddOns),
      brief: booking.brief,
      lockedAt,
    };
  }

  private resolveAddOns(
    pkg: ServicePackage,
    selectedIds: readonly string[],
  ): readonly PackageAddOn[] {
    return selectedIds.map((id) => {
      const addOn = pkg.addOns.find((item) => item.id === id);
      if (!addOn) {
        throw ApiError.badRequest(`Add-on ${id} không thuộc gói dịch vụ này.`);
      }
      return addOn;
    });
  }

  private async persist(next: Booking): Promise<Booking> {
    const updated = await this.bookings.update(next.id, next);
    if (!updated) {
      throw ApiError.internal('Không tìm thấy booking để cập nhật.');
    }
    return updated;
  }
}
