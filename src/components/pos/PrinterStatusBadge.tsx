import { useEffect, useState } from 'react';
import { Printer, WifiOff } from 'lucide-react';
import { getQZStatus, connectQZ, onQZStatusChange, type QZStatus } from '@/utils/qzBridge';
import { useSettings } from '@/contexts/SettingsContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_CONFIG: Record<QZStatus, { label: string; dot: string }> = {
  connected:    { label: 'Printer ready',        dot: 'bg-green-500' },
  connecting:   { label: 'Connecting…',          dot: 'bg-yellow-400 animate-pulse' },
  disconnected: { label: 'Printer bridge offline', dot: 'bg-red-500' },
  unavailable:  { label: 'QZ Tray not installed', dot: 'bg-gray-400' },
};

export function PrinterStatusBadge() {
  const { settings } = useSettings();
  const [status, setStatus] = useState<QZStatus>(getQZStatus());
  const hasPrinter = !!settings.printer.printerName;

  useEffect(() => {
    if (!hasPrinter) return;
    const unsub = onQZStatusChange(setStatus);
    // Attempt connection on mount
    connectQZ();
    return unsub;
  }, [hasPrinter]);

  // Don't show the badge if no printer is configured in settings
  if (!hasPrinter) return null;

  const cfg = STATUS_CONFIG[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => status !== 'connected' && connectQZ()}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs
                       bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Printer status"
          >
            {status === 'connected'
              ? <Printer className="h-3.5 w-3.5 text-green-400" />
              : <WifiOff className="h-3.5 w-3.5 text-gray-400" />}
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{cfg.label}</p>
          <p className="text-muted-foreground">{settings.printer.printerName}</p>
          {status !== 'connected' && (
            <p className="text-muted-foreground mt-1">Click to retry</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
