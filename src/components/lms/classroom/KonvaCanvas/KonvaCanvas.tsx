'use client';

import React, { useRef, useState, forwardRef, RefObject, useCallback, useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer } from 'react-konva';
import type { CanvasElement, KonvaCanvasHandle, KonvaCanvasProps } from './utils/types';
import { TextEditorOverlay } from './components/TextEditorOverlay';
import { ElementRenderer } from './components/ElementRenderer';
import { SelectionOverlay } from './components/SelectionOverlay';
import { CanvasContainer } from './components/CanvasContainer';
import { EraserCursorLayer } from './components/EraserCursorLayer';
import { InlineImageToolbar } from './components/InlineImageToolbar';
import { InlineCropOverlay } from './components/InlineCropOverlay';
import { useStageSize } from './components/useStageSize';
import { useLaser } from './components/useLaser';
import { useEraser } from './components/useEraser';
import { useTextEditing } from './components/useTextEditing';
import { useStylusButtons } from './hooks/useStylusButtons';
import { usePinchZoom } from './hooks/usePinchZoom';
import { useKeyboardDelete } from './hooks/useKeyboardDelete';
import { useSelectionSync } from './hooks/useSelectionSync';
import { useElementTransform } from './hooks/useElementTransform';
import { usePointerHandlers } from './hooks/usePointerHandlers';
import { useFitToContent } from './hooks/useFitToContent';
import { useDeleteSelected } from './hooks/useDeleteSelected';
import { useCanvasImperativeHandle } from './hooks/useCanvasImperativeHandle';
import { useGlobalPointerHandlers } from './hooks/useGlobalPointerHandlers';
import { useDrawLayerCleanup } from './hooks/useDrawLayerCleanup';
import { useElementClickHandler } from './hooks/useElementClickHandler';
import { useMarqueeSelection } from './hooks/useMarqueeSelection';
import { useInlineCrop } from './hooks/useInlineCrop';

