import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { generateId } from '../../shared/utils/id-generator';
import { CreateGiftCardDto, RedeemGiftCardDto } from './dto/gift-card.dto';

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GC-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGiftCardDto, tenantId: string, userId: string) {
    let code: string;
    let attempts = 0;
    do {
      code = generateGiftCardCode();
      const existing = await this.prisma.gift_cards.findUnique({
        where: { code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const card = await this.prisma.gift_cards.create({
      data: {
        id: generateId(),
        tenantId,
        code,
        initialBalance: dto.initialBalance,
        balance: dto.initialBalance,
        status: 'ACTIVE',
        recipientName: dto.recipientName,
        recipientEmail: dto.recipientEmail,
        purchasedBy: dto.purchasedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { transactions: true },
    });

    await this.prisma.gift_card_transactions.create({
      data: {
        id: generateId(),
        giftCardId: card.id,
        amount: dto.initialBalance,
        type: 'ISSUED',
        performedBy: userId,
      },
    });

    this.logger.log(
      `Gift card ${code} created with balance £${dto.initialBalance}`,
    );
    return this.mapToResponse(card);
  }

  async findAll(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;

    const cards = await this.prisma.gift_cards.findMany({
      where,
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return cards.map((c) => this.mapToResponse(c));
  }

  async findByCode(code: string, tenantId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { code, tenantId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    if (!card) throw new NotFoundException('Gift card not found');
    return this.mapToResponse(card);
  }

  async findById(id: string, tenantId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { id, tenantId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    if (!card) throw new NotFoundException('Gift card not found');
    return this.mapToResponse(card);
  }

  async validate(code: string, tenantId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { code, tenantId },
    });

    if (!card) {
      return { valid: false, reason: 'Gift card not found' };
    }
    if (card.status !== 'ACTIVE') {
      return {
        valid: false,
        reason: `Gift card is ${card.status.toLowerCase()}`,
      };
    }
    if (card.expiresAt && new Date() > card.expiresAt) {
      await this.prisma.gift_cards.update({
        where: { id: card.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, reason: 'Gift card has expired' };
    }
    return {
      valid: true,
      balance: Number(card.balance),
      code: card.code,
      id: card.id,
      recipientName: card.recipientName,
    };
  }

  async redeem(dto: RedeemGiftCardDto, tenantId: string, userId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { code: dto.code, tenantId },
    });

    if (!card) throw new NotFoundException('Gift card not found');
    if (card.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Gift card is ${card.status.toLowerCase()}`,
      );
    }
    if (card.expiresAt && new Date() > card.expiresAt) {
      await this.prisma.gift_cards.update({
        where: { id: card.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Gift card has expired');
    }
    if (Number(card.balance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: £${Number(card.balance).toFixed(2)}`,
      );
    }

    const newBalance = Number(card.balance) - dto.amount;
    const newStatus = newBalance <= 0 ? 'REDEEMED' : 'ACTIVE';

    const [updated] = await this.prisma.$transaction([
      this.prisma.gift_cards.update({
        where: { id: card.id },
        data: { balance: newBalance, status: newStatus },
        include: { transactions: { orderBy: { createdAt: 'desc' } } },
      }),
      this.prisma.gift_card_transactions.create({
        data: {
          id: generateId(),
          giftCardId: card.id,
          amount: -dto.amount,
          type: 'REDEMPTION',
          reference: dto.reference,
          performedBy: userId,
        },
      }),
    ]);

    this.logger.log(
      `Gift card ${dto.code} redeemed £${dto.amount}, remaining: £${newBalance}`,
    );
    return {
      success: true,
      amountRedeemed: dto.amount,
      remainingBalance: newBalance,
      card: this.mapToResponse(updated),
    };
  }

  async cancel(id: string, tenantId: string, userId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { id, tenantId },
    });
    if (!card) throw new NotFoundException('Gift card not found');
    if (card.status === 'REDEEMED') {
      throw new BadRequestException('Cannot cancel a fully redeemed gift card');
    }

    const updated = await this.prisma.gift_cards.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    await this.prisma.gift_card_transactions.create({
      data: {
        id: generateId(),
        giftCardId: id,
        amount: 0,
        type: 'CANCELLED',
        performedBy: userId,
      },
    });

    return this.mapToResponse(updated);
  }

  async hardDelete(id: string, tenantId: string) {
    const card = await this.prisma.gift_cards.findFirst({
      where: { id, tenantId },
    });
    if (!card) throw new NotFoundException('Gift card not found');

    await this.prisma.$transaction([
      this.prisma.gift_card_transactions.deleteMany({ where: { giftCardId: id } }),
      this.prisma.gift_cards.delete({ where: { id } }),
    ]);

    this.logger.log(`Gift card ${card.code} permanently deleted`);
    return { success: true };
  }

  private mapToResponse(card: any) {
    return {
      id: card.id,
      code: card.code,
      initialBalance: Number(card.initialBalance),
      balance: Number(card.balance),
      status: card.status,
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      purchasedBy: card.purchasedBy,
      expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
      notes: card.notes,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      transactions: (card.transactions || []).map((t: any) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        reference: t.reference,
        performedBy: t.performedBy,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}
