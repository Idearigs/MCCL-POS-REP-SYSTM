import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, X, ShoppingCart, LogOut, LayoutGrid } from 'lucide-react';
import { shiftService, Shift } from '@/services/shiftService';
import CloseShiftDialog from './CloseShiftDialog';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'floatingShiftButtonPosition';

const FloatingShiftButton: React.FC = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInQuickPOS, setIsInQuickPOS] = useState(false);

  // Draggable state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - 200, y: 80 };
      }
    }
    return { x: window.innerWidth - 200, y: 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadActiveShift();

    // Listen for shift change events
    const handleShiftChanged = () => {
      console.log('FloatingShiftButton: Shift change event received, reloading...');
      loadActiveShift();
    };

    // Listen for Quick POS open/close events
    const handleQuickPOSOpened = () => {
      console.log('FloatingShiftButton: Quick POS opened');
      setIsInQuickPOS(true);
    };

    const handleQuickPOSClosed = () => {
      console.log('FloatingShiftButton: Quick POS closed');
      setIsInQuickPOS(false);
    };

    window.addEventListener('shiftChanged', handleShiftChanged);
    window.addEventListener('quickPOSOpened', handleQuickPOSOpened);
    window.addEventListener('quickPOSClosed', handleQuickPOSClosed);

    // Cleanup
    return () => {
      window.removeEventListener('shiftChanged', handleShiftChanged);
      window.removeEventListener('quickPOSOpened', handleQuickPOSOpened);
      window.removeEventListener('quickPOSClosed', handleQuickPOSClosed);
    };
  }, []);

  const loadActiveShift = async () => {
    try {
      setLoading(true);
      console.log('FloatingShiftButton: Loading active shift...');
      const shift = await shiftService.getActiveShift();
      console.log('FloatingShiftButton: Active shift loaded:', shift);
      setActiveShift(shift);
    } catch (error) {
      // No active shift - button won't show
      console.log('FloatingShiftButton: No active shift or error:', error);
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShiftClosed = (shift: Shift) => {
    setActiveShift(null);
    setIsExpanded(false);
    toast({
      title: 'Shift Closed',
      description: `Shift ${shift.shiftNumber} has been closed successfully`,
    });
    // Force page reload to close Quick POS and show start shift screen
    setTimeout(() => {
      window.location.href = '/pos';
    }, 1000); // Wait 1 second for toast to show
  };

  const handleTogglePOS = () => {
    setIsExpanded(false);
    if (isInQuickPOS) {
      // User is in Quick POS, go back to admin panel
      window.dispatchEvent(new Event('quickPOSClosed'));
    } else {
      // Navigate to POS page (works from any page), then signal QuickPOS to open
      navigate('/pos');
      setTimeout(() => window.dispatchEvent(new Event('quickPOSOpened')), 100);
    }
  };

  const handleEndShift = () => {
    setIsExpanded(false);
    setIsCloseShiftDialogOpen(true);
  };

  const toggleExpanded = () => {
    if (!isDragging) {
      setIsExpanded(!isExpanded);
    }
  };

  // Drag handlers - detect drag vs click
  const dragThreshold = 5; // pixels moved before considered a drag
  const [hasMoved, setHasMoved] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    setHasMoved(false);
    setStartPos({ x: clientX, y: clientY });
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  }, [position]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Check if moved past threshold
    const dx = Math.abs(clientX - startPos.x);
    const dy = Math.abs(clientY - startPos.y);
    if (dx > dragThreshold || dy > dragThreshold) {
      setHasMoved(true);
      setIsExpanded(false);
    }

    if (hasMoved || dx > dragThreshold || dy > dragThreshold) {
      const newX = Math.max(0, Math.min(window.innerWidth - 180, clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, clientY - dragStart.y));
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, startPos, hasMoved]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [isDragging, position]);

  // Handle click - only toggle if not dragged
  const handleButtonClick = () => {
    if (!hasMoved) {
      setIsExpanded(!isExpanded);
    }
    setHasMoved(false);
  };

  // Add/remove global mouse/touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle window resize to keep button in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 200),
        y: Math.min(prev.y, window.innerHeight - 100),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render while loading
  if (loading) {
    return null;
  }

  // Calculate position-based layout
  const isOnRight = position.x > window.innerWidth / 2;
  const isOnBottom = position.y > window.innerHeight / 2;

  // Dropdown should go up if button is on bottom half, down if on top half
  const dropdownGoesUp = isOnBottom;
  // Badge should be on opposite side of screen edge
  const badgeOnLeft = isOnRight;

  console.log('FloatingShiftButton: Rendering with shift:', activeShift?.shiftNumber, 'isOnRight:', isOnRight, 'isOnBottom:', isOnBottom);

  return (
    <>
      {/* Floating Action Button Container - Draggable */}
      <div
        ref={buttonRef}
        className={`fixed z-[100] flex flex-col gap-3 select-none ${
          dropdownGoesUp ? 'flex-col-reverse' : 'flex-col'
        } ${isOnRight ? 'items-end' : 'items-start'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Shift Info Badge + Main Button Row - Draggable */}
        <div
          className={`flex items-center gap-2 ${isDragging && hasMoved ? 'cursor-grabbing' : 'cursor-grab'} ${
            badgeOnLeft ? 'flex-row' : 'flex-row-reverse'
          }`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* Shift Info Badge */}
          <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${activeShift ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs font-semibold text-gray-700">
                {activeShift ? activeShift.shiftNumber : 'No Shift'}
              </span>
            </div>
          </div>

          {/* Main FAB Button */}
          <button
            onClick={handleButtonClick}
            className={`relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl transform transition-all duration-300 ${
              isExpanded ? 'rotate-45 scale-110' : 'rotate-0 scale-100 hover:scale-110'
            } ${isDragging && hasMoved ? 'cursor-grabbing' : ''}`}
          >
            {isExpanded ? (
              <X size={24} className="transform rotate-0" />
            ) : (
              <Clock size={24} />
            )}

            {/* Pulse animation ring when not expanded */}
            {!isExpanded && !isDragging && (
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20" />
            )}

            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-200" />
          </button>
        </div>

        {/* Expanded Options - Dropdown (direction based on position) */}
        <div
          className={`flex flex-col gap-3 transition-all duration-300 ease-out ${
            isOnRight ? 'items-end' : 'items-start'
          } ${
            isExpanded
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : `opacity-0 ${dropdownGoesUp ? 'translate-y-4' : '-translate-y-4'} pointer-events-none`
          }`}
        >
          {/* Toggle POS/Admin Button - Context Aware */}
          <div className={`flex items-center gap-3 group ${isOnRight ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              <span className="text-sm font-medium text-gray-700">
                {isInQuickPOS ? 'Back to Admin' : 'Back to POS'}
              </span>
            </div>
            <button
              onClick={handleTogglePOS}
              className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
            >
              {isInQuickPOS ? <LayoutGrid size={20} /> : <ShoppingCart size={20} />}
              <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-200" />
            </button>
          </div>

          {/* End Shift Button — only when shift is active */}
          {activeShift && (
            <div className={`flex items-center gap-3 group ${isOnRight ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className="bg-white px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-700">End Shift</span>
              </div>
              <button
                onClick={handleEndShift}
                className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
              >
                <LogOut size={20} />
                <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-200" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close Shift Dialog — only mount when shift exists */}
      {activeShift && (
        <CloseShiftDialog
          open={isCloseShiftDialogOpen}
          onClose={() => setIsCloseShiftDialogOpen(false)}
          activeShift={activeShift}
          onShiftClosed={handleShiftClosed}
        />
      )}
    </>
  );
};

export default FloatingShiftButton;
