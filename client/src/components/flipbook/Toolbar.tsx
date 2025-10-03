import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ZoomIn, 
  ZoomOut, 
  Grid3x3, 
  Play, 
  Pause,
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Upload
} from "lucide-react";
import { useLocation } from "wouter";

interface ToolbarProps {
  zoomLevel: number;
  soundEnabled: boolean;
  autoplayEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSound: () => void;
  onToggleAutoplay: () => void;
  onToggleThumbnails: () => void;
  onToggleFullscreen: () => void;
  onResetView: () => void;
}

export default function Toolbar({
  zoomLevel,
  soundEnabled,
  autoplayEnabled,
  onZoomIn,
  onZoomOut,
  onToggleSound,
  onToggleAutoplay,
  onToggleThumbnails,
  onToggleFullscreen,
}: ToolbarProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="toolbar" data-testid="toolbar">
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={zoomLevel <= 0.5}
        className="toolbar-btn"
        data-testid="button-zoom-out"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={zoomLevel >= 3}
        className="toolbar-btn"
        data-testid="button-zoom-in"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleThumbnails}
        className="toolbar-btn"
        data-testid="button-thumbnails"
        title="Thumbnails"
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleAutoplay}
        className={`toolbar-btn ${autoplayEnabled ? 'active' : ''}`}
        data-testid="button-autoplay"
        title="Autoplay"
      >
        {autoplayEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSound}
        className={`toolbar-btn ${soundEnabled ? 'active' : ''}`}
        data-testid="button-sound"
        title="Sound Effects"
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleFullscreen}
        className="toolbar-btn"
        data-testid="button-fullscreen"
        title="Fullscreen"
      >
        <Maximize className="w-4 h-4" />
      </Button>

      {/* <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/")}
        className="toolbar-btn"
        data-testid="button-new-book"
        title="New Book"
      >
        <Upload className="w-4 h-4" />
      </Button> */}
    </div>
  );
}
