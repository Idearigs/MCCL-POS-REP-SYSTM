import React, { useState } from 'react';
import { TenantInfo } from '../../contexts/AuthContext';
import { useFeatures } from '../../contexts/FeatureContext';

interface Props {
  tenantInfo: TenantInfo;
}

const BillingWarningBanner: React.FC<Props> = ({ tenantInfo }) => {
  const [billingDismissed, setBillingDismissed] = useState(false);
  const [betaDismissed, setBetaDismissed] = useState(false);
  const { status, billingDaysOverdue } = tenantInfo;
  const { betaExpiresAt, isBetaTester } = useFeatures();

  // Beta expiry banner logic
  const betaDaysLeft = betaExpiresAt && isBetaTester
    ? Math.ceil((new Date(betaExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showBetaBanner = !betaDismissed && betaDaysLeft !== null && betaDaysLeft <= 14;

  // Billing banner logic
  const showBillingBanner = !billingDismissed && status && status !== 'ACTIVE' && status !== 'SUSPENDED' && status !== 'INACTIVE';
  const isWarning = status === 'PAYMENT_WARNING';
  const billingDaysLeft = isWarning ? Math.max(0, 4 - (billingDaysOverdue ?? 2)) : null;

  return (
    <>
      {showBetaBanner && (
        <div className="relative z-40 w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium bg-amber-500 text-amber-950">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">
            {betaDaysLeft !== null && betaDaysLeft <= 0 ? (
              <>
                <strong>Beta access expired.</strong>{' '}
                Your free trial has ended. Contact{' '}
                <a href="mailto:support@truedesk.co.uk" className="underline hover:no-underline">support@truedesk.co.uk</a>{' '}
                to start a paid subscription and continue using all features.
              </>
            ) : (
              <>
                <strong>Beta access ending soon.</strong>{' '}
                Your free beta period ends in <strong>{betaDaysLeft} day{betaDaysLeft !== 1 ? 's' : ''}</strong>.{' '}
                Contact <a href="mailto:support@truedesk.co.uk" className="underline hover:no-underline">support@truedesk.co.uk</a>{' '}
                to set up your monthly subscription before access is removed.
              </>
            )}
          </span>
          <button onClick={() => setBetaDismissed(true)} className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity" aria-label="Dismiss">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showBillingBanner && (
        <div className={`relative z-40 w-full px-4 py-3 flex items-center gap-3 text-sm font-medium ${isWarning ? 'bg-red-600 text-white' : 'bg-amber-500 text-amber-950'}`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isWarning
                ? 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
                : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              }
            />
          </svg>
          <span className="flex-1">
            {isWarning ? (
              <>
                <strong>Payment overdue.</strong>{' '}
                {billingDaysLeft !== null && billingDaysLeft > 0
                  ? `Your system will be locked in ${billingDaysLeft} day${billingDaysLeft === 1 ? '' : 's'} if payment is not received.`
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
          {!isWarning && (
            <button onClick={() => setBillingDismissed(true)} className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity" aria-label="Dismiss">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default BillingWarningBanner;
