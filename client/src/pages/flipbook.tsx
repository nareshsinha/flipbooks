import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import UploadInterface from "@/components/flipbook/UploadInterface";
import FlipBook from "@/components/flipbook/FlipBook";
import { useFlipbook } from "@/hooks/use-flipbook";

export default function FlipBookPage() {
  const params = useParams();
  const documentId = params.id;

  const { data: documentData, isLoading } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  }) as { data?: { document: any, pages: any[] }, isLoading: boolean };

  const {
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
  } = useFlipbook(documentData?.pages?.length || 0);

  if (!documentId) {
    return <UploadInterface />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Loading Document</h3>
          <p className="text-muted-foreground">
            Preparing your flipbook...
          </p>
        </div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Document Not Found</h3>
          <p className="text-muted-foreground">
            The requested document could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FlipBook
      document={documentData.document}
      pages={documentData.pages}
      currentPage={currentPage}
      isFullscreen={isFullscreen}
      soundEnabled={soundEnabled}
      autoplayEnabled={autoplayEnabled}
      zoomLevel={zoomLevel}
      showThumbnails={showThumbnails}
      onPageChange={goToPage}
      onNextPage={nextPage}
      onPrevPage={prevPage}
      onToggleFullscreen={toggleFullscreen}
      onToggleSound={toggleSound}
      onToggleAutoplay={toggleAutoplay}
      onZoomChange={setZoomLevel}
      onToggleThumbnails={toggleThumbnails}
    />
  );
}
