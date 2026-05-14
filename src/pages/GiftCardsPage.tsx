import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Gift,
  Plus,
  Search,
  QrCode,
  Printer,
  Ban,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import { giftCardService, GiftCard, CreateGiftCardData } from '@/services/giftCardService';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border border-green-200',
  REDEEMED: 'bg-gray-100 text-gray-600 border border-gray-200',
  EXPIRED: 'bg-red-100 text-red-700 border border-red-200',
  CANCELLED: 'bg-orange-100 text-orange-700 border border-orange-200',
};

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [form, setForm] = useState<CreateGiftCardData>({
    initialBalance: 50,
    recipientName: '',
    recipientEmail: '',
    purchasedBy: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await giftCardService.getAll(statusFilter || undefined);
      setCards(data);
    } catch {
      toast.error('Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.initialBalance || form.initialBalance <= 0) {
      toast.error('Please enter a valid initial balance');
      return;
    }
    try {
      setCreating(true);
      const card = await giftCardService.create(form);
      setCards(prev => [card, ...prev]);
      setShowCreate(false);
      setForm({ initialBalance: 50, recipientName: '', recipientEmail: '', purchasedBy: '', notes: '' });
      toast.success(`Gift card ${card.code} created!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create gift card');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (card: GiftCard) => {
    if (!confirm(`Cancel gift card ${card.code}? This cannot be undone.`)) return;
    try {
      setCancelling(true);
      await giftCardService.cancel(card.id);
      await loadCards();
      setShowDetail(false);
      toast.success(`Gift card ${card.code} cancelled`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel gift card');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = (card: GiftCard) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gift Card - ${card.code}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
          .card { border: 3px solid #6d28d9; border-radius: 16px; padding: 30px; max-width: 340px; margin: 0 auto; }
          .logo { font-size: 24px; font-weight: bold; color: #6d28d9; margin-bottom: 8px; }
          .title { font-size: 18px; color: #374151; margin-bottom: 20px; }
          .code { font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1f2937; background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 16px 0; }
          .balance { font-size: 36px; font-weight: bold; color: #6d28d9; margin: 16px 0; }
          .detail { font-size: 13px; color: #6b7280; margin: 4px 0; }
          .footer { font-size: 11px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">MPS Jewellery</div>
          <div class="title">🎁 Gift Card</div>
          <div class="code">${card.code}</div>
          <div class="balance">£${card.initialBalance.toFixed(2)}</div>
          ${card.recipientName ? `<div class="detail">For: ${card.recipientName}</div>` : ''}
          ${card.expiresAt ? `<div class="detail">Valid until: ${new Date(card.expiresAt).toLocaleDateString('en-GB')}</div>` : '<div class="detail">No expiry date</div>'}
          <div class="footer">Present this card in-store to redeem. Balance enquiries available at any time.</div>
        </div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const filtered = cards.filter(c =>
    search
      ? c.code.toLowerCase().includes(search.toLowerCase()) ||
        (c.recipientName?.toLowerCase().includes(search.toLowerCase())) ||
        (c.purchasedBy?.toLowerCase().includes(search.toLowerCase()))
      : true,
  );

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Gift className="text-purple-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gift Cards</h1>
              <p className="text-sm text-gray-500">Issue, manage, and track gift cards</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
            Issue Gift Card
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active', count: cards.filter(c => c.status === 'ACTIVE').length, color: 'green' },
            { label: 'Total Value', count: `£${cards.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + c.balance, 0).toFixed(2)}`, color: 'purple' },
            { label: 'Redeemed', count: cards.filter(c => c.status === 'REDEEMED').length, color: 'gray' },
            { label: 'Total Issued', count: cards.length, color: 'blue' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-2xl font-bold text-${color}-600`}>{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  className="pl-9"
                  placeholder="Search by code, recipient..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {['', 'ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED'].map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? 'bg-purple-600 hover:bg-purple-700' : ''}
                  >
                    {s || 'All'}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={loadCards}>
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-700">Gift Cards ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Gift size={40} className="mx-auto mb-3 opacity-30" />
                <p>No gift cards found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Code</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Initial</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(card => (
                    <TableRow key={card.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QrCode size={14} className="text-gray-400" />
                          <span className="font-mono font-semibold text-sm">{card.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {card.recipientName || '—'}
                      </TableCell>
                      <TableCell className="font-medium">£{card.initialBalance.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${card.balance < card.initialBalance * 0.25 ? 'text-red-500' : 'text-green-600'}`}>
                          £{card.balance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[card.status]} text-xs`}>
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {card.expiresAt
                          ? new Date(card.expiresAt).toLocaleDateString('en-GB')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedCard(card); setShowDetail(true); }}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrint(card)}
                          >
                            <Printer size={14} />
                          </Button>
                          {card.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleCancel(card)}
                              disabled={cancelling}
                            >
                              <Ban size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift size={20} className="text-purple-600" />
              Issue New Gift Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="balance">Initial Balance (£) *</Label>
              <Input
                id="balance"
                type="number"
                min="0.01"
                step="0.01"
                value={form.initialBalance}
                onChange={e => setForm(f => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Recipient Name', key: 'recipientName', placeholder: 'Jane Smith' },
                { label: 'Recipient Email', key: 'recipientEmail', placeholder: 'jane@example.com' },
                { label: 'Purchased By', key: 'purchasedBy', placeholder: 'John Doe' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="col-span-2 sm:col-span-1">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    placeholder={placeholder}
                    value={(form as any)[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={form.expiresAt ? form.expiresAt.split('T')[0] : ''}
                  onChange={e =>
                    setForm(f => ({ ...f, expiresAt: e.target.value ? `${e.target.value}T23:59:59Z` : undefined }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Birthday gift, anniversary..."
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
              {creating ? 'Creating...' : 'Issue Gift Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedCard && (
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift size={20} className="text-purple-600" />
                Gift Card — {selectedCard.code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-600 font-medium">Balance</p>
                  <p className="text-3xl font-bold text-purple-700">£{selectedCard.balance.toFixed(2)}</p>
                  <p className="text-xs text-purple-500">of £{selectedCard.initialBalance.toFixed(2)} original</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge className={`${statusColors[selectedCard.status]} text-xs`}>{selectedCard.status}</Badge>
                  </div>
                  {selectedCard.recipientName && (
                    <div><span className="text-sm text-gray-500">Recipient: </span><span className="text-sm font-medium">{selectedCard.recipientName}</span></div>
                  )}
                  {selectedCard.purchasedBy && (
                    <div><span className="text-sm text-gray-500">Purchased by: </span><span className="text-sm">{selectedCard.purchasedBy}</span></div>
                  )}
                  {selectedCard.expiresAt && (
                    <div><span className="text-sm text-gray-500">Expires: </span><span className="text-sm">{new Date(selectedCard.expiresAt).toLocaleDateString('en-GB')}</span></div>
                  )}
                </div>
              </div>

              {selectedCard.transactions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Transaction History</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedCard.transactions.map(t => (
                      <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
                        <div>
                          <span className={`font-medium ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {t.amount < 0 ? '-' : '+'}£{Math.abs(t.amount).toFixed(2)}
                          </span>
                          <span className="text-gray-500 ml-2">{t.type}</span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(t.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              {selectedCard.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancel(selectedCard)}
                  disabled={cancelling}
                >
                  <Ban size={14} className="mr-1" />
                  Cancel Card
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handlePrint(selectedCard)}>
                <Printer size={14} className="mr-1" />
                Print
              </Button>
              <Button size="sm" onClick={() => setShowDetail(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
