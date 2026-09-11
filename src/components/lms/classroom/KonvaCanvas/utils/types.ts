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
    stroke: string;
    strokeWidth: number;
    fill?: string;
  }
  
  export interface KonvaCanvasHandle {
    toDataURL: () => string | null;
    fitToContent: () => void;
    renderRemoteLaser: (point: { x: number; y: number } | null) => void;
    deleteSelected: () => void;
    cropSelectedImage: () => void;
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