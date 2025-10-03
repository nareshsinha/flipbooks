import { Page } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThumbnailsPanelProps {
  pages: Page[];
  currentPage: number;
  isOpen: boolean;
  onPageSelect: (page: number) => void;
  onClose: () => void;
}

export default function ThumbnailsPanel({
  pages,
  currentPage,
  isOpen,
  onPageSelect,
  onClose,
}: ThumbnailsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="thumbnails-panel open"
          initial={{ x: 350 }}
          animate={{ x: 0 }}
          exit={{ x: 350 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          data-testid="thumbnails-panel"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Page Thumbnails</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-close-thumbnails"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {pages.map((page) => (
              <motion.div
                key={page.id}
                className={`thumbnail ${currentPage === page.pageNumber ? 'active' : ''} relative cursor-pointer`}
                onClick={() => onPageSelect(page.pageNumber)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`thumbnail-page-${page.pageNumber}`}
              >
                <img
                  src={page.thumbnailPath}
                  alt={`Page ${page.pageNumber} thumbnail`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load image:', page.thumbnailPath);
                    // Add fallback handling
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                  {page.pageNumber}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
