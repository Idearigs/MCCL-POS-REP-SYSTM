import React, { useState } from 'react';
import { TenantInfo } from '../../contexts/AuthContext';

interface Props {
  tenantInfo: TenantInfo;
}

const BillingWarningBanner: React.FC<Props> = ({ tenantInfo }) => {
  const [dismissed, setDismissed] = useState(false);
  const { status, billingDaysOverdue } = tenantInfo;

  if (!status || status === 'ACTIVE' || status === 'SUSPENDED' || status === 'INACTIVE') return null;
  if (dismissed && status === 'PAYMENT_DUE') return null; // only PAYMENT_DUE is dismissible

  const isWarning = status === 'PAYMENT_WARNING';
  const daysLeft = isWarning ? Math.max(0, 4 - (billingDaysOverdue ?? 2)) : null;

  return (
    <div
      className={`relative z-40 w-full px-4 py-3 flex items-center gap-3 text-sm font-medium
        ${isWarning
          ? 'bg-red-600 text-white'
          : 'bg-amber-500 text-amber-950'
        }`}
    >
      {/* Icon */}
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={isWarning
            ? 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
            : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          }
        />
      </svg>

      {/* Message */}
      <span className="flex-1">
        {isWarning ? (
          <>
            <strong>Payment overdue.</strong>{' '}
            {daysLeft !== null && daysLeft > 0
              ? `Your system will be locked in ${daysLeft} day${daysLeft === 1 ? '' : 's'} if payment is not received.`
              : 'Your system will be locked very soon if payment is not received.'}{' '}
            Contact <a href="mailto:support@mccl.co.uk" className="underline hover:no-underline">support@mccl.co.uk</a> to resolve this.
          </>
        ) : (
          <>
            <strong>Payment due.</strong>{' '}
            Your subscription payment is due. Please contact{' '}
            <a href="mailto:support@mccl.co.uk" className="underline hover:no-underline">support@mccl.co.uk</a>{' '}
            to arrange payment and avoid service interruption.
          </>
        )}
      </span>

      {/* Dismiss — only for PAYMENT_DUE */}
      {!isWarning && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default BillingWarningBanner;
