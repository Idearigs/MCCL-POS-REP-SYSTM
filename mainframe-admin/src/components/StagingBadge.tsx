/**
 * Fixed corner badge that marks non-production environments so the staging
 * admin panel is never mistaken for production. Auto-detects via the hostname
 * (any `staging`/`localhost` host) or an explicit VITE_APP_ENV=staging build var.
 */
function isStaging(): boolean {
  const env = (import.meta.env.VITE_APP_ENV || '').toLowerCase();
  if (env === 'staging') return true;
  if (env === 'production') return false;
  const host = window.location.hostname;
  return host.includes('staging') || host === 'localhost' || host === '127.0.0.1';
}

export default function StagingBadge() {
  if (!isStaging()) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: 6,
        background:
          'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 12px, #1f2937 12px, #1f2937 24px)',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'fixed',
          top: 6,
          right: 12,
          background: '#f59e0b',
          color: '#1f2937',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          padding: '2px 8px',
          borderRadius: '0 0 6px 6px',
          fontFamily: 'ui-monospace, monospace',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        STAGING
      </span>
    </div>
  );
}
