import { useState, useEffect, useCallback } from "react";

export function useFlipbook() {
  const [currentPage, setCurrentPage] = useState(0); // 0 = cover, 1+ = pages
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(false);

  // Autoplay functionality
  useEffect(() => {
    if (!autoplayEnabled) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => {
        // Auto-advance to next page, stop at end
        if (prev >= 20) { // Assuming max 20 pages for demo
          setAutoplayEnabled(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000); // 3 seconds per page

    return () => clearInterval(interval);
  }, [autoplayEnabled]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, 20)); // Max 20 pages
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const toggleAutoplay = useCallback(() => {
    setAutoplayEnabled((prev) => !prev);
  }, []);

  const toggleThumbnails = useCallback(() => {
    setShowThumbnails((prev) => !prev);
  }, []);

  return {
    currentPage,
    isFullscreen,
    soundEnabled,
    autoplayEnabled,
    zoomLevel,
    showThumbnails,
    goToPage,
    nextPage,
    prevPage,
    toggleFullscreen,
    toggleSound,
    toggleAutoplay,
    setZoomLevel,
    toggleThumbnails,
  };
}
