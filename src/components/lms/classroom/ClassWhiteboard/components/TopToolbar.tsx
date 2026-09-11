'use client';

import type { RefObject } from 'react';
import type { StylusButtonAction } from '../constants/stylus';
import { UndoRedoButtons } from './toolbar/UndoRedoButtons';
import { SelectPanButtons } from './toolbar/SelectPanButtons';
import { PenMenu } from './toolbar/PenMenu';
import { ColorMenu } from './toolbar/ColorMenu';
import { EraserMenu } from './toolbar/EraserMenu';
import { ShapesMenu } from './toolbar/ShapesMenu';
import { TextImageButtons } from './toolbar/TextImageButtons';
import { LaserButton } from './toolbar/LaserButton';
import { StylusMenu } from './toolbar/StylusMenu';
import { ThemeClearButtons } from './toolbar/ThemeClearButtons';

interface Props {
  isStudent: boolean;
  isTeacher: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  activeTool: any;
  setActiveTool: (t: any) => void;

  strokeColor: string;
  setStrokeColor: (c: string) => void;
  effectiveStroke: string;

  strokeWidth: number;
  setStrokeWidth: (w: number) => void;

  eraserWidth: number;
  setEraserWidth: (w: number) => void;

  isDark: boolean;
  onToggleDark: () => void;

  stylusOnly: boolean;
  onToggleStylusOnly: () => void;
  stylusPrimaryAction: StylusButtonAction;
  setStylusPrimaryAction: (a: StylusButtonAction) => void;
  stylusSecondaryAction: StylusButtonAction;
  setStylusSecondaryAction: (a: StylusButtonAction) => void;

  onFileInputClick: () => void;
  onClearClick: () => void;
  onPasteImage: () => void;
  onCropImage: () => void;

  imageMenuRef: RefObject<HTMLDivElement | null>;

  penMenuRef: RefObject<HTMLDivElement | null>;
  eraserMenuRef: RefObject<HTMLDivElement | null>;
  shapesMenuRef: RefObject<HTMLDivElement | null>;
  colorMenuRef: RefObject<HTMLDivElement | null>;
  stylusMenuRef: RefObject<HTMLDivElement | null>;

  isPenMenuOpen: boolean;
  setIsPenMenuOpen: (v: boolean) => void;
  isEraserMenuOpen: boolean;
  setIsEraserMenuOpen: (v: boolean) => void;
  isShapesMenuOpen: boolean;
  setIsShapesMenuOpen: (v: boolean) => void;
  isColorMenuOpen: boolean;
  setIsColorMenuOpen: (v: boolean) => void;
  isStylusMenuOpen: boolean;
  setIsStylusMenuOpen: (v: boolean) => void;
  isImageMenuOpen: boolean;
  setIsImageMenuOpen: (v: boolean) => void;
}

export function TopToolbar(props: Props) {
  const {
    isTeacher,
    isStudent,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    effectiveStroke,
    strokeWidth,
    setStrokeWidth,
    eraserWidth,
    setEraserWidth,
    isDark,
    onToggleDark,
    stylusOnly,
    onToggleStylusOnly,
    stylusPrimaryAction,
    setStylusPrimaryAction,
    stylusSecondaryAction,
    setStylusSecondaryAction,
    onFileInputClick,
    onClearClick,
    onPasteImage,
    onCropImage,
    imageMenuRef,
    penMenuRef,
    eraserMenuRef,
    shapesMenuRef,
    colorMenuRef,
    stylusMenuRef,
    isPenMenuOpen,
    setIsPenMenuOpen,
    isEraserMenuOpen,
    setIsEraserMenuOpen,
    isShapesMenuOpen,
    setIsShapesMenuOpen,
    isColorMenuOpen,
    setIsColorMenuOpen,
    isStylusMenuOpen,
    setIsStylusMenuOpen,
    isImageMenuOpen,
    setIsImageMenuOpen,
  } = props;

  const closeAllMenus = () => {
    setIsPenMenuOpen(false);
    setIsEraserMenuOpen(false);
    setIsShapesMenuOpen(false);
    setIsColorMenuOpen(false);
    setIsStylusMenuOpen(false);
    setIsImageMenuOpen(false);
  };

  return (
    <div className="absolute top-2 sm:top-3 inset-x-0 z-[100] flex justify-center px-1 sm:px-2 pointer-events-none">
      <div className="pointer-events-auto w-max max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 overflow-visible">
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 p-1 sm:p-1.5">
          {isTeacher && (
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
          )}
          <SelectPanButtons isTeacher={isTeacher} activeTool={activeTool} setActiveTool={setActiveTool} closeAllMenus={closeAllMenus} />

          {isTeacher && (
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
              <PenMenu
                menuRef={penMenuRef}
                isOpen={isPenMenuOpen}
                setIsOpen={setIsPenMenuOpen}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                closeOtherMenus={() => {
                  setIsEraserMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsStylusMenuOpen(false);
                }}
              />
              <ColorMenu
                menuRef={colorMenuRef}
                isOpen={isColorMenuOpen}
                setIsOpen={setIsColorMenuOpen}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                effectiveStroke={effectiveStroke}
                closeOtherMenus={() => {
                  setIsPenMenuOpen(false);
                  setIsEraserMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsStylusMenuOpen(false);
                }}
              />
              <EraserMenu
                menuRef={eraserMenuRef}
                isOpen={isEraserMenuOpen}
                setIsOpen={setIsEraserMenuOpen}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                eraserWidth={eraserWidth}
                setEraserWidth={setEraserWidth}
                closeOtherMenus={() => {
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsStylusMenuOpen(false);
                }}
              />
            </div>
          )}
          {isTeacher && (
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
              <ShapesMenu
                menuRef={shapesMenuRef}
                isOpen={isShapesMenuOpen}
                setIsOpen={setIsShapesMenuOpen}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                closeOtherMenus={() => {
                  setIsPenMenuOpen(false);
                  setIsEraserMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsStylusMenuOpen(false);
                }}
              />
              <TextImageButtons
                menuRef={imageMenuRef}
                isOpen={isImageMenuOpen}
                setIsOpen={setIsImageMenuOpen}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onFileInputClick={onFileInputClick}
                onPasteImage={onPasteImage}
                onCropImage={onCropImage}
                closeOtherMenus={() => {
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsStylusMenuOpen(false);
                }}
              />
            </div>
          )}
          {isTeacher && (
            <LaserButton activeTool={activeTool} setActiveTool={setActiveTool} closeAllMenus={closeAllMenus} />
          )}
          {isTeacher && (
            <StylusMenu
              menuRef={stylusMenuRef}
              isOpen={isStylusMenuOpen}
              setIsOpen={setIsStylusMenuOpen}
              stylusOnly={stylusOnly}
              onToggleStylusOnly={onToggleStylusOnly}
              stylusPrimaryAction={stylusPrimaryAction}
              setStylusPrimaryAction={setStylusPrimaryAction}
              stylusSecondaryAction={stylusSecondaryAction}
              setStylusSecondaryAction={setStylusSecondaryAction}
              closeOtherMenus={() => {
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
                setIsEraserMenuOpen(false);
              }}
            />
          )}
          <ThemeClearButtons isTeacher={isTeacher} isStudent={isStudent} isDark={isDark} onToggleDark={onToggleDark} onClear={onClearClick} />
        </div>
      </div>
    </div>
  );
}
