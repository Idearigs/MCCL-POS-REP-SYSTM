import { useAuth } from '../../contexts/AuthContext';
import { useOutlet } from '../../contexts/OutletContext';
import { OutletSelectorDialog } from './OutletSelectorDialog';

/**
 * Renders the outlet-selector dialog whenever the user is authenticated
 * but hasn't chosen an outlet yet. Mounted once at the App root so it
 * blocks navigation until an outlet is selected.
 */
export function OutletGate() {
  const { auth } = useAuth();
  const { currentOutlet } = useOutlet();

  const needsSelection =
    auth.isAuthenticated && !auth.loading && currentOutlet === null;

  return (
    <OutletSelectorDialog
      open={needsSelection}
      onSelected={() => {
        // OutletContext.selectOutlet already stored it; just close the dialog.
      }}
    />
  );
}
