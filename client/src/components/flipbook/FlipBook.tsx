import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page } from "@shared/schema";
import Toolbar from "./Toolbar";
import ThumbnailsPanel from "./ThumbnailsPanel";
import NavigationControls from "./NavigationControls";

interface FlipBookProps {
  document: Document;
  pages: Page[];
  currentPage: number;
  isFullscreen: boolean;
  soundEnabled: boolean;
  autoplayEnabled: boolean;
  zoomLevel: number;
  showThumbnails: boolean;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
  onToggleAutoplay: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleThumbnails: () => void;
}

export default function FlipBook({
  document: bookDocument,
  pages,
  currentPage,
  isFullscreen,
  soundEnabled,
  autoplayEnabled,
  zoomLevel,
  showThumbnails,
  onPageChange,
  onNextPage,
  onPrevPage,
  onToggleFullscreen,
  onToggleSound,
  onToggleAutoplay,
  onZoomChange,
  onToggleThumbnails,
}: FlipBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          onPrevPage();
          break;
        case "ArrowRight":
          onNextPage();
          break;
        case "Escape":
          if (showThumbnails) {
            onToggleThumbnails();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onPrevPage, onNextPage, onToggleThumbnails, showThumbnails]);

  // Handle fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Play page turn sound
  const playPageTurnSound = () => {
    if (soundEnabled) {
      // Create a simple page turn sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  const handlePageClick = (direction: 'next' | 'prev') => {
    playPageTurnSound();
    if (direction === 'next') {
      onNextPage();
    } else {
      onPrevPage();
    }
  };

  const leftPageIndex = Math.floor((currentPage - 1) / 2) * 2;
  const rightPageIndex = leftPageIndex + 1;

  return (
    <div 
      ref={containerRef}
      className={`flipbook-container ${isFullscreen ? 'fullscreen' : ''}`}
      data-testid="flipbook-container"
    >
      <Toolbar
        zoomLevel={zoomLevel}
        soundEnabled={soundEnabled}
        autoplayEnabled={autoplayEnabled}
        onZoomIn={() => onZoomChange(Math.min(zoomLevel + 0.25, 3))}
        onZoomOut={() => onZoomChange(Math.max(zoomLevel - 0.25, 0.5))}
        onToggleSound={onToggleSound}
        onToggleAutoplay={onToggleAutoplay}
        onToggleThumbnails={onToggleThumbnails}
        onToggleFullscreen={onToggleFullscreen}
      />

      <div className="book-container" style={{ transform: `scale(${zoomLevel})` }}>
        <motion.div 
          ref={bookRef}
          className="book"
          data-testid="book"
        >
          {/* Cover Page */}
          <AnimatePresence>
            {currentPage === 0 && (
              <motion.div
                className="cover-page"
                initial={{ rotateY: 0 }}
                exit={{ rotateY: -180 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                onClick={() => onPageChange(1)}
                data-testid="cover-page"
              >
                <div className="mb-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <i className="fas fa-book text-6xl mb-4 opacity-80"></i>
                    <h2 className="text-3xl font-bold mb-2">{bookDocument.title}</h2>
                    <p className="text-lg opacity-90">Interactive PDF Flipbook</p>
                  </motion.div>
                </div>
                <div className="text-sm opacity-75">
                  <p>Click to open book</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left Page */}
          {currentPage > 0 && leftPageIndex < pages.length && (
            <motion.div
              className="page page-left"
              data-page={leftPageIndex + 1}
              onClick={() => handlePageClick('prev')}
              data-testid={`page-left-${leftPageIndex + 1}`}
            >
              <div className="page-content">
                <img
                  src={pages[leftPageIndex]?.imageUrl}
                  alt={`Page ${leftPageIndex + 1}`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
              </div>
            </motion.div>
          )}

          {/* Right Page */}
          {currentPage > 0 && rightPageIndex < pages.length && (
            <motion.div
              className="page page-right"
              data-page={rightPageIndex + 1}
              onClick={() => handlePageClick('next')}
              data-testid={`page-right-${rightPageIndex + 1}`}
            >
              <div className="page-content">
                <img
                  src={pages[rightPageIndex]?.imageUrl}
                  alt={`Page ${rightPageIndex + 1}`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <NavigationControls
        currentPage={currentPage}
        totalPages={pages.length}
        onPageChange={onPageChange}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />

      <ThumbnailsPanel
        pages={pages}
        currentPage={currentPage}
        isOpen={showThumbnails}
        onPageSelect={onPageChange}
        onClose={onToggleThumbnails}
      />
    </div>
  );
}
