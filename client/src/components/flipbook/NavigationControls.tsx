import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavigationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  isMobile?: boolean;
}

export default function NavigationControls({
  currentPage,
  totalPages,
  onPageChange,
  onPrevPage,
  onNextPage,
  isMobile = false,
}: NavigationControlsProps) {

  const getPageRangeText = () => {
    if (currentPage === 0) {
      return `Cover / ${totalPages}`;
    }

    if (isMobile) {
      // Mobile shows single pages: "1/25", "2/25", etc.
      return `${currentPage} / ${totalPages}`;
    }

    // Desktop shows current page range: "1-2/25", "3-4/25", etc.
    const leftPage = Math.floor((currentPage - 1) / 2) * 2 + 1;
    const rightPage = Math.min(leftPage + 1, totalPages);

    if (leftPage === rightPage) {
      return `${leftPage} / ${totalPages}`;
    }

    return `${leftPage}-${rightPage} / ${totalPages}`;
  };

  return (
    <>
    
      {/* Navigation Slider */}
      <div className="navigation-slider" data-testid="navigation-slider">
        <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
          <span>Page Navigation</span>
          <span data-testid="page-indicator">
            {currentPage} / {totalPages}
          </span>
        </div>
        <Slider
          value={[currentPage]}
          onValueChange={([value]) => onPageChange(value)}
          max={totalPages}
          min={0}
          step={1}
          className="w-full"
          data-testid="slider-page-navigation"
        />
      </div>

      {/* Pagination */}
      <div className="pagination" data-testid="pagination">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevPage}
          disabled={currentPage <= 0}
          className="mr-4 pgbtn"
          data-testid="button-prev-page"
          title="Previous Page"
          style={{
            color: '#FFF',
            transition: 'all 0.3s ease',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(185, 28, 28, 0.9)';
              e.target.style.transform = 'translateY(0)';
            }
          }}
          onMouseUp={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* <span data-testid="page-count"> Page {currentPage === 0 ? '1' : currentPage} / {totalPages} </span> */}
        <span data-testid="page-count" className="page-range-text"> Page {getPageRangeText()} </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="ml-4 pgbtn"
          data-testid="button-next-page"
          title="Next Page"
          style={{
            color: '#FFF',
            transition: 'all 0.3s ease',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(185, 28, 28, 0.9)';
              e.target.style.transform = 'translateY(0)';
            }
          }}
          onMouseUp={(e) => {
            if (currentPage < totalPages) {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
