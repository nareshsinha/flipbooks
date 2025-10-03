import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page } from "@shared/schema";
import Toolbar from "./Toolbar";
import ThumbnailsPanel from "./ThumbnailsPanel";
import NavigationControls from "./NavigationControls";

// Sound types
type SoundType = 'classic' | 'paper' | 'book' | 'light' | 'heavy' | 'none';

// Sound configuration
const SOUND_CONFIG = {
  classic: '/sounds/page-turn-1.mp3',
  paper: '/sounds/paper-rustle.mp3',
  book: '/sounds/book-flip.mp3',
  light: '/sounds/light-turn.mp3',
  heavy: '/sounds/heavy-turn.mp3'
};

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
  const [actualFullscreen, setActualFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragPosition>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<DragPosition>({ x: 0, y: 0 });
  const [currentDragOffset, setCurrentDragOffset] = useState<DragPosition>({ x: 0, y: 0 });
  const [pageTurnState, setPageTurnState] = useState<PageTurnState>({
    isTurning: false,
    direction: null,
    turningPage: null
  });
  const safeZoomLevel = Math.max(zoomLevel, 1);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Calculate pages to display based on device type
  const getPagesToDisplay = () => {
    if (isMobile) {
      // Mobile: Show single page
      return {
        leftPageIndex: currentPage > 0 ? currentPage - 1 : -1,
        rightPageIndex: -1 // No right page on mobile
      };
    } else {
      // Desktop: Show two-page spread
      const leftPageIndex = Math.floor((currentPage - 1) / 2) * 2;
      const rightPageIndex = leftPageIndex + 1;
      return { leftPageIndex, rightPageIndex };
    }
  };



  // Sync with actual fullscreen state
  const checkFullscreen = useCallback(() => {
    setActualFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, [checkFullscreen]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreen = async () => {
      try {
        if (isFullscreen && !document.fullscreenElement) {
          // Enter fullscreen
          await document.documentElement.requestFullscreen?.();
        } else if (!isFullscreen && document.fullscreenElement) {
          // Exit fullscreen only if we're actually in fullscreen
          await document.exitFullscreen?.();
        }
      } catch (error) {
        console.error('Fullscreen error:', error);
        // If fullscreen fails, sync the state back
        onToggleFullscreen();
      }
    };

    handleFullscreen();
  }, [isFullscreen, onToggleFullscreen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pageTurnState.isTurning) return;
      switch (e.key) {
        case "ArrowLeft":
          onPrevPage();
          break;
        case "ArrowRight":
          onNextPage();
          break;
        case "Escape":
          if (isFullscreen) {
            onToggleFullscreen();
          } else if (showThumbnails) {
            onToggleThumbnails();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onPrevPage, onNextPage, onToggleThumbnails, showThumbnails, isFullscreen, onToggleFullscreen,  pageTurnState.isTurning]);

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setCurrentDragOffset({ x: 0, y: 0 });
  }, [currentPage, safeZoomLevel]);

  const checkFileExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };
  // Play page turn sound
  const playPageTurnSound = async () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Fetch the MP3 file from public folder
      const response = await fetch('/src/sounds/page-flip-01a.mp3');
      if (!response.ok) throw new Error('Failed to load sound file');
      const arrayBuffer = await response.arrayBuffer();
      // Decode audio data into AudioBuffer
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      // Create buffer source and connect to context destination
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      // Start playing the sound
      source.start();
    } catch (error) {
      console.error('Audio error:', error);
    }
  };

  // Page turn animation handler
  const handlePageTurn = async (direction: 'next' | 'prev') => {
    if (pageTurnState.isTurning) return;

    setPageTurnState({
      isTurning: true,
      direction,
      turningPage: direction === 'next' ? currentPage : currentPage - 1
    });

    playPageTurnSound();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    // Change page after animation
    if (direction === 'next') {
      onNextPage();
    } else {
      onPrevPage();
    }

    // Reset turn state
    setPageTurnState({
      isTurning: false,
      direction: null,
      turningPage: null
    });
  };

  const handlePageClick = (direction: 'next' | 'prev') => {
    if (safeZoomLevel <= 1 || !isDragging) {
      handlePageTurn(direction);
    }
  };

  const handlePageClickxxx = (direction: 'next' | 'prev') => {
    // Only handle click if not zoomed or not dragging
    if (safeZoomLevel <= 1 || !isDragging) {
      playPageTurnSound();
      if (direction === 'next') {
        onNextPage();
      } else {
        onPrevPage();
      }
    }
  };
  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    //if (safeZoomLevel  <= 1) return; // Only allow drag when zoomed in
    if (safeZoomLevel <= 1 || pageTurnState.isTurning) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragStart({ x: clientX - currentDragOffset.x, y: clientY - currentDragOffset.y });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    //if (!isDragging || safeZoomLevel  <= 1) return;
    if (!isDragging || safeZoomLevel <= 1 || pageTurnState.isTurning) return;

    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    // Calculate bounds based on zoom level
    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const maxX = Math.max(0, (containerRect.width * (safeZoomLevel  - 1)) / 2);
      const maxY = Math.max(0, (containerRect.height * (safeZoomLevel  - 1)) / 2);

      // Constrain movement within bounds
      const constrainedX = Math.max(-maxX, Math.min(maxX, newX));
      const constrainedY = Math.max(-maxY, Math.min(maxY, newY));

      setCurrentDragOffset({ x: constrainedX, y: constrainedY });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOffset(currentDragOffset);
  };

  // Add event listeners for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e as unknown as React.MouseEvent);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleDragMove(e as unknown as React.TouchEvent);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart, currentDragOffset, safeZoomLevel, pageTurnState.isTurning ]);

  // const leftPageIndex = Math.floor((currentPage - 1) / 2) * 2;
  // const rightPageIndex = leftPageIndex + 1;

  const { leftPageIndex, rightPageIndex } = getPagesToDisplay();
  // Calculate transform style for zoom and drag
  const getTransformStyle = () => {
    const zoomTransform = `scale(${safeZoomLevel })`;
    const dragTransform = safeZoomLevel  > 1 ? `translate(${currentDragOffset.x}px, ${currentDragOffset.y}px)` : '';
    return `${zoomTransform} ${dragTransform}`.trim();
  };

  // Calculate book thickness based on page count
  const bookThickness = Math.min(pages.length * 0.5, 30); // Max 30px thickness

   return (
    <div
      ref={containerRef}
      className={`flipbook-container ${isFullscreen ? 'fullscreen' : ''} ${isMobile ? 'mobile' : 'desktop'} ${isDragging ? 'dragging' : ''}`}
      data-testid="flipbook-container"
    >
      <Toolbar
        zoomLevel={safeZoomLevel }
        soundEnabled={soundEnabled}
        autoplayEnabled={autoplayEnabled}
        onZoomIn={() => onZoomChange(Math.min(safeZoomLevel  + 0.25, 3))}
        onZoomOut={() => onZoomChange(Math.max(safeZoomLevel  - 0.25, 0.5))}
        onToggleSound={onToggleSound}
        onToggleAutoplay={onToggleAutoplay}
        onToggleThumbnails={onToggleThumbnails}
        onToggleFullscreen={onToggleFullscreen}
        onResetView={() => {
          setDragOffset({ x: 0, y: 0 });
          setCurrentDragOffset({ x: 0, y: 0 });
        }}
      />

      <div 
        className="book-container" 
        style={{ transform: getTransformStyle() }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Book Spine/Thickness */}
        <div 
          className="book-spine"
          style={{
            width: `${bookThickness}px`,
            left: `-${bookThickness}px`
          }}
        />
        <motion.div
          ref={bookRef}
          className={`book ${safeZoomLevel  > 1 ? 'zoom-mode' : ''} ${pageTurnState.isTurning ? 'page-turning' : ''}`}
          data-testid="book"
          style={{
            '--left-thickness': `${bookThickness}px`,
            '--right-thickness': `${bookThickness}px`,
          } as React.CSSProperties} 
        >


          {/* Cover Page */}
          <AnimatePresence>
            {currentPage === 0 && (
              <motion.div
                className={`cover-page ${isMobile ? 'mobile-cover' : ''}`}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 0 }}
                exit={{ 
                  rotateY: -180,
                  transition: { duration: 0.8, ease: "easeInOut" }
                }}
                onClick={() => handlePageTurn('next')}
                //transition={{ duration: 0.8, ease: "easeInOut" }}
                //onClick={() => onPageChange(1)}
                data-testid="cover-page"
              >
                <div className="page-thickness left-thickness" />
                <div className="md:mb-6">
                  <img
                    src={`/src/${pages[0]?.documentId}-cover.png`}
                    alt={`Cover Image`}
                    className="coverimg rounded"
                    loading="lazy"
                    data-src={`${pages[0]?.thumbnailPath}`}
                    onError={(e) => {
                      console.error('Failed to load image:', pages[0]?.thumbnailPath);
                    }}
                  />
                </div>

                <div className="mb-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Optional: Add cover content here */}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Page Turn Animation */}
          {/* <AnimatePresence>
            {pageTurnState.isTurning && pageTurnState.turningPage && (
              <motion.div
                className={`turning-page ${pageTurnState.direction === 'next' ? 'turn-next' : 'turn-prev'}`}
                initial={{ 
                  rotateY: 0,
                  transformOrigin: pageTurnState.direction === 'next' ? 'left center' : 'right center'
                }}
                animate={{ 
                  rotateY: pageTurnState.direction === 'next' ? -180 : 180
                }}
                exit={{ 
                  rotateY: pageTurnState.direction === 'next' ? -180 : 180
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeInOut"
                }}
              >
                <div className="page-thickness turning-thickness" />
                <div className="page-content">
                  <img
                    src={pages[pageTurnState.turningPage - 1]?.imagePath}
                    alt={`Page ${pageTurnState.turningPage}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence> */}



          {/* Mobile Single Page */}
          {isMobile && currentPage > 0 && currentPage <= pages.length && (
            <motion.div
              className="page mobile-page"
              data-page={currentPage}
              onClick={() => handlePageClick('next')}
              data-testid={`mobile-page-${currentPage}`}
            >
              <div className="page-content">
                <img
                  src={pages[currentPage - 1]?.imagePath}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain rounded"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load image:', pages[currentPage - 1]?.imagePath);
                    // Add fallback handling
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Desktop Two-Page Spread */}
          {!isMobile && (
            <>
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
                      src={pages[leftPageIndex]?.imagePath}
                      alt={`Page ${leftPageIndex + 1}`}
                      className="w-full h-full object-contain rounded"
                      loading="lazy"
                      data-src={`${pages[leftPageIndex]?.documentId}`}
                      onError={(e) => {
                        console.error('Failed to load image:', pages[leftPageIndex]?.imagePath);
                      }}
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
                      src={pages[rightPageIndex]?.imagePath}
                      alt={`Page ${rightPageIndex + 1}`}
                      className="w-full h-full object-contain rounded"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Failed to load image:', pages[rightPageIndex]?.imagePath);
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
        {/* Right Book Spine/Thickness */}
        <div 
          className="book-spine right-spine"
          style={{
            width: `${bookThickness}px`,
            right: `-${bookThickness}px`
          }}
        />
      </div>

      <NavigationControls
        currentPage={currentPage}
        totalPages={pages.length}
        onPageChange={onPageChange}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        isMobile={isMobile}
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