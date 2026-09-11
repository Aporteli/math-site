'use client';

import React, { useRef, useState, forwardRef, RefObject, useCallback } from 'react';
import Konva from 'konva';
import { Stage, Layer } from 'react-konva';
import type { CanvasElement, KonvaCanvasHandle, KonvaCanvasProps } from './utils/types';
import { TextEditorOverlay } from './components/TextEditorOverlay';
import { ElementRenderer } from './components/ElementRenderer';
import { SelectionOverlay } from './components/SelectionOverlay';
import { CanvasContainer } from './components/CanvasContainer';
import { EraserCursorLayer } from './components/EraserCursorLayer';
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
    onLaserMove,
    textPlaceholder = 'ტექსტი...',
    onCropImage,
    stylusOnly = false,
    onStylusButtonAction,
  },
  ref,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<any>(null);

  const isDrawing = useRef(false);
  const activeShapeRef = useRef<any>(null);
  const activeShapeIdRef = useRef<string>('');
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;
  const isStylusActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const stageSize = useStageSize(containerRef as RefObject<HTMLDivElement>);

  const { stylusPrimaryHeldRef, stylusSecondaryHeldRef, syncStylusButtonsFromEvent } = useStylusButtons(
    onStylusButtonAction,
  );

  const selectedElement = elements.find((el) => el.id === selectedId);
  const selectedImage = selectedElement?.type === 'image' ? selectedElement : null;

  const cropSelectedImage = useCallback(() => {
    if (selectedImage && onCropImage) onCropImage(selectedImage);
  }, [selectedImage, onCropImage]);

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
    setSelectedId,
  });

  const {
    laserLayerRef,
    isLasering,
    startLaserDrawing,
    addLaserPoint,
    triggerLaserFade,
    renderRemoteLaser,
  } = useLaser();

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
    selectedId,
    setSelectedId,
    eraserWidth,
    activeTool,
  });

  const getRelativePointerPosition = React.useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return transform.point(pos);
  }, []);

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
  });

  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerHandlers({
    activeTool,
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
    setSelectedId,
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
  });

  const { handleDragEnd, handleTransformEnd } = useElementTransform({ elementsRef, onElementsChange });

  useSelectionSync(selectedId, trRef, stageRef as RefObject<Konva.Stage>, mainLayerRef as RefObject<Konva.Layer>);

  const fitToContent = useFitToContent({
    containerRef: containerRef as RefObject<HTMLDivElement>,
    stageRef: stageRef as RefObject<Konva.Stage>,
    elementsRef,
    scale,
    setStagePos,
  });

  const deleteSelected = useDeleteSelected({
    selectedId,
    setSelectedId,
    elementsRef,
    onElementsChange,
  });

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
  });

  useKeyboardDelete(editingTextId, selectedId, deleteSelected);

  useDrawLayerCleanup(drawLayerRef as RefObject<Konva.Layer>, isDrawing, elements);

  useGlobalPointerHandlers({
    syncStylusButtonsFromEvent,
    commitErase,
    isLasering,
    triggerLaserFade,
    onLaserMove,
  });

  const handleElementClick = useElementClickHandler({
    activeTool,
    setSelectedId,
    startTextInlineEditing,
  });

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
          draggable={activeTool === 'hand'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
          onPointerDown={(e) => {
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
          pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2}>
          <Layer ref={mainLayerRef}>
            <ElementRenderer
              elements={elements}
              activeTool={activeTool}
              isDark={isDark}
              strokeWidth={strokeWidth}
              editingTextId={editingTextId}
              onElementClick={handleElementClick}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
            <SelectionOverlay
              activeTool={activeTool}
              selectedElement={selectedElement}
              trRef={trRef}
              elementsRef={elementsRef}
              onElementsChange={onElementsChange}
            />
          </Layer>
          <Layer ref={drawLayerRef} />
          <EraserCursorLayer
            activeTool={activeTool}
            eraserCursorPos={eraserCursorPos}
            eraserWidth={eraserWidth}
            isDark={isDark}
          />
          <Layer ref={laserLayerRef} listening={false} />
        </Stage>
      )}
    </CanvasContainer>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';
export default KonvaCanvas;