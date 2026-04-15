import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * CustomersRepository — data-access layer for the customers module.
 *
 * All Prisma calls go through this class so services contain only business
 * logic and can be unit-tested by mocking this repository.
 */
@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFirst(args: Prisma.customersFindFirstArgs) {
    return this.prisma.customers.findFirst(args);
  }

  findMany(args: Prisma.customersFindManyArgs) {
    return this.prisma.customers.findMany(args);
  }

  count(args: Prisma.customersCountArgs) {
    return this.prisma.customers.count(args);
  }

  create(args: Prisma.customersCreateArgs) {
    return this.prisma.customers.create(args);
  }

  update(args: Prisma.customersUpdateArgs) {
    return this.prisma.customers.update(args);
  }

  delete(args: Prisma.customersDeleteArgs) {
    return this.prisma.customers.delete(args);
  }

  findUnique(args: Prisma.customersFindUniqueArgs) {
    return this.prisma.customers.findUnique(args);
  }

  aggregate(args: Prisma.CustomersAggregateArgs) {
    return this.prisma.customers.aggregate(args);
  }

  groupBy(args: any) {
    return (this.prisma.customers as any).groupBy(args);
  }

  $transaction<T>(fn: (prisma: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn as any) as Promise<T>;
  }
}
