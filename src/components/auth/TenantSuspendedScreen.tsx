import React from 'react';
import { TenantInfo } from '../../contexts/AuthContext';

interface Props {
  tenantInfo: TenantInfo;
  onLogout: () => void;
}

const TenantSuspendedScreen: React.FC<Props> = ({ tenantInfo, onLogout }) => {
  const isPaymentOverdue = tenantInfo.suspendedReason === 'PAYMENT_OVERDUE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950">
      <div className="max-w-md w-full mx-4 text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {isPaymentOverdue ? 'Account Suspended' : 'Account Deactivated'}
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-2 leading-relaxed">
          {isPaymentOverdue
            ? 'Your account has been suspended due to an overdue payment. Your data is safe and your account can be restored once payment is made.'
            : 'Your account has been deactivated. Please contact MCCL for more information about restoring access.'}
        </p>

        {isPaymentOverdue && (
          <p className="text-gray-500 text-sm mb-8">
            To restore access, please settle your outstanding balance and contact our support team.
          </p>
        )}

        {!isPaymentOverdue && (
          <p className="text-gray-500 text-sm mb-8">
            If you believe this is a mistake, please get in touch with us.
          </p>
        )}

        {/* Contact box */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact MCCL Support</p>
          <div className="space-y-2">
            <a
              href="mailto:support@mccl.co.uk"
              className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              support@mccl.co.uk
            </a>
            <a
              href="tel:+441234567890"
              className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +44 (0) 1234 567 890
            </a>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default TenantSuspendedScreen;
