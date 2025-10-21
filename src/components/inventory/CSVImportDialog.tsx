import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  FileWarning,
  Upload,
  X,
  Download
} from 'lucide-react';
import { ParsedCSVData, ValidatedInventoryItem, generateCSVTemplate } from '@/utils/intelligentCSVParser';
import { saveAs } from 'file-saver';

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parsedData: ParsedCSVData | null;
  onConfirmImport: (items: ValidatedInventoryItem[]) => Promise<void>;
}

const CSVImportDialog: React.FC<CSVImportDialogProps> = ({
  isOpen,
  onClose,
  parsedData,
  onConfirmImport
}) => {
  const [isImporting, setIsImporting] = useState(false);

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validRows === 0) return;

    setIsImporting(true);
    try {
      await onConfirmImport(parsedData.rows as ValidatedInventoryItem[]);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'inventory_template.csv');
  };

  if (!parsedData) return null;

  const hasErrors = parsedData.errors.length > 0;
  const canImport = parsedData.validRows > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Import Preview
          </DialogTitle>
          <DialogDescription>
            Review the data before importing into inventory
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {parsedData.validRows + parsedData.invalidRows}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-600">
                    {parsedData.validRows}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Invalid Rows</p>
                  <p className="text-2xl font-bold text-red-600">
                    {parsedData.invalidRows}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detected Columns */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2 text-sm">Detected Columns</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(parsedData.detectedColumns)
                .filter(([_, index]) => index !== undefined)
                .map(([field, index]) => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field} (Column {(index as number) + 1})
                  </Badge>
                ))}
            </div>
          </div>

          {/* Errors */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">
                  Found {parsedData.errors.length} error(s):
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm max-h-32 overflow-y-auto">
                  {parsedData.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.error} (Field: {error.field})
                    </li>
                  ))}
                  {parsedData.errors.length > 10 && (
                    <li className="text-gray-600 italic">
                      ... and {parsedData.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {canImport && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="font-semibold text-sm">
                  Preview - First {Math.min(5, parsedData.validRows)} Items
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Category
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                        Price
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(parsedData.rows as ValidatedInventoryItem[])
                      .slice(0, 5)
                      .map((item, index) => (
                        <tr
                          key={index}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="px-4 py-2">
                            {item.name}
                            {item._warnings && item._warnings.length > 0 && (
                              <FileWarning className="inline h-3 w-3 ml-1 text-yellow-600" />
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {item.sku}
                          </td>
                          <td className="px-4 py-2">{item.category || '-'}</td>
                          <td className="px-4 py-2 text-right">
                            £{item.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {parsedData.validRows > 5 && (
                <div className="bg-gray-50 px-4 py-2 border-t text-center text-xs text-gray-600">
                  ... and {parsedData.validRows - 5} more items
                </div>
              )}
            </div>
          )}

          {/* Help Section */}
          {!canImport && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <FileWarning className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900 mb-1">
                    No Valid Data Found
                  </p>
                  <p className="text-sm text-yellow-800 mb-3">
                    Your CSV file doesn't contain valid data or has incorrect format.
                    Please download the template below and try again.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          {!canImport && (
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          )}

          {canImport && (
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting
                ? `Importing ${parsedData.validRows} items...`
                : `Import ${parsedData.validRows} Items`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
