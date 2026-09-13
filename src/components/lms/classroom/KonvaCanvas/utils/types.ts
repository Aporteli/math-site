export interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasElement {
  id: string;
  type: string;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  fontSize?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  text?: string;
  src?: string;
  /** Non-destructive crop: source region of `src` to render, in natural pixels. */
  cropRegion?: CropRegion;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  edgeColors?: string[];
  edgeWidths?: number[];
}

export interface KonvaCanvasHandle {
  toDataURL: () => string | null;
  fitToContent: () => void;
  renderRemoteLaser: (point: { x: number; y: number } | null) => void;
  deleteSelected: () => void;
  /** Legacy entry point: enters crop mode for the currently-selected image. */
  cropSelectedImage: () => void;
  /** Imperative selection (used by useImageInput to auto-select new images). */
  selectElement: (id: string) => void;
}

export interface StagePosition {
  x: number;
  y: number;
}

export interface KonvaCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  activeTool: string;
  strokeColor: string;
  strokeWidth: number;
  eraserWidth?: number;
  isDark: boolean;
  scale?: number;
  onScaleChange?: (newScale: number) => void;
  stagePos?: StagePosition;
  onStagePosChange?: (pos: StagePosition) => void;
  disabled?: boolean;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
  textPlaceholder?: string;
  onPasteImage?: (dataUrl: string, pos?: { x: number; y: number }) => void;
  onCropImage?: (el: CanvasElement) => void;
  stylusOnly?: boolean;
  onStylusButtonAction?: (buttonIndex: 1 | 2, state: 'down' | 'up') => void;
}

export interface LaserPoint {
  x: number;
  y: number;
}