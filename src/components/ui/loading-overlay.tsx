import React from 'react';
import LoadingSpinner from './loading-spinner';

interface LoadingOverlayProps {
  message?: string;
  isLoading: boolean;
  children: React.ReactNode;
  fullScreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  isLoading, 
  children,
  fullScreen = false
}) => {
  if (!isLoading) return <>{children}</>;

  const overlayClasses = fullScreen 
    ? 'fixed inset-0 z-50' 
    : 'absolute inset-0 z-10';

  return (
    <div className="relative">
      {children}
      
      {isLoading && (
        <div className={`${overlayClasses} bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center`}>
          <div className="bg-white/90 shadow-lg rounded-xl p-6 flex flex-col items-center">
            <LoadingSpinner size="lg" color="border-blue-500" />
            <p className="mt-4 text-gray-700 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;
