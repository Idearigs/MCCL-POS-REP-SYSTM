import React from 'react';
import { useFeatures } from '../../contexts/FeatureContext';
import MainLayout from '../layout/MainLayout';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  pageTitle?: string;
}

/**
 * Blocks access to a route if the tenant's plan does not include the feature.
 * - While features load for the first time with no cache: shows a spinner.
 * - If the feature is disabled: renders a "not on your plan" page.
 * - If enabled: renders children normally.
 */
const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, pageTitle = 'Feature' }) => {
  const { hasFeature, loading, enabledFeatures } = useFeatures();

  // First-time load with no cache — wait before deciding
  if (loading && enabledFeatures.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return (
      <MainLayout pageTitle={pageTitle}>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Feature Not Available</h2>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              <strong>{pageTitle}</strong> is not included in your current subscription plan.
              Contact MCCL to upgrade and unlock this feature.
            </p>
            <a
              href="mailto:support@mccl.co.uk"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Contact MCCL to Upgrade
            </a>
          </div>
        </div>
      </MainLayout>
    );
  }

  return <>{children}</>;
};

export default FeatureGuard;