const KonvaCanvas = forwardRef<KonvaCanvasHandle, KonvaCanvasProps>(function KonvaCanvas(
  {
    elements,
    onElementsChange,
    activeTool,
    strokeColor,
    strokeWidth,
    eraserWidth = 40,
    isDark,
    scale = 1,
    onScaleChange,
    stagePos: stagePosProp,
    onStagePosChange,
    disabled = false,
    onLaserMove,
    textPlaceholder = 'ტექსტი...',
    onCropImage,
    stylusOnly = false,
    onStylusButtonAction,
  },
  ref,
) {
  // ---- Core state ----
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internalStagePos, setInternalStagePos] = useState({ x: 0, y: 0 });

  const stagePos = stagePosProp ?? internalStagePos;
  const setStagePos = useCallback(
    (pos: { x: number; y: number }) => {
      if (onStagePosChange) onStagePosChange(pos);
      else setInternalStagePos(pos);
    },
    [onStagePosChange],
  );

  // ---- Refs ----
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const marqueeLayerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<any>(null);

  const isDrawing = useRef(false);
  const activeShapeRef = useRef<any>(null);
  const activeShapeIdRef = useRef<string>('');
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;
  const isStylusActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  // ---- Stage size ----
  const stageSize = useStageSize(containerRef as RefObject<HTMLDivElement>);

  // ---- Stylus ----
  const { stylusPrimaryHeldRef, stylusSecondaryHeldRef, syncStylusButtonsFromEvent } = useStylusButtons(
    onStylusButtonAction,
  );

  // ---- Selection-derived values ----
  const selectedElement = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : undefined;
  const selectedImage = selectedElement?.type === 'image' ? selectedElement : null;

  // ---- Inline crop ----
  const crop = useInlineCrop({ elementsRef, onElementsChange });
  const isCropping = crop.cropState !== null;

  const handleCropImageClick = useCallback(() => {
    if (selectedImage) crop.enter(selectedImage);
  }, [selectedImage, crop]);

  const cropSelectedImage = useCallback(() => {
    if (selectedImage) crop.enter(selectedImage);
  }, [selectedImage, crop]);

  // ---- Imperative selection for external callers (useImageInput) ----
  const selectElement = useCallback((id: string) => setSelectedIds([id]), []);

  // ---- Text editing ----
  const {
    editingTextId,
    editingTextValue,
    setEditingTextValue,
    currentFontSize,
    editingPos,
    textareaInputRef,
    finishTextEditing,
    startTextInlineEditing,
    updateFontSize,
  } = useTextEditing({
    elementsRef,
    onElementsChange,
    scale,
    stagePos,
    setSelectedIds,
  });

  // ---- Laser ----
  const {
    laserLayerRef,
    isLasering,
    startLaserDrawing,
    addLaserPoint,
    triggerLaserFade,
    renderRemoteLaser,
  } = useLaser();

  // ---- Eraser ----
  const {
    eraserCursorPos,
    setEraserCursorPos,
    isErasing,
    eraseStrokeDirtyRef,
    eraseAtPosition,
    commitErase,
  } = useEraser({
    elementsRef,
    onElementsChange,
    selectedIds,
    setSelectedIds,
    eraserWidth,
    activeTool,
  });

  // ---- Pointer helpers ----
  const getRelativePointerPosition = React.useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return transform.point(pos);
  }, []);

  // ---- Pinch / zoom ----
  const { isPinching, handleTouchStart, handleTouchMove, handleTouchEnd } = usePinchZoom({
    containerRef: containerRef as RefObject<HTMLDivElement>,
    stageRef: stageRef as RefObject<Konva.Stage>,
    drawLayerRef: drawLayerRef as RefObject<Konva.Layer>,
    isDrawing,
    activeShapeRef,
    scale,
    stagePos,
    onScaleChange,
    setStagePos,
    disabled,
  });

  // ---- Marquee ----
  const { startMarquee, updateMarquee, endMarquee } = useMarqueeSelection({
    elementsRef,
    marqueeLayerRef: marqueeLayerRef as RefObject<Konva.Layer>,
    setSelectedIds,
  });

  // ---- Pointer handlers (draw / erase / laser / marquee) ----
  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerHandlers({
    activeTool,
    scale,        
    strokeColor,
    strokeWidth,
    stylusOnly,
    currentFontSize,
    containerRef: containerRef as RefObject<HTMLDivElement>,
    stageRef: stageRef as RefObject<Konva.Stage>,
    drawLayerRef: drawLayerRef as RefObject<Konva.Layer>,
    elementsRef,
    isDrawing,
    activeShapeRef,
    activeShapeIdRef,
    isStylusActiveRef,
    activePointerIdRef,
    isPinching,
    isLasering,
    isErasing,
    eraseStrokeDirtyRef,
    stylusPrimaryHeldRef,
    stylusSecondaryHeldRef,
    eraserCursorPos,
    setSelectedIds,
    setEraserCursorPos,
    getRelativePointerPosition,
    finishTextEditing,
    startTextInlineEditing,
    startLaserDrawing,
    addLaserPoint,
    triggerLaserFade,
    eraseAtPosition,
    commitErase,
    onElementsChange,
    onLaserMove,
    syncStylusButtonsFromEvent,
    startMarquee,
    updateMarquee,
    endMarquee,
  });

  // ---- Element transform (drag / transform) ----
  const { handleDragStart, handleDragMove, handleDragEnd, handleTransformEnd } = useElementTransform({
    elementsRef,
    onElementsChange,
    selectedIds,
    trRef: trRef as RefObject<Konva.Transformer>,
  });

  // ---- Sync selection to the transformer ----
  useSelectionSync(selectedIds, trRef, stageRef as RefObject<Konva.Stage>, mainLayerRef as RefObject<Konva.Layer>);

  // ---- Drag tracking for toolbar visibility ----
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const handleDragStartWrapped = useCallback(
    (id: string, e: any) => {
      if (id === selectedImage?.id) setIsDraggingImage(true);
      handleDragStart(id, e);
    },
    [handleDragStart, selectedImage?.id],
  );

  const handleDragEndWrapped = useCallback(
    (id: string, e: any) => {
      handleDragEnd(id, e);
      // Clear on the next frame so the toolbar position effect re-runs
      // against the updated element positions from the dragend commit.
      requestAnimationFrame(() => setIsDraggingImage(false));
    },
    [handleDragEnd],
  );

  // ---- Fit to content ----
  const fitToContent = useFitToContent({
    containerRef: containerRef as RefObject<HTMLDivElement>,
    stageRef: stageRef as RefObject<Konva.Stage>,
    elementsRef,
    scale,
    setStagePos,
  });

  // ---- Delete selected ----
  const deleteSelected = useDeleteSelected({
    selectedIds,
    setSelectedIds,
    elementsRef,
    onElementsChange,
  });

  // ---- Imperative handle ----
  useCanvasImperativeHandle({
    ref,
    stageRef: stageRef as RefObject<Konva.Stage>,
    trRef,
    mainLayerRef: mainLayerRef as RefObject<Konva.Layer>,
    isDark,
    fitToContent,
    renderRemoteLaser,
    deleteSelected,
    cropSelectedImage,
    selectElement,
  });

  // ---- Global side-effects ----
  useKeyboardDelete(editingTextId, selectedIds, deleteSelected);
  useDrawLayerCleanup(drawLayerRef as RefObject<Konva.Layer>, isDrawing, elements);
  useGlobalPointerHandlers({
    syncStylusButtonsFromEvent,
    commitErase,
    isLasering,
    triggerLaserFade,
    onLaserMove,
  });

  // ---- Element click ----
  const handleElementClick = useElementClickHandler({
    activeTool,
    setSelectedIds,
    startTextInlineEditing,
  });

  // ---- Toolbar position ----
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!selectedImage || activeTool !== 'select' || isCropping || disabled || isDraggingImage) {
      setToolbarPos(null);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne('#' + selectedImage.id);
    if (!node) {
      setToolbarPos(null);
      return;
    }
    const box = node.getClientRect({ skipStroke: true, skipShadow: true });
    const cx = box.x + box.width / 2;
    const above = box.y - 10;
    setToolbarPos({
      x: cx,
      y: above < 44 ? box.y + box.height + 10 : above,
    });
  }, [
    selectedImage,
    activeTool,
    isCropping,
    disabled,
    isDraggingImage,
    elements,
    scale,
    stagePos.x,
    stagePos.y,
  ]);

  return (
    <CanvasContainer containerRef={containerRef as RefObject<HTMLDivElement>} activeTool={activeTool}>
      {editingTextId && (
        <TextEditorOverlay
          editingPos={editingPos}
          currentFontSize={currentFontSize}
          isDark={isDark}
          scale={scale}
          strokeColor={strokeColor}
          editingTextValue={editingTextValue}
          textareaInputRef={textareaInputRef as RefObject<HTMLTextAreaElement>}
          onFontSizeChange={updateFontSize}
          onTextChange={setEditingTextValue}
          onBlur={finishTextEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              finishTextEditing();
            }
          }}
        />
      )}

      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={!disabled && activeTool === 'hand'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
          onPointerDown={(e) => {
            if (isCropping) return;
            if (isPinching.current) return;
            if (editingTextId) {
              finishTextEditing();
              return;
            }
            handlePointerDown(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!isErasing.current) setEraserCursorPos(null);
          }}
          pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2}
        >
          <Layer ref={mainLayerRef}>
            <ElementRenderer
              elements={elements}
              activeTool={activeTool}
              isDark={isDark}
              strokeWidth={strokeWidth}
              editingTextId={editingTextId}
              onElementClick={handleElementClick}
              onDragStart={handleDragStartWrapped}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEndWrapped}
            />
            {!isCropping && (
              <SelectionOverlay
                activeTool={activeTool}
                selectedElements={selectedIds
                  .map((id) => elements.find((el) => el.id === id))
                  .filter((el): el is CanvasElement => Boolean(el))}
                trRef={trRef}
                elementsRef={elementsRef}
                onElementsChange={onElementsChange}
                onTransformEnd={handleTransformEnd}
              />
            )}
          </Layer>
          <Layer ref={drawLayerRef} />
          <Layer ref={marqueeLayerRef} listening={false} />
          <EraserCursorLayer
            activeTool={activeTool}
            eraserCursorPos={eraserCursorPos}
            eraserWidth={eraserWidth}
            isDark={isDark}
          />
          <Layer ref={laserLayerRef} listening={false} />
        </Stage>
      )}

      {/* Inline overlays (DOM) */}
      {!isCropping && toolbarPos && selectedImage && (
        <InlineImageToolbar
          x={toolbarPos.x}
          y={toolbarPos.y}
          onCrop={handleCropImageClick}
          onDelete={() => deleteSelected()}
        />
      )}

      {isCropping && crop.cropState && (
        <InlineCropOverlay
          src={crop.cropState.src}
          naturalW={crop.cropState.naturalW}
          naturalH={crop.cropState.naturalH}
          initialRect={crop.cropState.rect}
          containerW={stageSize.width}
          containerH={stageSize.height}
          onConfirm={(rect) => crop.confirm(rect)}
          onCancel={() => crop.cancel()}
        />
      )}
    </CanvasContainer>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';
export default KonvaCanvas;