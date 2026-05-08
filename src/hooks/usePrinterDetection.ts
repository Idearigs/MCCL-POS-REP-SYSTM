import { useState, useCallback, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export interface PrinterDetectionState {
  showSelector: boolean;
  selectorPrinters: string[];
  selectorMode: 'multiple' | 'replacement';
  missingPrinter: string;
  dismiss: () => void;
  confirmSelect: (printer: string) => Promise<void>;
  scan: () => Promise<void>;
  scanning: boolean;
}

export function usePrinterDetection(): PrinterDetectionState {
  const { settings, updatePrinterSettings } = useSettings();
  const [showSelector, setShowSelector] = useState(false);
  const [selectorPrinters, setSelectorPrinters] = useState<string[]>([]);
  const [selectorMode, setSelectorMode] = useState<'multiple' | 'replacement'>('multiple');
  const [missingPrinter, setMissingPrinter] = useState('');
  const [scanning, setScanning] = useState(false);
  const ranOnce = useRef(false);

  const scan = useCallback(async () => {
    // Only run if QZ certs are loaded
    const cert = localStorage.getItem('qz_certificate');
    const pkey = localStorage.getItem('qz_private_key');
    if (!cert || !pkey) return;

    setScanning(true);
    try {
      const { connectQZ, findThermalPrinters } = await import('@/utils/qzBridge');
      const connected = await connectQZ();
      if (!connected) return;

      const thermal = await findThermalPrinters();
      if (thermal.length === 0) return;

      const saved = settings.printer.printerName;

      if (!saved) {
        // No printer configured yet
        if (thermal.length === 1) {
          // Auto-select silently
          await updatePrinterSettings({ ...settings.printer, printerName: thermal[0] });
        } else {
          setSelectorPrinters(thermal);
          setSelectorMode('multiple');
          setShowSelector(true);
        }
        return;
      }

      const stillThere = thermal.includes(saved);
      if (!stillThere) {
        // Saved printer gone — offer replacement
        setMissingPrinter(saved);
        setSelectorPrinters(thermal);
        setSelectorMode('replacement');
        setShowSelector(true);
      } else if (thermal.length > 1 && !ranOnce.current) {
        // Multiple printers found but saved one is valid — don't nag on every scan
        ranOnce.current = true;
      }
    } catch {
      // QZ not available — silent
    } finally {
      setScanning(false);
    }
  }, [settings.printer, updatePrinterSettings]);

  const confirmSelect = useCallback(
    async (printer: string) => {
      await updatePrinterSettings({ ...settings.printer, printerName: printer });
      setShowSelector(false);
    },
    [settings.printer, updatePrinterSettings],
  );

  const dismiss = useCallback(() => setShowSelector(false), []);

  return {
    showSelector,
    selectorPrinters,
    selectorMode,
    missingPrinter,
    dismiss,
    confirmSelect,
    scan,
    scanning,
  };
}
