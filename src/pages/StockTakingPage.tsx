import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Camera,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Eye,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { QRScanner } from '../components/stock-taking/QRScanner';
import { VarianceReportDialog } from '../components/stock-taking/VarianceReportDialog';
import { stockTakingService } from '../services/stockTakingService';
import { StockTakeSession, StockTakeStatus, StockTakeItem, CreateSessionDto, ScanItemDto, StockTakeItemStatus } from '../types/stock-taking';
import { useToast } from '../components/ui/use-toast';

type ViewMode = 'list' | 'session' | 'scanning';

export const StockTakingPage: React.FC = () => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [currentSession, setCurrentSession] = useState<StockTakeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StockTakeStatus | 'all'>('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isVarianceDialogOpen, setIsVarianceDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);

  // Form states
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionLocation, setNewSessionLocation] = useState('');
  const [newSessionRemarks, setNewSessionRemarks] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualNotes, setManualNotes] = useState('');
  const [approvalReason, setApprovalReason] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const data = await stockTakingService.getSessions(status);
      setSessions(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
      setSessions([]); // Ensure sessions is always an array
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast({ title: "Error", description: "Session name is required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const data: CreateSessionDto = {
        sessionName: newSessionName,
        location: newSessionLocation || undefined,
        remarks: newSessionRemarks || undefined,
      };

      const session = await stockTakingService.createSession(data);
      toast({ title: "Success", description: "Session created successfully" });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      fetchSessions();
      if (session && session.id) {
        openSession(session.id);
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewSessionName('');
    setNewSessionLocation('');
    setNewSessionRemarks('');
  };

  const openSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const session = await stockTakingService.getSession(sessionId);
      setCurrentSession(session);
      setViewMode('session');
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load session", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (code: string) => {
    if (!currentSession) return;

    try {
      const data: ScanItemDto = {
        scannedCode: code,
        scannedQuantity: 1,
      };

      const result = await stockTakingService.scanItem(currentSession.id, data);

      if (result.isDuplicate) {
        toast({ title: "Updated", description: `Updated quantity: ${result.item.scannedQuantity}` });
      } else {
        toast({ title: "Success", description: "Item scanned successfully" });
      }

      // Refresh session
      await openSession(currentSession.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to scan item", variant: "destructive" });
      console.error(error);
    }
  };

  const handleManualEntry = async () => {
    if (!currentSession || !manualCode.trim()) {
      toast({ title: "Error", description: "Code is required", variant: "destructive" });
      return;
    }

    try {
      const data: ScanItemDto = {
        scannedCode: manualCode,
        scannedQuantity: manualQuantity,
        notes: manualNotes || undefined,
      };

      const result = await stockTakingService.scanItem(currentSession.id, data);

      if (result.warning) {
        toast({ title: "Warning", description: result.warning });
      } else {
        toast({ title: "Success", description: "Item added successfully" });
      }

      setIsManualEntryOpen(false);
      setManualCode('');
      setManualQuantity(1);
      setManualNotes('');

      await openSession(currentSession.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to add item", variant: "destructive" });
      console.error(error);
    }
  };

  const completeSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      await stockTakingService.completeSession(currentSession.id);
      toast({ title: "Success", description: "Session marked as complete" });
      await openSession(currentSession.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to complete session", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approveSession = async (approve: boolean) => {
    if (!currentSession) return;

    if (!approve && !approvalReason.trim()) {
      toast({ title: "Error", description: "Rejection reason is required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await stockTakingService.approveSession(currentSession.id, {
        approve,
        rejectionReason: approve ? undefined : approvalReason,
        applyToInventory: approve,
      });

      toast({ title: "Success", description: approve ? "Session approved and inventory updated" : "Session rejected" });
      setIsApprovalDialogOpen(false);
      setApprovalReason('');
      await fetchSessions();
      setViewMode('list');
      setCurrentSession(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to process approval", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await stockTakingService.deleteSession(sessionId);
      toast({ title: "Success", description: "Session deleted" });
      fetchSessions();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to delete session", variant: "destructive" });
      console.error(error);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!currentSession || !confirm('Remove this item from the session?')) return;

    try {
      await stockTakingService.deleteItem(currentSession.id, itemId);
      toast({ title: "Success", description: "Item removed" });
      await openSession(currentSession.id);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
      console.error(error);
    }
  };

  const getStatusBadge = (status: StockTakeStatus) => {
    const statusConfig: Record<StockTakeStatus, { label: string; color: string }> = {
      [StockTakeStatus.DRAFT]: { label: 'Draft', color: 'bg-gray-500' },
      [StockTakeStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-blue-500' },
      [StockTakeStatus.COMPLETED]: { label: 'Completed', color: 'bg-purple-500' },
      [StockTakeStatus.PENDING_APPROVAL]: { label: 'Pending Approval', color: 'bg-orange-500' },
      [StockTakeStatus.APPROVED]: { label: 'Approved', color: 'bg-green-500' },
      [StockTakeStatus.REJECTED]: { label: 'Rejected', color: 'bg-red-500' },
      [StockTakeStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-gray-400' },
    };

    const config = statusConfig[status];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getItemStatusBadge = (status: StockTakeItemStatus) => {
    const statusConfig: Record<StockTakeItemStatus, { label: string; color: string; icon: any }> = {
      [StockTakeItemStatus.VERIFIED]: { label: 'Verified', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      [StockTakeItemStatus.MISSING]: { label: 'Missing', color: 'bg-red-100 text-red-800', icon: XCircle },
      [StockTakeItemStatus.UNEXPECTED]: { label: 'Unexpected', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      [StockTakeItemStatus.DAMAGED]: { label: 'Damaged', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </Badge>
    );
  };

  // List View
  const renderListView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Stock Taking</h1>
          <p className="text-gray-600 mt-1">Manage inventory stock take sessions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSessions} variant="outline">
            🔄 Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-navy hover:bg-navy/90">
            <Plus size={16} className="mr-2" />
            New Stock Take
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as StockTakeStatus | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={StockTakeStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={StockTakeStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={StockTakeStatus.PENDING_APPROVAL}>Pending Approval</SelectItem>
                <SelectItem value={StockTakeStatus.APPROVED}>Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions && sessions.length > 0 && sessions.map((session) => (
          <Card key={session.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{session.sessionName}</CardTitle>
                  {session.location && (
                    <CardDescription className="mt-1">📍 {session.location}</CardDescription>
                  )}
                </div>
                {getStatusBadge(session.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Items Scanned:</span>
                  <span className="font-semibold">{session._count?.stock_take_items || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
                {session.creator && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">By:</span>
                    <span>{session.creator.firstName} {session.creator.lastName}</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openSession(session.id)}
                  >
                    <Eye size={14} className="mr-1" />
                    View
                  </Button>
                  {(session.status === StockTakeStatus.DRAFT || session.status === StockTakeStatus.IN_PROGRESS) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!sessions || sessions.length === 0) && !loading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No stock take sessions found</p>
            <p className="text-gray-500 text-sm mt-2">Create a new session to start stock taking</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Session Detail View
  const renderSessionView = () => {
    if (!currentSession) return null;

    const canScan = currentSession.status === StockTakeStatus.DRAFT || currentSession.status === StockTakeStatus.IN_PROGRESS;
    const canComplete = currentSession.status === StockTakeStatus.IN_PROGRESS && (currentSession.stock_take_items?.length || 0) > 0;
    const canApprove = currentSession.status === StockTakeStatus.PENDING_APPROVAL || currentSession.status === StockTakeStatus.COMPLETED;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => { setViewMode('list'); setCurrentSession(null); }}>
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-navy">{currentSession.sessionName}</h1>
              <p className="text-gray-600 mt-1">
                {currentSession.location && `📍 ${currentSession.location}`}
              </p>
            </div>
          </div>
          {getStatusBadge(currentSession.status)}
        </div>

        {/* Summary Statistics */}
        {currentSession.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-navy">{currentSession.summary.totalScanned}</div>
                <div className="text-sm text-gray-600 mt-1">Total Scanned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">{currentSession.summary.verified}</div>
                <div className="text-sm text-gray-600 mt-1">Verified</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-red-600">{currentSession.summary.missing}</div>
                <div className="text-sm text-gray-600 mt-1">Missing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-orange-600">{currentSession.summary.unexpected}</div>
                <div className="text-sm text-gray-600 mt-1">Unexpected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">{currentSession.summary.damaged}</div>
                <div className="text-sm text-gray-600 mt-1">Damaged</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-3xl font-bold ${currentSession.summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentSession.summary.totalVariance > 0 && '+'}{currentSession.summary.totalVariance}
                </div>
                <div className="text-sm text-gray-600 mt-1">Variance</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{currentSession.summary.accuracy}%</div>
                <div className="text-sm text-gray-600 mt-1">Accuracy</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {canScan && (
            <>
              <Button onClick={() => setIsScannerOpen(true)} className="bg-navy hover:bg-navy/90">
                <Camera size={16} className="mr-2" />
                Scan QR/Barcode
              </Button>
              <Button variant="outline" onClick={() => setIsManualEntryOpen(true)}>
                <Edit size={16} className="mr-2" />
                Manual Entry
              </Button>
            </>
          )}
          {canComplete && (
            <Button onClick={completeSession} className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle size={16} className="mr-2" />
              Mark Complete
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => setIsVarianceDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle size={16} className="mr-2" />
              Review & Approve
            </Button>
          )}
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scanned Items ({currentSession.stock_take_items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {currentSession.stock_take_items && currentSession.stock_take_items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Code</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Expected</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Scanned</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Variance</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Scanned By</th>
                      {canScan && <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentSession.stock_take_items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{item.productName || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.productSku || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.scannedCode}</td>
                        <td className="px-4 py-3 text-sm text-center">{item.expectedQuantity ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold">{item.scannedQuantity}</td>
                        <td className={`px-4 py-3 text-sm text-center font-semibold ${
                          item.variance && item.variance > 0 ? 'text-green-600' : item.variance && item.variance < 0 ? 'text-red-600' : ''
                        }`}>
                          {item.variance !== null && item.variance !== undefined ? (
                            <>{item.variance > 0 && '+'}{item.variance}</>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{getItemStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.scanner ? `${item.scanner.firstName} ${item.scanner.lastName}` : '-'}
                        </td>
                        {canScan && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No items scanned yet</p>
                <p className="text-gray-500 text-sm mt-2">Start scanning to add items to this session</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Reason (if rejected) */}
        {currentSession.status === StockTakeStatus.REJECTED && currentSession.rejectionReason && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <XCircle size={20} />
                Rejection Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{currentSession.rejectionReason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {viewMode === 'list' && renderListView()}
      {viewMode === 'session' && renderSessionView()}

      {/* Create Session Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Stock Take Session</DialogTitle>
            <DialogDescription>Start a new stock taking session to track inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Session Name *</label>
              <Input
                placeholder="e.g., Monthly Stock Check - Jan 2025"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                placeholder="e.g., Main Warehouse, Showroom"
                value={newSessionLocation}
                onChange={(e) => setNewSessionLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Remarks</label>
              <Textarea
                placeholder="Any additional notes..."
                value={newSessionRemarks}
                onChange={(e) => setNewSessionRemarks(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createSession} disabled={loading} className="bg-navy hover:bg-navy/90">
                Create Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Entry</DialogTitle>
            <DialogDescription>Manually enter product code and quantity</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Code / SKU *</label>
              <Input
                placeholder="Enter barcode, QR code, or SKU"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <Input
                type="number"
                min={1}
                value={manualQuantity}
                onChange={(e) => setManualQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                placeholder="Optional notes..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsManualEntryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualEntry} className="bg-navy hover:bg-navy/90">
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review & Approve Stock Take</DialogTitle>
            <DialogDescription>
              Review the stock take results and approve to update inventory
            </DialogDescription>
          </DialogHeader>
          {currentSession && currentSession.summary && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold ml-2">{currentSession.summary.totalScanned}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-semibold ml-2">{currentSession.summary.accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Verified:</span>
                    <span className="font-semibold ml-2 text-green-600">{currentSession.summary.verified}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Issues:</span>
                    <span className="font-semibold ml-2 text-red-600">
                      {currentSession.summary.missing + currentSession.summary.unexpected + currentSession.summary.damaged}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> Approving this session will update your inventory stock quantities.
                  This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rejection Reason (if rejecting)</label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => approveSession(false)}
                  disabled={loading}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveSession(true)}
                  disabled={loading}
                >
                  Approve & Update Inventory
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner */}
      <QRScanner
        isOpen={isScannerOpen}
        onScan={handleScan}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Variance Report Dialog (shown before approval) */}
      <VarianceReportDialog
        sessionId={currentSession?.id || null}
        sessionName={currentSession?.sessionName || ''}
        isOpen={isVarianceDialogOpen}
        onClose={() => setIsVarianceDialogOpen(false)}
        onProceedToApproval={() => {
          setIsVarianceDialogOpen(false);
          setIsApprovalDialogOpen(true);
        }}
      />
    </div>
  );
};
