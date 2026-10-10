'use client';

import type { RefObject } from 'react';
import type { useWhiteboardPrefs } from '../hooks/useWhiteboardPrefs';
import type { useToolbarMenus } from '../hooks/useToolbarMenus';
import type { useBoardCommands } from '../hooks/useBoardCommands';
import { TopToolbar } from './TopToolbar';

interface Props {
  isTeacher: boolean;
  canDraw: boolean;
  isLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  prefs: ReturnType<typeof useWhiteboardPrefs>;
  menus: ReturnType<typeof useToolbarMenus>;
  imageMenuRef: RefObject<HTMLDivElement | null>;
  penMenuRef: RefObject<HTMLDivElement | null>;
  eraserMenuRef: RefObject<HTMLDivElement | null>;
  shapesMenuRef: RefObject<HTMLDivElement | null>;
  colorMenuRef: RefObject<HTMLDivElement | null>;
  stylusMenuRef: RefObject<HTMLDivElement | null>;
  onPasteImage: () => void;
  effectiveStroke: string;
  commands: ReturnType<typeof useBoardCommands>;
}

export function ClassWhiteboardToolbar({
  isTeacher,
  canDraw,
  isLocked,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  prefs,
  menus,
  imageMenuRef,
  penMenuRef,
  eraserMenuRef,
  shapesMenuRef,
  colorMenuRef,
  stylusMenuRef,
  onPasteImage,
  effectiveStroke,
  commands,
}: Props) {
  return (
    <TopToolbar
      isTeacher={isTeacher}
      isStudent={!isTeacher}
      canDraw={canDraw}
      disabled={isLocked}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
      activeTool={prefs.activeTool}
      setActiveTool={prefs.setActiveTool}
      strokeColor={prefs.strokeColor}
      setStrokeColor={prefs.setStrokeColor}
      effectiveStroke={effectiveStroke}
      strokeWidth={prefs.strokeWidth}
      setStrokeWidth={prefs.setStrokeWidth}
      eraserWidth={prefs.eraserWidth}
      setEraserWidth={prefs.setEraserWidth}
      isDark={prefs.isDark}
      onToggleDark={commands.onToggleDark}
      stylusOnly={prefs.stylusOnly}
      onToggleStylusOnly={commands.onToggleStylusOnly}
      stylusPrimaryAction={prefs.stylusPrimaryAction}
      setStylusPrimaryAction={prefs.setStylusPrimaryAction}
      stylusSecondaryAction={prefs.stylusSecondaryAction}
      setStylusSecondaryAction={prefs.setStylusSecondaryAction}
      onFileInputClick={commands.onFileInputClick}
      onClearClick={commands.onClearClick}
      onPasteImage={onPasteImage}
      onCropImage={commands.handleCropImage}
      imageMenuRef={imageMenuRef}
      penMenuRef={penMenuRef}
      eraserMenuRef={eraserMenuRef}
      shapesMenuRef={shapesMenuRef}
      colorMenuRef={colorMenuRef}
      stylusMenuRef={stylusMenuRef}
      isPenMenuOpen={menus.isPenMenuOpen}
      setIsPenMenuOpen={menus.setIsPenMenuOpen}
      isEraserMenuOpen={menus.isEraserMenuOpen}
      setIsEraserMenuOpen={menus.setIsEraserMenuOpen}
      isShapesMenuOpen={menus.isShapesMenuOpen}
      setIsShapesMenuOpen={menus.setIsShapesMenuOpen}
      isColorMenuOpen={menus.isColorMenuOpen}
      setIsColorMenuOpen={menus.setIsColorMenuOpen}
      isStylusMenuOpen={menus.isStylusMenuOpen}
      setIsStylusMenuOpen={menus.setIsStylusMenuOpen}
      isImageMenuOpen={menus.isImageMenuOpen}
      setIsImageMenuOpen={menus.setIsImageMenuOpen}
      selectMode={menus.selectMode}
      setSelectMode={menus.setSelectMode}
      isSelectMenuOpen={menus.isSelectMenuOpen}
      setIsSelectMenuOpen={menus.setIsSelectMenuOpen}
    />
  );
}
