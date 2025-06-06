import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface IntroAnimationProps {
  onComplete?: () => void;
  targetRoute?: string;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ 
  onComplete,
  targetRoute = '/'
}) => {
  const navigate = useNavigate();
  const [showAnimation, setShowAnimation] = useState(true);
  
  useEffect(() => {
    // Animation will play for 2.5 seconds before redirecting
    const timer = setTimeout(() => {
      setShowAnimation(false);
      if (targetRoute) {
        navigate(targetRoute);
      }
      if (onComplete) {
        onComplete();
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [navigate, onComplete, targetRoute]);
  
  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy"
        >
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <div className="text-4xl font-bold text-white">
                <span className="text-gold">MCCL</span> POS System
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-white/80 text-sm"
            >
              Jewelry Management & Repair System
            </motion.div>
            
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ duration: 1.2, delay: 1.0, ease: "easeInOut" }}
              className="h-1 bg-gold/80 mt-8 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroAnimation;
