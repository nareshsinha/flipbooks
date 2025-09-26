import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavigationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function NavigationControls({
  currentPage,
  totalPages,
  onPageChange,
  onPrevPage,
  onNextPage,
}: NavigationControlsProps) {
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
          className="mr-4 hover:text-primary transition-colors"
          data-testid="button-prev-page"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <span data-testid="page-count">
          Page {currentPage === 0 ? 'Cover' : currentPage} of {totalPages}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="ml-4 hover:text-primary transition-colors"
          data-testid="button-next-page"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
