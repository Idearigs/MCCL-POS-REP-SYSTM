import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOutlet } from '../../contexts/OutletContext';
import { OutletSelectorDialog } from './OutletSelectorDialog';

/**
 * Renders the outlet-selector dialog when authenticated but no outlet chosen.
 * If the outlet system isn't configured yet (table missing / no outlets),
 * the gate lifts automatically so existing clients aren't blocked.
 */
export function OutletGate() {
  const { auth } = useAuth();
  const { currentOutlet } = useOutlet();
  const [bypassed, setBypassed] = useState(false);

  const needsSelection =
    auth.isAuthenticated && !auth.loading && currentOutlet === null && !bypassed;

  return (
    <OutletSelectorDialog
      open={needsSelection}
      onSelected={() => {
        // currentOutlet being set will flip needsSelection to false
      }}
      onUnavailable={() => setBypassed(true)}
    />
  );
}
