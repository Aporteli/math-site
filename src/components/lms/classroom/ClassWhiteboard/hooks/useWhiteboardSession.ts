'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { BoardAssignmentMap } from '@/lib/livekit/board-assignment';
import { useScrollLock } from './useScrollLock';
import { useClickOutsideMenus } from './useClickOutsideMenus';
import { useUndoRedoEvents } from './useUndoRedoEvents';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useFullSyncOnJoin } from './useFullSyncOnJoin';
import { useWhiteboardDataChannel } from './useWhiteboardDataChannel';
import type { PublishDataSafe } from './usePublishDataSafe';

type ChannelOptions = Parameters<typeof useWhiteboardDataChannel>[0];

interface Options extends ChannelOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  penMenuRef: RefObject<HTMLDivElement | null>;
  eraserMenuRef: RefObject<HTMLDivElement | null>;
  shapesMenuRef: RefObject<HTMLDivElement | null>;
  colorMenuRef: RefObject<HTMLDivElement | null>;
  stylusMenuRef: RefObject<HTMLDivElement | null>;
  imageMenuRef: RefObject<HTMLDivElement | null>;
  pagesTrayRef: RefObject<HTMLDivElement | null>;
  setIsPenMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsEraserMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsShapesMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsColorMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsStylusMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsImageMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsPagesTrayOpen: Dispatch<SetStateAction<boolean>>;
  handleUndo: () => void;
  handleRedo: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  isLocked: boolean;
  publishDataSafe: PublishDataSafe;
  assignedPageByStudent: BoardAssignmentMap;
  noteSnapshotSent: NonNullable<ChannelOptions['noteSnapshotSent']>;
}

export function useWhiteboardSession(opts: Options) {
  useScrollLock(opts.containerRef);
  useClickOutsideMenus({
    penMenuRef: opts.penMenuRef,
    eraserMenuRef: opts.eraserMenuRef,
    shapesMenuRef: opts.shapesMenuRef,
    colorMenuRef: opts.colorMenuRef,
    stylusMenuRef: opts.stylusMenuRef,
    imageMenuRef: opts.imageMenuRef,
    pagesTrayRef: opts.pagesTrayRef,
    closePenMenu: () => opts.setIsPenMenuOpen(false),
    closeEraserMenu: () => opts.setIsEraserMenuOpen(false),
    closeShapesMenu: () => opts.setIsShapesMenuOpen(false),
    closeColorMenu: () => opts.setIsColorMenuOpen(false),
    closeStylusMenu: () => opts.setIsStylusMenuOpen(false),
    closeImageMenu: () => opts.setIsImageMenuOpen(false),
    closePagesTray: () => opts.setIsPagesTrayOpen(false),
  });
  useUndoRedoEvents(opts.handleUndo, opts.handleRedo);
  useKeyboardShortcuts({
    handleUndo: opts.handleUndo,
    handleRedo: opts.handleRedo,
    handleZoomIn: opts.handleZoomIn,
    handleZoomOut: opts.handleZoomOut,
    handleZoomReset: opts.handleZoomReset,
    isLocked: opts.isLocked,
  });
  useFullSyncOnJoin(
    opts.isTeacher,
    opts.room,
    opts.publishDataSafe,
    opts.pagesRef,
    opts.currentPageIndexRef,
    opts.assignedPageByStudent,
    opts.noteSnapshotSent,
  );
  useWhiteboardDataChannel(opts);
}
