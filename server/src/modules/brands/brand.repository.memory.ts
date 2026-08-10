import { randomUUID } from 'node:crypto';
import type { BrandRepository } from './brand.repository.js';
import type { Brand, BrandStatus, BrandVerificationDoc } from './brand.types.js';

/** In-memory implementation — bản ghi immutable, luôn trả bản copy. */
export class InMemoryBrandRepository implements BrandRepository {
  private readonly brandsById = new Map<string, Brand>();

  constructor(seed: readonly Brand[] = []) {
    for (const brand of seed) {
      this.brandsById.set(brand.id, brand);
    }
  }

  findById(id: string): Promise<Brand | null> {
    return Promise.resolve(this.brandsById.get(id) ?? null);
  }

  findByUserId(userId: string): Promise<Brand | null> {
    const found = [...this.brandsById.values()].find((brand) => brand.userId === userId);
    return Promise.resolve(found ?? null);
  }

  create(input: Brand): Promise<Brand> {
    const brand: Brand = { ...input, id: `brd_${randomUUID().replaceAll('-', '')}` };
    this.brandsById.set(brand.id, brand);
    return Promise.resolve(brand);
  }

  update(id: string, input: Brand): Promise<Brand | null> {
    if (!this.brandsById.has(id)) {
      return Promise.resolve(null);
    }
    const updated: Brand = { ...input, id };
    this.brandsById.set(id, updated);
    return Promise.resolve(updated);
  }

  findByStatus(statuses: readonly BrandStatus[]): Promise<readonly Brand[]> {
    const matched = [...this.brandsById.values()]
      .filter((brand) => statuses.includes(brand.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return Promise.resolve(matched);
  }

  addVerificationDoc(brandId: string, doc: BrandVerificationDoc): Promise<Brand | null> {
    const existing = this.brandsById.get(brandId);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated: Brand = {
      ...existing,
      verificationDocs: [...existing.verificationDocs, doc],
    };
    this.brandsById.set(brandId, updated);
    return Promise.resolve(updated);
  }
}
