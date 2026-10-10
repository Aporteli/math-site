//CUT შეიძლება

'use client';

import { useState } from 'react';
import { useBoardControlContext } from '../ClassroomRoomModal/components/BoardControlContext';
import { useBreakout } from '../ClassroomRoomModal/breakout/BreakoutContext';
import type { ClassWhiteboardProps } from './ClassWhiteboard.types';
import { ClassWhiteboardFrame } from './components/ClassWhiteboardFrame';
import { useZoom } from './hooks/use-zoom';
import { useAskAI } from './hooks/useAskAI';
import { useAssign } from './hooks/useAssign';
import { useBoardBroadcast } from './hooks/useBoardBroadcast';
import { useBoardCommands } from './hooks/useBoardCommands';
import { useBoardLaser } from './hooks/useBoardLaser';
import { useBoardViewStream } from './hooks/useBoardViewStream';
import { useBoardViewport } from './hooks/useBoardViewport';
import { useImageInput } from './hooks/useImageInput';
import { useLockedStudentView } from './hooks/useLockedStudentView';
import { usePersistPrefs } from './hooks/usePersistPrefs';
import { usePublishDataSafe } from './hooks/usePublishDataSafe';
import { useStylusActions } from './hooks/useStylusActions';
import { useSyncRouting } from './hooks/useSyncRouting';
import { useToolbarMenus } from './hooks/useToolbarMenus';
import { useWhiteboardPrefs } from './hooks/useWhiteboardPrefs';
import { useWhiteboardRefs } from './hooks/useWhiteboardRefs';
import { useWhiteboardSession } from './hooks/useWhiteboardSession';
import { useWhiteboardState } from './hooks/useWhiteboardState';

