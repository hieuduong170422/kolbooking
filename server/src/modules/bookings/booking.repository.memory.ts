import { randomUUID } from 'node:crypto';
import type { BookingRepository } from './booking.repository.js';
import type { Booking, BookingListFilter, BookingListResult } from './booking.types.js';

/** Trạng thái còn "sống" — chỉ những trạng thái này mới bị hết hạn. */
const EXPIRABLE_STATUSES = new Set(['pending_creator', 'awaiting_payment']);

/** In-memory implementation — bản ghi immutable, luôn trả bản copy. */
export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookingsById = new Map<string, Booking>();

  constructor(seed: readonly Booking[] = []) {
    for (const booking of seed) {
      this.bookingsById.set(booking.id, booking);
    }
  }

  create(input: Booking): Promise<Booking> {
    const booking: Booking = { ...input, id: `bkg_${randomUUID().replaceAll('-', '')}` };
    this.bookingsById.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  findById(id: string): Promise<Booking | null> {
    return Promise.resolve(this.bookingsById.get(id) ?? null);
  }

  findByCode(code: string): Promise<Booking | null> {
    const found = [...this.bookingsById.values()].find((booking) => booking.code === code);
    return Promise.resolve(found ?? null);
  }

  update(id: string, input: Booking): Promise<Booking | null> {
    if (!this.bookingsById.has(id)) {
      return Promise.resolve(null);
    }
    const updated: Booking = { ...input, id };
    this.bookingsById.set(id, updated);
    return Promise.resolve(updated);
  }

  findByBrand(brandUserId: string, filter: BookingListFilter): Promise<BookingListResult> {
    return Promise.resolve(
      this.paginate(
        (booking) => booking.brandUserId === brandUserId,
        filter,
      ),
    );
  }

  findByCreator(creatorId: string, filter: BookingListFilter): Promise<BookingListResult> {
    return Promise.resolve(
      this.paginate((booking) => booking.creatorId === creatorId, filter),
    );
  }

  findAll(filter: BookingListFilter): Promise<BookingListResult> {
    return Promise.resolve(this.paginate(() => true, filter));
  }

  findExpired(now: string): Promise<readonly Booking[]> {
    const matched = [...this.bookingsById.values()].filter(
      (booking) =>
        EXPIRABLE_STATUSES.has(booking.status) &&
        booking.expiresAt !== null &&
        booking.expiresAt <= now,
    );
    return Promise.resolve(matched);
  }

  private paginate(
    predicate: (booking: Booking) => boolean,
    filter: BookingListFilter,
  ): BookingListResult {
    const matched = [...this.bookingsById.values()]
      .filter((booking) => predicate(booking) && (filter.status ? booking.status === filter.status : true))
      // Mới cập nhật lên đầu — người dùng quan tâm booking vừa có thay đổi.
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const start = (filter.page - 1) * filter.limit;
    return {
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    };
  }
}
