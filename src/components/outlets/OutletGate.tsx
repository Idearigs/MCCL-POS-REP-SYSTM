import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOutlet } from '../../contexts/OutletContext';
import { OutletSelectorDialog } from './OutletSelectorDialog';

const BYPASS_KEY = 'mps_outlet_gate_skipped';

/**
 * Shows the outlet selector when authenticated but no outlet chosen.
 * If the outlet system is not yet configured (table missing / no outlets),
 * the gate lifts automatically and persists across refreshes via localStorage.
 */
export function OutletGate() {
  const { auth } = useAuth();
  const { currentOutlet } = useOutlet();
  const [bypassed, setBypassed] = useState(
    () => localStorage.getItem(BYPASS_KEY) === '1',
  );

  const handleUnavailable = () => {
    localStorage.setItem(BYPASS_KEY, '1');
    setBypassed(true);
  };

  const needsSelection =
    auth.isAuthenticated && !auth.loading && currentOutlet === null && !bypassed;

  return (
    <OutletSelectorDialog
      open={needsSelection}
      onSelected={() => {
        // Outlet properly selected — remove bypass so future logins use real outlets
        localStorage.removeItem(BYPASS_KEY);
      }}
      onUnavailable={handleUnavailable}
    />
  );
}
