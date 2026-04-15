import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { stockTakingService } from '@/services/stockTakingService';

interface VarianceReportDialogProps {
  sessionId: string | null;
  sessionName: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToApproval: () => void;
}

interface VarianceItem {
  productName: string;
  productSku: string;
  systemQuantity: number;
  scannedQuantity: number;
  variance: number;
  variancePercent: string;
  valueImpact: string;
  status: string;
}

interface VarianceData {
  sessionId: string;
  sessionName: string;
  totalItems: number;
  totalVarianceValue: string;
  variances: {
    critical: {
      count: number;
      items: VarianceItem[];
      requiresAdminApproval: boolean;
    };
    moderate: {
      count: number;
      items: VarianceItem[];
    };
    minor: {
      count: number;
      items: VarianceItem[];
    };
  };
  recommendation: string;
}

export const VarianceReportDialog: React.FC<VarianceReportDialogProps> = ({
  sessionId,
  sessionName,
  isOpen,
  onClose,
  onProceedToApproval,
}) => {
  const [loading, setLoading] = useState(true);
  const [varianceData, setVarianceData] = useState<VarianceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchVarianceReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  const fetchVarianceReport = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await stockTakingService.getVarianceReport(sessionId);
      setVarianceData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load variance report');
      console.error('Variance report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: 'critical' | 'moderate' | 'minor') => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'minor':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const renderVarianceSection = (
    title: string,
    items: VarianceItem[],
    severity: 'critical' | 'moderate' | 'minor'
  ) => {
    if (items.length === 0) return null;

    return (
      <div className={`border rounded-lg p-4 ${getSeverityColor(severity)}`}>
        <div className="flex items-center gap-2 mb-3">
          {severity === 'critical' && <AlertTriangle className="h-5 w-5" />}
          {severity === 'moderate' && <AlertCircle className="h-5 w-5" />}
          {severity === 'minor' && <CheckCircle2 className="h-5 w-5" />}
          <h4 className="font-semibold">{title} ({items.length})</h4>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, index) => (
            <div key={index} className="bg-white rounded p-3 text-sm">
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium">{item.productName}</div>
                <div className="flex items-center gap-1">
                  {item.variance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={item.variance > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {item.variance > 0 ? '+' : ''}{item.variance}
                  </span>
                </div>
              </div>
              <div className="text-gray-600 space-y-1">
                <div>SKU: {item.productSku}</div>
                <div className="flex justify-between">
                  <span>System: {item.systemQuantity}</span>
                  <span>Scanned: {item.scannedQuantity}</span>
                  <span>{item.variancePercent}% variance</span>
                </div>
                <div className="font-medium">
                  Value Impact: £{item.valueImpact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Variance Report - {sessionName}</DialogTitle>
          <DialogDescription>
            Review all inventory variances before approving this stock take
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading variance report...</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && varianceData && (
            <>
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Items</div>
                    <div className="text-2xl font-bold">{varianceData.totalItems}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Value Impact</div>
                    <div className={`text-2xl font-bold ${parseFloat(varianceData.totalVarianceValue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      £{varianceData.totalVarianceValue}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation Alert */}
              {varianceData.recommendation.startsWith('REVIEW_REQUIRED') && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">
                    {varianceData.recommendation}
                  </AlertDescription>
                </Alert>
              )}

              {varianceData.recommendation.startsWith('CAUTION') && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {varianceData.recommendation}
                  </AlertDescription>
                </Alert>
              )}

              {varianceData.recommendation.startsWith('OK') && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {varianceData.recommendation}
                  </AlertDescription>
                </Alert>
              )}

              {/* Variance Sections */}
              {renderVarianceSection(
                'Critical Variances',
                varianceData.variances.critical.items,
                'critical'
              )}

              {renderVarianceSection(
                'Moderate Variances',
                varianceData.variances.moderate.items,
                'moderate'
              )}

              {renderVarianceSection(
                'Minor Variances',
                varianceData.variances.minor.items,
                'minor'
              )}

              {varianceData.variances.critical.count === 0 &&
               varianceData.variances.moderate.count === 0 &&
               varianceData.variances.minor.count === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-gray-900">Perfect Match!</p>
                  <p className="text-gray-600">All scanned quantities match the system records</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onProceedToApproval}
            disabled={loading || !!error}
            className={
              varianceData?.variances.critical.requiresAdminApproval
                ? 'bg-orange-600 hover:bg-orange-700'
                : ''
            }
          >
            {varianceData?.variances.critical.requiresAdminApproval
              ? 'Proceed Anyway (Admin Override)'
              : 'Proceed to Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
