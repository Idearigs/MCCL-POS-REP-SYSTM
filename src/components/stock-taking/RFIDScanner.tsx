import React, { useState, useEffect, useRef } from 'react';
import { Nfc, X, AlertCircle, CheckCircle, Wifi } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Card } from '../ui/card';

interface RFIDScannerProps {
  onScan: (rfidTag: string) => void;
  onClose: () => void;
  isOpen: boolean;
  mode?: 'single' | 'bulk'; // single = scan one and close, bulk = keep scanning
}

export const RFIDScanner: React.FC<RFIDScannerProps> = ({
  onScan,
  onClose,
  isOpen,
  mode = 'single',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedTags, setScannedTags] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const inputBufferRef = useRef('');
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = () => {
    setIsScanning(true);
    setError(null);
    setScannedTags([]);

    // Add keyboard event listener for RFID reader input
    // Most RFID readers work in HID mode (keyboard emulation)
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('paste', handlePaste);
  };

  const stopScanning = () => {
    setIsScanning(false);
    document.removeEventListener('keypress', handleKeyPress);
    document.removeEventListener('paste', handlePaste);

    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
      inputTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Enter key signals end of RFID scan
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputBufferRef.current.length > 0) {
        processRFIDTag(inputBufferRef.current);
        inputBufferRef.current = '';
      }
      return;
    }

    // Add character to buffer
    if (event.key.length === 1) {
      inputBufferRef.current += event.key;
      setCurrentInput(inputBufferRef.current);

      // Clear timeout and set new one
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }

      // Auto-process after 100ms of no input (in case Enter is not sent)
      inputTimeoutRef.current = setTimeout(() => {
        if (inputBufferRef.current.length > 0) {
          processRFIDTag(inputBufferRef.current);
          inputBufferRef.current = '';
          setCurrentInput('');
        }
      }, 100);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      processRFIDTag(pastedText);
    }
  };

  const processRFIDTag = (tag: string) => {
    const trimmedTag = tag.trim();

    // Validate RFID tag format (basic validation)
    if (trimmedTag.length < 8) {
      setError('Invalid RFID tag (too short)');
      return;
    }

    // Check for duplicates in current session
    if (scannedTags.includes(trimmedTag)) {
      setError(`Tag ${trimmedTag} already scanned`);
      setTimeout(() => setError(null), 2000);
      return;
    }

    // Add to scanned list
    setScannedTags((prev) => [...prev, trimmedTag]);
    setLastScanTime(Date.now());

    // Call callback
    onScan(trimmedTag);

    // Show success briefly
    setError(null);

    // Close scanner in single mode
    if (mode === 'single') {
      setTimeout(() => {
        stopScanning();
        onClose();
      }, 500);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const handleManualSubmit = () => {
    if (currentInput.trim().length > 0) {
      processRFIDTag(currentInput.trim());
      setCurrentInput('');
      inputBufferRef.current = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Nfc size={24} className="animate-pulse" />
          <div>
            <h2 className="text-lg font-semibold">
              {mode === 'bulk' ? 'Bulk RFID Scanning' : 'Scan RFID Tag'}
            </h2>
            <p className="text-xs text-blue-100">
              {mode === 'bulk'
                ? 'Scan multiple items continuously'
                : 'Scan one item'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full p-8">
          {/* Scanner Status */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-4">
              <Nfc size={48} className={`text-blue-600 ${isScanning ? 'animate-pulse' : ''}`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isScanning ? 'Ready to Scan' : 'Scanner Inactive'}
            </h3>
            <p className="text-gray-600 text-sm">
              {isScanning
                ? 'Hold RFID tag near the reader or use the scanner gun'
                : 'Starting scanner...'}
            </p>
          </div>

          {/* Current Input Display */}
          {currentInput && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="text-blue-600 animate-bounce" size={20} />
                <span className="text-sm font-medium text-blue-900">Reading Tag...</span>
              </div>
              <div className="font-mono text-lg text-blue-900 break-all">{currentInput}</div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message (Bulk Mode) */}
          {mode === 'bulk' && scannedTags.length > 0 && Date.now() - lastScanTime < 2000 && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Scanned: {scannedTags[scannedTags.length - 1]}
              </AlertDescription>
            </Alert>
          )}

          {/* Scanned Count (Bulk Mode) */}
          {mode === 'bulk' && scannedTags.length > 0 && (
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Tags Scanned</span>
                <span className="text-2xl font-bold text-blue-600">{scannedTags.length}</span>
              </div>
              <div className="mt-3 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {scannedTags.slice(-10).reverse().map((tag, index) => (
                    <div key={index} className="bg-white rounded px-3 py-2 text-xs font-mono text-gray-700 border">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Option */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3 text-center">
              Or enter RFID tag manually:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  inputBufferRef.current = e.target.value;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
                placeholder="Enter RFID tag (e.g., E2801170000002010DC90E8F)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <Button onClick={handleManualSubmit} disabled={!currentInput.trim()}>
                Submit
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">How to use:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Connect your RFID reader via USB</li>
              <li>• Wave items near the reader or use scanner gun</li>
              <li>• Tags will be detected automatically</li>
              <li>• {mode === 'bulk' ? 'Keep scanning until done' : 'Scanner closes after one scan'}</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Footer Actions (Bulk Mode) */}
      {mode === 'bulk' && (
        <div className="bg-white p-4 flex justify-center gap-3 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={scannedTags.length === 0}>
            Done ({scannedTags.length} scanned)
          </Button>
        </div>
      )}
    </div>
  );
};
