import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Nfc } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RFIDAssignment {
  sku: string;
  rfidTag: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

interface BulkRFIDAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignments: RFIDAssignment[]) => Promise<{ success: number; failed: number; errors: any[] }>;
}

const BulkRFIDAssignment: React.FC<BulkRFIDAssignmentProps> = ({
  isOpen,
  onClose,
  onAssign,
}) => {
  const [assignments, setAssignments] = useState<RFIDAssignment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: any[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setAssignments(parsed);
      } catch (error: any) {
        setParseError(error.message);
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): RFIDAssignment[] => {
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const skuIndex = header.findIndex(h => h === 'sku' || h === 'product sku' || h === 'product_sku');
    const rfidIndex = header.findIndex(h =>
      h === 'rfid' ||
      h === 'rfid tag' ||
      h === 'rfid_tag' ||
      h === 'rfidtag'
    );

    if (skuIndex === -1) {
      throw new Error('CSV must have a "SKU" column');
    }
    if (rfidIndex === -1) {
      throw new Error('CSV must have an "RFID" or "RFID Tag" column');
    }

    // Parse data rows
    const parsed: RFIDAssignment[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

      const sku = values[skuIndex];
      const rfidTag = values[rfidIndex];

      if (!sku || !rfidTag) {
        continue; // Skip empty rows
      }

      parsed.push({
        sku,
        rfidTag,
        status: 'pending',
      });
    }

    if (parsed.length === 0) {
      throw new Error('No valid data rows found in CSV');
    }

    return parsed;
  };

  const handleAssign = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      const result = await onAssign(assignments);
      setResults(result);

      // Update assignment statuses based on results
      // (This is a simplified approach - in production you'd want detailed error mapping)
      if (result.success === assignments.length) {
        setAssignments(prev => prev.map(a => ({ ...a, status: 'success' as const })));
      }
    } catch (error: any) {
      setParseError(error.message || 'Failed to assign RFID tags');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = 'SKU,RFID Tag\nJWL-001,E2801170000002010DC90E8F\nJWL-002,E2801170000002010DC90E90\nJWL-003,E2801170000002010DC90E91';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfid_assignment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setAssignments([]);
    setResults(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleReset = () => {
    setAssignments([]);
    setResults(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Nfc className="h-5 w-5" />
            Bulk RFID Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with SKU and RFID Tag columns to assign RFID tags to multiple products at once.
              This is perfect for when you've just purchased RFID tags and need to assign them to existing inventory.
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {assignments.length > 0 ? 'Upload Different File' : 'Upload CSV File'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={isProcessing}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {assignments.length > 0 && !results && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Preview ({assignments.length} products)</h4>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Clear
                </Button>
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-left p-2 font-medium">RFID Tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.slice(0, 100).map((assignment, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{assignment.sku}</td>
                        <td className="p-2 font-mono text-xs">{assignment.rfidTag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {assignments.length > 100 && (
                <p className="text-xs text-gray-500 text-center">
                  Showing first 100 of {assignments.length} products
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{results.success}</p>
                </div>
                <div className="border rounded-lg p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="border rounded-lg p-3 bg-red-50 max-h-40 overflow-y-auto">
                  <h5 className="text-sm font-semibold text-red-900 mb-2">Errors:</h5>
                  <ul className="space-y-1 text-xs text-red-800">
                    {results.errors.map((error, index) => (
                      <li key={index}>
                        • SKU: {error.sku} - {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Successfully assigned RFID tags to {results.success} product{results.success !== 1 ? 's' : ''}!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* CSV Format Guide */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">CSV Format:</h4>
            <div className="bg-white rounded border p-3 font-mono text-xs">
              <div>SKU,RFID Tag</div>
              <div>JWL-001,E2801170000002010DC90E8F</div>
              <div>JWL-002,E2801170000002010DC90E90</div>
              <div>JWL-003,E2801170000002010DC90E91</div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Column headers can be: "SKU" and "RFID Tag" (or variations)</li>
              <li>• SKU must match existing products in your system</li>
              <li>• RFID tags should be unique</li>
              <li>• You can export RFID tags from your RFID reader software</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && assignments.length > 0 && (
            <Button onClick={handleAssign} disabled={isProcessing}>
              {isProcessing ? 'Assigning...' : `Assign ${assignments.length} RFID Tags`}
            </Button>
          )}
          {results && results.success > 0 && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRFIDAssignment;
