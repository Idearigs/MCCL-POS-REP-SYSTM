import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './page-transition.css'; // We'll create this CSS file next

interface PageTransitionProps {
  children: React.ReactNode;
  timeout?: number; // Time in ms before showing the loading animation
  minDisplayTime?: number; // Minimum time to show the animation once triggered
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  timeout = 300, // Only show loading if page takes more than 300ms to load
  minDisplayTime = 500, // Once shown, display for at least 500ms
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [content, setContent] = useState(children);

  useEffect(() => {
    // Start loading state when location changes
    setIsLoading(true);
    
    // Set a timeout to show loading animation if content takes too long
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setShowLoading(true);
      }
    }, timeout);
    
    // Cleanup function
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoading) {
      // If we're not loading anymore, update the content
      setContent(children);
    }
  }, [children, isLoading]);

  useEffect(() => {
    if (!showLoading) return;
    
    // If we're showing loading, we need to ensure it displays for at least minDisplayTime
    const minTimeTimeout = setTimeout(() => {
      setShowLoading(false);
      setIsLoading(false);
    }, minDisplayTime);
    
    return () => {
      clearTimeout(minTimeTimeout);
    };
  }, [showLoading, minDisplayTime]);

  // When new children arrive, finish loading after a small delay
  useEffect(() => {
    if (isLoading) {
      const finishTimeout = setTimeout(() => {
        if (!showLoading) {
          // If we never showed loading, just finish immediately
          setIsLoading(false);
        }
      }, 50);
      
      return () => {
        clearTimeout(finishTimeout);
      };
    }
  }, [children, isLoading, showLoading]);

  return (
    <>
      {showLoading ? (
        <div className="fixed inset-0 z-50 bg-gray-900/10 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="bg-white/95 shadow-lg rounded-lg p-6 flex flex-col items-center border border-gray-200">
            <div className="dot-wave-container">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="dot-wave"></div>
              ))}
            </div>
            <div className="w-full flex flex-col items-center">
              <p className="text-gray-700 font-medium text-center">Loading your jewelry dashboard</p>
              <div className="loading-progress w-full max-w-[200px]">
                <div className="loading-progress-bar"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          {content}
        </div>
      )}
    </>
  );
};

export default PageTransition;
