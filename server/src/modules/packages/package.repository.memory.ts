import { randomUUID } from 'node:crypto';
import type { PackageRepository } from './package.repository.js';
import type {
  PackageAdminFilter,
  PackageListFilter,
  PackageListResult,
  ServicePackage,
} from './package.types.js';

/** In-memory implementation — bản ghi immutable, luôn trả bản copy. */
export class InMemoryPackageRepository implements PackageRepository {
  private readonly packagesById = new Map<string, ServicePackage>();

  constructor(seed: readonly ServicePackage[] = []) {
    for (const pkg of seed) {
      this.packagesById.set(pkg.id, pkg);
    }
  }

  findPublishedByCreator(filter: PackageListFilter): Promise<PackageListResult> {
    const matched = [...this.packagesById.values()]
      .filter((pkg) => pkg.creatorId === filter.creatorId && pkg.status === 'published')
      .sort((a, b) => a.priceVnd - b.priceVnd);
    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    });
  }

  findAllByCreator(creatorId: string): Promise<readonly ServicePackage[]> {
    const matched = [...this.packagesById.values()]
      .filter((pkg) => pkg.creatorId === creatorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.resolve(matched);
  }

  findAllForAdmin(filter: PackageAdminFilter): Promise<PackageListResult> {
    const matched = [...this.packagesById.values()]
      .filter((pkg) => (filter.status ? pkg.status === filter.status : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    });
  }

  findById(id: string): Promise<ServicePackage | null> {
    return Promise.resolve(this.packagesById.get(id) ?? null);
  }

  create(input: ServicePackage): Promise<ServicePackage> {
    const pkg: ServicePackage = { ...input, id: `pkg_${randomUUID().replaceAll('-', '')}` };
    this.packagesById.set(pkg.id, pkg);
    return Promise.resolve(pkg);
  }

  update(id: string, input: ServicePackage): Promise<ServicePackage | null> {
    if (!this.packagesById.has(id)) {
      return Promise.resolve(null);
    }
    const updated: ServicePackage = { ...input, id };
    this.packagesById.set(id, updated);
    return Promise.resolve(updated);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.packagesById.delete(id));
  }
}
