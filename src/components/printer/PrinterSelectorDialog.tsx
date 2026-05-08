import React, { useState } from 'react';
import { Printer, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  printers: string[];
  mode: 'multiple' | 'replacement';
  missingPrinter?: string;
  onSelect: (printer: string) => void;
  onDismiss: () => void;
}

export function PrinterSelectorDialog({
  open,
  printers,
  mode,
  missingPrinter,
  onSelect,
  onDismiss,
}: Props) {
  const [selected, setSelected] = useState<string>(printers[0] ?? '');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onSelect(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'replacement' ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Printer className="h-5 w-5 text-blue-600" />
            )}
            {mode === 'replacement' ? 'Printer Not Found' : 'Multiple Printers Detected'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'replacement' ? (
              <>
                <strong>{missingPrinter}</strong> is no longer connected. Select a replacement printer below.
              </>
            ) : (
              'More than one thermal printer is connected. Select which one to use as default.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {printers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelected(p)}
              className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-colors ${
                selected === p
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Printer className="h-4 w-4 flex-shrink-0" />
                {p}
              </span>
              {selected === p && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onDismiss} disabled={saving}>
            Skip for now
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || saving}>
            {saving ? 'Saving…' : 'Set as Default'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
