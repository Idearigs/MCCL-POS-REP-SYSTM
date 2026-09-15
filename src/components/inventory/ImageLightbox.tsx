import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeImageUrl } from '@/lib/utils';

interface ImageLightboxProps {
  /** Raw image URLs (server paths, absolute URLs, or blob: previews). */
  images: string[];
  /** Index of the image to show first. */
  startIndex?: number;
  open: boolean;
  onClose: () => void;
  /** Product name, shown as the caption / alt text. */
  title?: string;
}

/**
 * Full-screen image viewer. Rendered via a portal to <body> so it overlays
 * everything — including the inventory edit dialog it can be opened from.
 * The large image is served resized (w=1200) through the /thumb endpoint for
 * local uploads, so "view big" stays fast without loading the multi-MB original.
 */
const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  startIndex = 0,
  open,
  onClose,
  title,
}) => {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const count = images.length;
  const hasMultiple = count > 1;

  // Progressive load: show the small (usually already-cached) thumbnail at once,
  // then swap to the sharp 1200px once it has downloaded/generated. Avoids the
  // blank wait on the first zoom / cold thumbnail cache.
  const raw = images[index];
  const lowSrc = normalizeImageUrl(raw, { w: 200 }) || raw;
  const hiSrc = normalizeImageUrl(raw, { w: 1200 }) || raw;
  const [displaySrc, setDisplaySrc] = useState(lowSrc);
  const [sharp, setSharp] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplaySrc(lowSrc);
    setSharp(false);
    let cancelled = false;
    const hi = new Image();
    hi.onload = () => {
      if (!cancelled) { setDisplaySrc(hiSrc); setSharp(true); }
    };
    hi.onerror = () => {
      // Resized version failed — fall back to the raw original.
      if (!cancelled) { setDisplaySrc(raw); setSharp(true); }
    };
    hi.src = hiSrc;
    return () => { cancelled = true; };
  }, [open, index, hiSrc, lowSrc, raw]);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count],
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasMultiple) prev();
      else if (e.key === 'ArrowRight' && hasMultiple) next();
    };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, hasMultiple, prev, next, onClose]);

  if (!open || count === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} image` : 'Product image'}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous image"
          className="absolute left-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <figure
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={displaySrc}
          alt={title || 'Product image'}
          className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl bg-white/5 transition-[filter] duration-300 ${sharp ? '' : 'blur-[6px]'}`}
          onError={() => {
            // Fall back to the raw original if the shown version fails.
            if (displaySrc !== raw) { setDisplaySrc(raw); setSharp(true); }
          }}
        />
        {(title || hasMultiple) && (
          <figcaption className="text-white/90 text-sm flex items-center gap-3">
            {title && <span className="font-medium">{title}</span>}
            {hasMultiple && (
              <span className="text-white/60">
                {index + 1} / {count}
              </span>
            )}
          </figcaption>
        )}
      </figure>

      {/* Next */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next image"
          className="absolute right-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>,
    document.body,
  );
};

export default ImageLightbox;
