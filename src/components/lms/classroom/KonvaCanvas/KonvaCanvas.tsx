'use client';

import { forwardRef, useCallback, useState, type RefObject } from 'react';
import Konva from 'konva';
import type { KonvaCanvasHandle, KonvaCanvasProps } from './utils/types';
import { CanvasContainer } from './components/CanvasContainer';
import { CanvasOverlays } from './components/CanvasOverlays';
import { CanvasStage } from './components/CanvasStage';
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
import { useDrawLayerCleanup } from './hooks/useDrawLayerCleanup';
import { useGlobalPointerHandlers } from './hooks/useGlobalPointerHandlers';
import { useElementClickHandler } from './hooks/useElementClickHandler';
import { useMarqueeSelection } from './hooks/useMarqueeSelection';
import { useInlineCrop } from './hooks/useInlineCrop';
import { useMiddleButtonPan } from './hooks/useMiddleButtonPan';
import { useCanvasRefs } from './hooks/useCanvasRefs';
import { useStagePosition } from './hooks/useStagePosition';
import { useRelativePointerPosition } from './hooks/useRelativePointerPosition';
import { useCropSelection } from './hooks/useCropSelection';
import { useConnectedGroupDrag } from './hooks/useConnectedGroupDrag';
import { useCopySelectedImage } from './hooks/useCopySelectedImage';
import { useWhiteboardPaintNote } from './hooks/useWhiteboardPaintNote';
import { useImageToolbarPosition } from './hooks/useImageToolbarPosition';
import { useDeleteButtonPosition } from './hooks/useDeleteButtonPosition';

Konva.dragButtons = [0];