export function ClassWhiteboard({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  onToggleFullscreen,
  isTeacher = false,
  students,
  enableSlashPrompts = false,
  slashPromptsUserId = '',
}: ClassWhiteboardProps) {
  const refs = useWhiteboardRefs();
  const prefs = useWhiteboardPrefs();
  const [canDraw, setCanDraw] = useState(false);

  const publishDataSafe = usePublishDataSafe(room);
  const { lockedStudentIds, setPageCount, assignedPageByStudent, clearBoardAssignments } = useBoardControlContext();
  const breakout = useBreakout();
  const sync = useSyncRouting(room, assignedPageByStudent);

  const wb = useWhiteboardState({
    courseId,
    isTeacher,
    canDraw,
    isDark: prefs.isDark,
    room,
    publishDataSafe,
    getSyncDestinations: sync.getSyncDestinations,
    broadcastBoard: sync.broadcastBoard,
  });

  useBoardBroadcast({
    isTeacher,
    room,
    publishDataSafe,
    pagesRef: wb.pagesRef,
    currentPageIndexRef: wb.currentPageIndexRef,
    noteSnapshotSent: wb.noteSnapshotSent,
    publishFullSync: wb.publishFullSync,
    assignedPageByStudent,
    pagesLength: wb.pages.length,
    setPageCount,
    broadcastImplRef: sync.broadcastImplRef,
    clearBoardAssignments,
    breakoutActive: breakout.breakout.active,
    assignedPageIndex: sync.assignedPageIndex,
    currentPageIndex: wb.currentPageIndex,
    setCurrentPageIndex: wb.setCurrentPageIndex,
  });

  const { applyStylusAction, previousToolRef, isTemporaryEraserRef } = useStylusActions({
    enabled: isTeacher || canDraw,
    activeTool: prefs.activeTool,
    setActiveTool: prefs.setActiveTool,
    strokeColor: prefs.strokeColor,
    setStrokeColor: prefs.setStrokeColor,
    stylusPrimaryAction: prefs.stylusPrimaryAction,
    stylusSecondaryAction: prefs.stylusSecondaryAction,
    handleUndo: wb.handleUndo,
  });

  usePersistPrefs({
    isTemporaryEraserRef,
    previousToolRef,
    activeTool: prefs.activeTool,
    strokeColor: prefs.strokeColor,
    strokeWidth: prefs.strokeWidth,
    eraserWidth: prefs.eraserWidth,
    isDark: prefs.isDark,
    stylusOnly: prefs.stylusOnly,
    stylusPrimaryAction: prefs.stylusPrimaryAction,
    stylusSecondaryAction: prefs.stylusSecondaryAction,
  });

  const zoom = useZoom();
  const viewport = useBoardViewport(zoom.zoomScale);
  const lock = useLockedStudentView({
    isTeacher,
    canDraw,
    activeTool: prefs.activeTool,
    setActiveTool: prefs.setActiveTool,
    setZoomScale: zoom.setZoomScale,
    setStagePos: viewport.setStagePos,
    assignedPageIndex: sync.assignedPageIndex,
    pagesRef: wb.pagesRef,
    setCurrentPageIndex: wb.setCurrentPageIndex,
  });

  const handleLaserMove = useBoardLaser(publishDataSafe, sync.getSyncDestinations, wb.currentPageIndexRef);

  useBoardViewStream({
    room,
    isTeacher,
    lockedStudentIds,
    assignedPageByStudent,
    publishDataSafe,
    zoomScale: zoom.zoomScale,
    stagePos: viewport.stagePos,
    currentPageIndex: wb.currentPageIndex,
  });

  const assign = useAssign({
    courseTitle,
    isDark: prefs.isDark,
    pagesRef: wb.pagesRef,
    currentPageIndexRef: wb.currentPageIndexRef,
    canvasRef: refs.canvasRef,
    students,
  });

  const ask = useAskAI({
    isTeacher,
    isDark: prefs.isDark,
    pagesRef: wb.pagesRef,
    currentPageIndexRef: wb.currentPageIndexRef,
    canvasRef: refs.canvasRef,
  });

  const image = useImageInput({
    allowImages: isTeacher || canDraw,
    pagesRef: wb.pagesRef,
    currentPageIndexRef: wb.currentPageIndexRef,
    handleElementsChange: wb.handleElementsChange,
    setActiveTool: prefs.setActiveTool,
    selectElement: (id) => refs.canvasRef.current?.selectElement(id),
  });

  const menus = useToolbarMenus();

  useWhiteboardSession({
    containerRef: refs.containerRef,
    penMenuRef: refs.penMenuRef,
    eraserMenuRef: refs.eraserMenuRef,
    shapesMenuRef: refs.shapesMenuRef,
    colorMenuRef: refs.colorMenuRef,
    stylusMenuRef: refs.stylusMenuRef,
    imageMenuRef: refs.imageMenuRef,
    pagesTrayRef: refs.pagesTrayRef,
    setIsPenMenuOpen: menus.setIsPenMenuOpen,
    setIsEraserMenuOpen: menus.setIsEraserMenuOpen,
    setIsShapesMenuOpen: menus.setIsShapesMenuOpen,
    setIsColorMenuOpen: menus.setIsColorMenuOpen,
    setIsStylusMenuOpen: menus.setIsStylusMenuOpen,
    setIsImageMenuOpen: menus.setIsImageMenuOpen,
    setIsPagesTrayOpen: wb.setIsPagesTrayOpen,
    handleUndo: wb.handleUndo,
    handleRedo: wb.handleRedo,
    handleZoomIn: zoom.handleZoomIn,
    handleZoomOut: zoom.handleZoomOut,
    handleZoomReset: zoom.handleZoomReset,
    isLocked: lock.isLocked,
    canDraw,
    setCanDraw,
    room,
    isTeacher,
    publishDataSafe,
    noteSnapshotSent: wb.noteSnapshotSent,
    adoptRemotePage: wb.adoptRemotePage,
    isDark: prefs.isDark,
    updateUndoRedoState: wb.updateUndoRedoState,
    canvasRef: refs.canvasRef,
    pagesRef: wb.pagesRef,
    currentPageIndexRef: wb.currentPageIndexRef,
    historyMapRef: wb.historyMapRef,
    isRemoteUpdateRef: wb.isRemoteUpdateRef,
    hasAppliedLiveSyncRef: wb.hasAppliedLiveSyncRef,
    chunkAssemblerRef: refs.chunkAssemblerRef,
    setPages: wb.setPages,
    setCurrentPageIndex: wb.setCurrentPageIndex,
    setIsLocked: lock.setIsLocked,
    applyBoardView: lock.applyBoardView,
    assignedPageIndex: sync.assignedPageIndex,
    setAssignedPageIndex: sync.setAssignedPageIndex,
    assignedPageByStudent,
  });

  const commands = useBoardCommands({
    selectedPages: wb.selectedPages,
    currentPageIndex: wb.currentPageIndex,
    setSelectedPagesForAssign: assign.setSelectedPagesForAssign,
    setSelectedStudentIdentities: assign.setSelectedStudentIdentities,
    setIsAssignModalOpen: assign.setIsAssignModalOpen,
    students,
    handleAskAIAboutBoard: ask.handleAskAIAboutBoard,
    canvasRef: refs.canvasRef,
    setIsDark: prefs.setIsDark,
    setStylusOnly: prefs.setStylusOnly,
    fileInputRef: refs.fileInputRef,
    setIsClearConfirmOpen: menus.setIsClearConfirmOpen,
    currentPageIndexRef: wb.currentPageIndexRef,
    handleSwitchPage: wb.handleSwitchPage,
    setIsPagesTrayOpen: wb.setIsPagesTrayOpen,
  });

  return (
    <ClassWhiteboardFrame
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      isTeacher={isTeacher}
      students={students}
      enableSlashPrompts={enableSlashPrompts}
      slashPromptsUserId={slashPromptsUserId}
      refs={refs}
      prefs={prefs}
      wb={wb}
      zoom={zoom}
      viewport={viewport}
      isLocked={lock.isLocked}
      canDraw={canDraw}
      assign={assign}
      ask={ask}
      image={image}
      menus={menus}
      commands={commands}
      applyStylusAction={applyStylusAction}
      handleLaserMove={handleLaserMove}
      assignedPageIndex={sync.assignedPageIndex}
      assignedPageByStudent={assignedPageByStudent}
    />
  );
}
