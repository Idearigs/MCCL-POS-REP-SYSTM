/**
 * Refund figures for a sale. `totalAmount` is already net of refunds, so it is
 * what the customer still has with us; adding `refundedAmount` gives the
 * original price. Never subtract `refundedAmount` from `totalAmount`.
 */
interface RefundableSale {
  status?: string;
  totalAmount?: number;
  refundedAmount?: number;
}

export const originalTotal = (sale: RefundableSale) =>
  (sale.totalAmount || 0) + (sale.refundedAmount || 0);

export const refundState = (sale: RefundableSale): 'NONE' | 'PARTIAL' | 'FULL' => {
  if (!((sale.refundedAmount || 0) > 0)) return 'NONE';
  return (sale.totalAmount || 0) <= 0.005 ? 'FULL' : 'PARTIAL';
};

/** The server refunds COMPLETED sales with something left on them. */
export const isRefundable = (sale: RefundableSale) =>
  sale.status === 'COMPLETED' && (sale.totalAmount || 0) > 0.005;
