'use client';

import type { BoardAssignmentMap } from '@/lib/livekit/board-assignment';
import { adaptStrokeForTheme } from '../utils/theme';
import type { Student } from '../utils/types';
import type { useWhiteboardRefs } from '../hooks/useWhiteboardRefs';
import type { useWhiteboardPrefs } from '../hooks/useWhiteboardPrefs';
import type { useWhiteboardState } from '../hooks/useWhiteboardState';
import type { useZoom } from '../hooks/use-zoom';
import type { useBoardViewport } from '../hooks/useBoardViewport';
import type { useAssign } from '../hooks/useAssign';
import type { useAskAI } from '../hooks/useAskAI';
import type { useImageInput } from '../hooks/useImageInput';
import type { useToolbarMenus } from '../hooks/useToolbarMenus';
import type { useBoardCommands } from '../hooks/useBoardCommands';
import type { useStylusActions } from '../hooks/useStylusActions';
import type { useBoardLaser } from '../hooks/useBoardLaser';
import { ClearPageConfirm } from './ClearPageConfirm';
import { DeletePagesConfirm } from './DeletePagesConfirm';
import { TeacherAssignModal } from './TeacherAssignModal';
import { TeacherAiModal } from './TeacherAiModal';
import { ClassWhiteboardToolbar } from './ClassWhiteboardToolbar';
import { BoardStage } from './BoardStage';
import { TeacherPagesTray } from './TeacherPagesTray';
import { BottomPanel } from './BottomPanel';

interface Props {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher: boolean;
  students: Student[];
  enableSlashPrompts: boolean;
  slashPromptsUserId: string;
  refs: ReturnType<typeof useWhiteboardRefs>;
  prefs: ReturnType<typeof useWhiteboardPrefs>;
  wb: ReturnType<typeof useWhiteboardState>;
  zoom: ReturnType<typeof useZoom>;
  viewport: ReturnType<typeof useBoardViewport>;
  isLocked: boolean;
  canDraw: boolean;
  assign: ReturnType<typeof useAssign>;
  ask: ReturnType<typeof useAskAI>;
  image: ReturnType<typeof useImageInput>;
  menus: ReturnType<typeof useToolbarMenus>;
  commands: ReturnType<typeof useBoardCommands>;
  applyStylusAction: ReturnType<typeof useStylusActions>['applyStylusAction'];
  handleLaserMove: ReturnType<typeof useBoardLaser>;
  assignedPageIndex: number | null;
  assignedPageByStudent: BoardAssignmentMap;
}

