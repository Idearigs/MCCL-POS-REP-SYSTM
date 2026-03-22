import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Shift } from '@/services/shiftService';
import { differenceInHours, differenceInMinutes } from 'date-fns';

interface ShiftReminderProps {
  activeShift: Shift | null;
  onStartShift: () => void;
  onCloseShift: () => void;
}

const ShiftReminder: React.FC<ShiftReminderProps> = ({
  activeShift,
  onStartShift,
  onCloseShift,
}) => {
  const [showLongShiftWarning, setShowLongShiftWarning] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  useEffect(() => {
    if (activeShift) {
      const checkShiftDuration = () => {
        const shiftStartTime = new Date(activeShift.startTime);
        const now = new Date();
        const hoursWorked = differenceInHours(now, shiftStartTime);

        // Show warning if shift has been active for more than 8 hours
        if (hoursWorked >= 8 && !showLongShiftWarning) {
          setShowLongShiftWarning(true);
        }

        // Show idle warning if no sales in last hour (if shift has sales count)
        const minutesSinceStart = differenceInMinutes(now, shiftStartTime);
        if (
          minutesSinceStart > 60 &&
          activeShift._count?.sales === 0 &&
          !showIdleWarning
        ) {
          setShowIdleWarning(true);
        }
      };

      // Check immediately
      checkShiftDuration();

      // Check every 30 minutes
      const interval = setInterval(checkShiftDuration, 30 * 60 * 1000);

      return () => clearInterval(interval);
    } else {
      setShowLongShiftWarning(false);
      setShowIdleWarning(false);
    }
  }, [activeShift]);

  // No active shift reminder
  if (!activeShift) {
    return (
      <Alert className="mb-4 bg-amber-50 border-amber-300">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">No Active Shift</AlertTitle>
        <AlertDescription className="text-amber-800">
          <div className="flex items-center justify-between">
            <span>
              You don't have an active shift. Please start a shift to track your
              sales properly.
            </span>
            <Button
              size="sm"
              onClick={onStartShift}
              className="ml-4 bg-amber-600 hover:bg-amber-700"
            >
              Start Shift
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Long shift warning
  if (showLongShiftWarning) {
    const hoursWorked = differenceInHours(
      new Date(),
      new Date(activeShift.startTime)
    );

    return (
      <Alert className="mb-4 bg-orange-50 border-orange-300">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">Long Shift Detected</AlertTitle>
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between">
            <span>
              You've been working for {hoursWorked} hours. Consider closing your
              shift and taking a break.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowLongShiftWarning(false);
                onCloseShift();
              }}
              className="ml-4 border-orange-600 text-orange-700 hover:bg-orange-100"
            >
              Close Shift
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Idle shift warning
  if (showIdleWarning) {
    return (
      <Alert className="mb-4 bg-blue-50 border-blue-300">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Idle Shift</AlertTitle>
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <span>
              Your shift has been active for over an hour with no sales. Everything okay?
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowIdleWarning(false)}
              className="ml-4"
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // All good - optional success message
  return null;
};

export default ShiftReminder;
