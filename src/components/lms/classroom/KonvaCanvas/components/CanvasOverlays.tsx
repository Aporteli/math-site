import type { ReactNode, RefObject } from 'react';
import type { CanvasElement, CropRegion } from '../utils/types';
import type { CropState } from '../hooks/useInlineCrop';
import { TextEditorOverlay } from './TextEditorOverlay';
import { InlineImageToolbar } from './InlineImageToolbar';
import { InlineCropOverlay } from './InlineCropOverlay';
import { SelectionDeleteButton } from './SelectionDeleteButton';

interface CanvasOverlaysProps {
  editingTextId: string | null;
  editingPos: { x: number; y: number; width: number };
  currentFontSize: number;
  isDark: boolean;
  scale: number;
  strokeColor: string;
  editingTextValue: string;
  textareaInputRef: RefObject<HTMLTextAreaElement | null>;
  onFontSizeChange: (size: number) => void;
  onTextChange: (value: string) => void;
  finishTextEditing: () => void;
  isCropping: boolean;
  toolbarPos: { x: number; y: number } | null;
  selectedImage: CanvasElement | null;
  onCrop: () => void;
  deletePos: { x: number; y: number } | null;
  deleteSelected: () => void;
  cropState: CropState | null;
  stageSize: { width: number; height: number };
  confirmCrop: (rect: CropRegion) => void;
  cancelCrop: () => void;
  children: ReactNode;
}

export function CanvasOverlays({
  editingTextId,
  editingPos,
  currentFontSize,
  isDark,
  scale,
  strokeColor,
  editingTextValue,
  textareaInputRef,
  onFontSizeChange,
  onTextChange,
  finishTextEditing,
  isCropping,
  toolbarPos,
  selectedImage,
  onCrop,
  deletePos,
  deleteSelected,
  cropState,
  stageSize,
  confirmCrop,
  cancelCrop,
  children,
}: CanvasOverlaysProps) {
  return (
    <>
      {editingTextId && (
        <TextEditorOverlay
          editingPos={editingPos}
          currentFontSize={currentFontSize}
          isDark={isDark}
          scale={scale}
          strokeColor={strokeColor}
          editingTextValue={editingTextValue}
          textareaInputRef={textareaInputRef as RefObject<HTMLTextAreaElement>}
          onFontSizeChange={onFontSizeChange}
          onTextChange={onTextChange}
          onBlur={finishTextEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              finishTextEditing();
            }
          }}
        />
      )}

      {children}

      {!isCropping && toolbarPos && selectedImage && (
        <InlineImageToolbar x={toolbarPos.x} y={toolbarPos.y} onCrop={onCrop} onDelete={() => deleteSelected()} />
      )}

      {!isCropping && deletePos && <SelectionDeleteButton x={deletePos.x} y={deletePos.y} onDelete={() => deleteSelected()} />}

      {isCropping && cropState && (
        <InlineCropOverlay
          src={cropState.src}
          naturalW={cropState.naturalW}
          naturalH={cropState.naturalH}
          initialRect={cropState.rect}
          containerW={stageSize.width}
          containerH={stageSize.height}
          onConfirm={(rect) => confirmCrop(rect)}
          onCancel={() => cancelCrop()}
        />
      )}
    </>
  );
}
