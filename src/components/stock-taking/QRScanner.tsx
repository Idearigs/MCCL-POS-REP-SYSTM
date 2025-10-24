import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Import BarcodeDetector dynamically
  const [barcodeDetector, setBarcodeDetector] = useState<any>(null);

  useEffect(() => {
    // Check if BarcodeDetector is available
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
      setBarcodeDetector(detector);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera access
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start scanning loop
      scanIntervalRef.current = setInterval(() => {
        captureAndScan();
      }, 500); // Scan every 500ms
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Failed to access camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear scan interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setIsScanning(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      if (barcodeDetector) {
        // Use native BarcodeDetector API if available
        const barcodes = await barcodeDetector.detect(canvas);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          handleScan(code);
        }
      } else {
        // Fallback: Use jsQR library
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = await scanImageData(imageData);
        if (code) {
          handleScan(code);
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  // Fallback QR code scanning using jsQR
  const scanImageData = async (imageData: ImageData): Promise<string | null> => {
    try {
      // @ts-ignore - jsQR will be loaded dynamically
      if (typeof window.jsQR !== 'undefined') {
        // @ts-ignore
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          return code.data;
        }
      }
    } catch (err) {
      console.error('jsQR scan error:', err);
    }
    return null;
  };

  const handleScan = (code: string) => {
    if (code) {
      // Stop scanning
      stopScanning();

      // Call onScan callback
      onScan(code);

      // Close scanner
      onClose();
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-navy text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={24} />
          <h2 className="text-lg font-semibold">Scan QR Code / Barcode</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-blue-500 rounded-lg relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
            </div>
          </div>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instructions */}
      <div className="bg-white p-4 text-center">
        <p className="text-gray-600">
          Position the QR code or barcode within the frame to scan
        </p>
      </div>
    </div>
  );
};
