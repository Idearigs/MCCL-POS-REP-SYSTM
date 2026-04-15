import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * RepairsRepository — data-access layer for the repairs module.
 *
 * Covers the repair-domain models (repairs, repair_status_history,
 * repair_photos) so RepairsService can be unit-tested by mocking this
 * repository instead of PrismaService.
 */
@Injectable()
export class RepairsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── repairs ─────────────────────────────────────────────────────────────────

  findFirst(args: Prisma.repairsFindFirstArgs) {
    return this.prisma.repairs.findFirst(args);
  }

  findMany(args: Prisma.repairsFindManyArgs) {
    return this.prisma.repairs.findMany(args);
  }

  count(args: Prisma.repairsCountArgs) {
    return this.prisma.repairs.count(args);
  }

  create(args: Prisma.repairsCreateArgs) {
    return this.prisma.repairs.create(args);
  }

  update(args: Prisma.repairsUpdateArgs) {
    return this.prisma.repairs.update(args);
  }

  delete(args: Prisma.repairsDeleteArgs) {
    return this.prisma.repairs.delete(args);
  }

  // ── repair_status_history ────────────────────────────────────────────────────

  createStatusHistory(args: Prisma.repair_status_historyCreateArgs) {
    return this.prisma.repair_status_history.create(args);
  }

  deleteManyStatusHistory(
    args: Prisma.repair_status_historyDeleteManyArgs,
  ) {
    return this.prisma.repair_status_history.deleteMany(args);
  }

  // ── repair_photos ────────────────────────────────────────────────────────────

  findFirstPhoto(args: Prisma.repair_photosFindFirstArgs) {
    return this.prisma.repair_photos.findFirst(args);
  }

  findManyPhotos(args: Prisma.repair_photosFindManyArgs) {
    return this.prisma.repair_photos.findMany(args);
  }

  createPhoto(args: Prisma.repair_photosCreateArgs) {
    return this.prisma.repair_photos.create(args);
  }

  deletePhoto(args: Prisma.repair_photosDeleteArgs) {
    return this.prisma.repair_photos.delete(args);
  }

  deleteManyPhotos(args: Prisma.repair_photosDeleteManyArgs) {
    return this.prisma.repair_photos.deleteMany(args);
  }

  $transaction<T>(fn: (prisma: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn as any) as Promise<T>;
  }
}