const KonvaCanvas = forwardRef<KonvaCanvasHandle, KonvaCanvasProps>(function KonvaCanvas(
  {
    elements,
    onElementsChange,
    activeTool,
    selectionMode = 'rect',
    strokeColor,
    strokeWidth,
    eraserWidth = 40,
    isDark,
    scale = 1,
    stagePos: stagePosProp,
    onStagePosChange,
    disabled = false,
    onLaserMove,
    onLiveStroke,
    stylusOnly = false,
    onStylusButtonAction,
    penSmoothIntensity = 0,
  },
  ref,
) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { stagePos, setStagePos } = useStagePosition(stagePosProp, onStagePosChange);
  const {
    containerRef,
    stageRef,
    mainLayerRef,
    drawLayerRef,
    marqueeLayerRef,
    trRef,
    isDrawing,
    activeShapeRef,
    activeShapeIdRef,
    elementsRef,
    isStylusActiveRef,
    activePointerIdRef,
  } = useCanvasRefs(elements);

  const stageSize = useStageSize(containerRef as RefObject<HTMLDivElement>);

  const { stylusPrimaryHeldRef, stylusSecondaryHeldRef, syncStylusButtonsFromEvent } =
    useStylusButtons(onStylusButtonAction);

  const selectedElement = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : undefined;
  const selectedImage = selectedElement?.type === 'image' ? selectedElement : null;

  const crop = useInlineCrop({ elementsRef, onElementsChange });
  const isCropping = crop.cropState !== null;
  const { handleCropImageClick, cropSelectedImage } = useCropSelection(selectedImage, crop);
  const selectElement = useCallback((id: string) => setSelectedIds([id]), []);

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

  const {
    laserLayerRef,
    isLasering,
    startLaserDrawing,
    addLaserPoint,
    triggerLaserFade,
    renderRemoteLaser,
    renderRemoteInk,
  } = useLaser();

  const { eraserCursorPos, setEraserCursorPos, isErasing, eraseStrokeDirtyRef, eraseAtPosition, commitErase } =
    useEraser({
      elementsRef,
      onElementsChange,
      selectedIds,
      setSelectedIds,
      eraserWidth,
      activeTool,
    });

  const getRelativePointerPosition = useRelativePointerPosition(stageRef);

  const { isPinching, handleTouchStart, handleTouchMove, handleTouchEnd } = usePinchZoom({
    stageRef: stageRef as RefObject<Konva.Stage>,
    drawLayerRef: drawLayerRef as RefObject<Konva.Layer>,
    isDrawing,
    activeShapeRef,
    stagePos,
    setStagePos,
    disabled,
  });

  const { startMarquee, updateMarquee, endMarquee } = useMarqueeSelection({
    elementsRef,
    marqueeLayerRef: marqueeLayerRef as RefObject<Konva.Layer>,
    setSelectedIds,
    mode: selectionMode,
  });

  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerHandlers({
    activeTool,
    scale,
    strokeColor,
    strokeWidth,
    stylusOnly,
    currentFontSize,
    penSmoothIntensity,
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

  const middlePan = useMiddleButtonPan({
    stageRef: stageRef as RefObject<Konva.Stage>,
    setStagePos,
    disabled,
  });

  const { handleDragStart, handleDragMove, handleDragEnd, handleTransformEnd } = useElementTransform({
    elementsRef,
    onElementsChange,
    selectedIds,
    trRef,
  });

  useSelectionSync(selectedIds, trRef, stageRef as RefObject<Konva.Stage>, mainLayerRef as RefObject<Konva.Layer>);

  const { isDraggingImage, handleDragStartWrapped, handleDragMoveWrapped, handleDragEndWrapped } =
    useConnectedGroupDrag({
      elementsRef,
      stageRef,
      onElementsChange,
      selectedImageId: selectedImage?.id,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
    });

  const fitToContent = useFitToContent({
    containerRef: containerRef as RefObject<HTMLDivElement>,
    stageRef: stageRef as RefObject<Konva.Stage>,
    elementsRef,
    scale,
    setStagePos,
  });

  const deleteSelected = useDeleteSelected({
    selectedIds,
    setSelectedIds,
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
    renderRemoteInk,
    deleteSelected,
    cropSelectedImage,
    selectElement,
  });

  useKeyboardDelete(editingTextId, selectedIds, deleteSelected);
  useCopySelectedImage(disabled, selectedImage);
  useDrawLayerCleanup(drawLayerRef as RefObject<Konva.Layer>, isDrawing, elements);
  useWhiteboardPaintNote(elements, stageRef);
  useGlobalPointerHandlers({
    syncStylusButtonsFromEvent,
    commitErase,
    isLasering,
    triggerLaserFade,
    onLaserMove,
  });

  const handleElementClick = useElementClickHandler({
    activeTool,
    setSelectedIds,
    startTextInlineEditing,
  });

  const toolbarPos = useImageToolbarPosition({
    selectedImage,
    activeTool,
    isCropping,
    disabled,
    isDraggingImage,
    elements,
    scale,
    stagePos,
    stageRef,
  });

  const deletePos = useDeleteButtonPosition({
    selectedIds,
    selectedImage,
    activeTool,
    isCropping,
    disabled,
    elements,
    scale,
    stagePos,
    stageRef,
  });

  return (
    <CanvasContainer containerRef={containerRef as RefObject<HTMLDivElement>} activeTool={activeTool}>
      <CanvasOverlays
        editingTextId={editingTextId}
        editingPos={editingPos}
        currentFontSize={currentFontSize}
        isDark={isDark}
        scale={scale}
        strokeColor={strokeColor}
        editingTextValue={editingTextValue}
        textareaInputRef={textareaInputRef}
        onFontSizeChange={updateFontSize}
        onTextChange={setEditingTextValue}
        finishTextEditing={finishTextEditing}
        isCropping={isCropping}
        toolbarPos={toolbarPos}
        selectedImage={selectedImage}
        onCrop={handleCropImageClick}
        deletePos={deletePos}
        deleteSelected={deleteSelected}
        cropState={crop.cropState}
        stageSize={stageSize}
        confirmCrop={(rect) => crop.confirm(rect)}
        cancelCrop={() => crop.cancel()}
      >
        <CanvasStage
          stageRef={stageRef}
          mainLayerRef={mainLayerRef}
          drawLayerRef={drawLayerRef}
          marqueeLayerRef={marqueeLayerRef}
          laserLayerRef={laserLayerRef}
          trRef={trRef}
          elementsRef={elementsRef}
          stageSize={stageSize}
          scale={scale}
          stagePos={stagePos}
          disabled={disabled}
          activeTool={activeTool}
          isDark={isDark}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          elements={elements}
          editingTextId={editingTextId}
          isCropping={isCropping}
          eraserCursorPos={eraserCursorPos}
          selectedIds={selectedIds}
          isDrawing={isDrawing}
          activeShapeRef={activeShapeRef}
          isPinching={isPinching}
          isErasing={isErasing}
          setStagePos={setStagePos}
          setEraserCursorPos={setEraserCursorPos}
          finishTextEditing={finishTextEditing}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          middlePan={middlePan}
          onLiveStroke={onLiveStroke}
          onElementsChange={onElementsChange}
          onElementClick={handleElementClick}
          onDragStart={handleDragStartWrapped}
          onDragMove={handleDragMoveWrapped}
          onDragEnd={handleDragEndWrapped}
          onTransformEnd={handleTransformEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </CanvasOverlays>
    </CanvasContainer>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';
export default KonvaCanvas;