export function ClassWhiteboardFrame({
  isFullscreen,
  onToggleFullscreen,
  isTeacher,
  students,
  enableSlashPrompts,
  slashPromptsUserId,
  refs,
  prefs,
  wb,
  zoom,
  viewport,
  isLocked,
  canDraw,
  assign,
  ask,
  image,
  menus,
  commands,
  applyStylusAction,
  handleLaserMove,
  assignedPageIndex,
  assignedPageByStudent,
}: Props) {
  const {
    containerRef,
    canvasRef,
    fileInputRef,
    penMenuRef,
    eraserMenuRef,
    shapesMenuRef,
    colorMenuRef,
    stylusMenuRef,
    imageMenuRef,
    pagesTrayRef,
  } = refs;
  const effectiveStroke = adaptStrokeForTheme(prefs.strokeColor, prefs.isDark);

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={image.handleDrop}
      className={`relative flex flex-col min-h-0 min-w-0 overflow-hidden overscroll-none touch-none select-none ${
        prefs.isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      } ${isFullscreen ? 'h-full w-full' : 'h-full w-full rounded-box border border-hairline shadow-sm'}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={image.handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

      <ClearPageConfirm
        open={menus.isClearConfirmOpen}
        onClear={wb.handleClearPage}
        setOpen={menus.setIsClearConfirmOpen}
      />
      <DeletePagesConfirm
        pendingDelete={menus.pendingDelete}
        onDelete={wb.handleDeletePages}
        setPendingDelete={menus.setPendingDelete}
      />
      <TeacherAssignModal
        isTeacher={isTeacher}
        pages={wb.pages}
        isDark={prefs.isDark}
        currentPageIndex={wb.currentPageIndex}
        students={students}
        assign={assign}
      />

      <ClassWhiteboardToolbar
        isTeacher={isTeacher}
        canDraw={canDraw}
        isLocked={isLocked}
        canUndo={wb.canUndo}
        canRedo={wb.canRedo}
        onUndo={wb.handleUndo}
        onRedo={wb.handleRedo}
        prefs={prefs}
        menus={menus}
        imageMenuRef={imageMenuRef}
        penMenuRef={penMenuRef}
        eraserMenuRef={eraserMenuRef}
        shapesMenuRef={shapesMenuRef}
        colorMenuRef={colorMenuRef}
        stylusMenuRef={stylusMenuRef}
        onPasteImage={image.pasteImageFromClipboard}
        effectiveStroke={effectiveStroke}
        commands={commands}
      />

      <BoardStage
        boardViewportRef={viewport.boardViewportRef}
        isDark={prefs.isDark}
        isTeacher={isTeacher}
        assignedPageIndex={assignedPageIndex}
        canvasRef={canvasRef}
        currentPageIndex={wb.currentPageIndex}
        pages={wb.pages}
        onElementsChange={wb.handleElementsChange}
        activeTool={prefs.activeTool}
        selectionMode={menus.selectMode}
        strokeColor={effectiveStroke}
        strokeWidth={prefs.strokeWidth}
        eraserWidth={prefs.eraserWidth}
        scale={zoom.zoomScale * viewport.fitScale}
        stagePos={viewport.stagePos}
        onStagePosChange={viewport.setStagePos}
        disabled={isLocked && !canDraw}
        onLaserMove={handleLaserMove}
        stylusOnly={prefs.stylusOnly}
        onStylusButtonAction={applyStylusAction}
      />

      <TeacherAiModal
        isTeacher={isTeacher}
        ask={ask}
        enableSlashPrompts={enableSlashPrompts}
        slashPromptsUserId={slashPromptsUserId}
      />

      <BottomPanel
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isTeacher={isTeacher}
        disabled={isLocked}
        zoomPercent={zoom.zoomPercent}
        onZoomIn={zoom.handleZoomIn}
        onZoomOut={zoom.handleZoomOut}
        onZoomReset={zoom.handleZoomReset}
        onFit={commands.onFit}
        currentPageIndex={wb.currentPageIndex}
        pagesLength={wb.pages.length}
        selectedPagesCount={wb.selectedPages.length}
        isPagesTrayOpen={wb.isPagesTrayOpen}
        onPrevPage={commands.onPrevPage}
        onNextPage={commands.onNextPage}
        onToggleTray={commands.onToggleTray}
        onAddNewPage={wb.handleAddNewPage}
        onAskAI={commands.handleAskAIFromBoard}
        onOpenSend={commands.openSendModal}
      />

      <TeacherPagesTray
        open={wb.isPagesTrayOpen}
        isTeacher={isTeacher}
        pagesTrayRef={pagesTrayRef}
        pages={wb.pages}
        currentPageIndex={wb.currentPageIndex}
        selectedPages={wb.selectedPages}
        isDark={prefs.isDark}
        students={students}
        assignedPageByStudent={assignedPageByStudent}
        setIsPagesTrayOpen={wb.setIsPagesTrayOpen}
        onSelectAll={wb.selectAllPages}
        onSwitchPage={wb.handleSwitchPage}
        onTogglePageSelect={wb.togglePageSelect}
        setPendingDelete={menus.setPendingDelete}
        onAddNewPage={wb.handleAddNewPage}
      />
    </div>
  );
}
