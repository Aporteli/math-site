//CUT შეიძლება

'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Room } from 'livekit-client';
import { Loader2, Sparkles } from 'lucide-react';
import type { KonvaCanvasHandle } from '../KonvaCanvas/utils/types';
import { ChunkAssembler } from './utils/chunk';
import { adaptStrokeForTheme } from './utils/theme';

import { useZoom } from './hooks/use-zoom';
import { useEnrolledStudents } from './hooks/useEnrolledStudents';
import { useClickOutsideMenus } from './hooks/useClickOutsideMenus';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStylusActions } from './hooks/useStylusActions';
import { useImageInput } from './hooks/useImageInput';
import { usePublishDataSafe } from './hooks/usePublishDataSafe';
import { useLaserPointer } from './hooks/useLaserPointer';
import { useUndoRedoEvents } from './hooks/useUndoRedoEvents';
import { useScrollLock } from './hooks/useScrollLock';
import { useWhiteboardPrefs } from './hooks/useWhiteboardPrefs';
import { usePersistPrefs } from './hooks/usePersistPrefs';
import { useFullSyncOnJoin } from './hooks/useFullSyncOnJoin';
import { useWhiteboardDataChannel } from './hooks/useWhiteboardDataChannel';
import { useWhiteboardState } from './hooks/useWhiteboardState';
import { useAssign } from './hooks/useAssign';
import { useAskAI } from './hooks/useAskAI';

import { ClearConfirmDialog } from './components/ClearConfirmDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ImageCropModal } from './components/ImageCropModal';
import { AssignModal } from './components/AssignModal';
import { AiChatModal } from './components/AiChatModal';
import { PagesTray } from './components/PagesTray';
import { TopToolbar } from './components/TopToolbar';
import { BottomPanel } from './components/BottomPanel';

const KonvaCanvas = dynamic(() => import('../KonvaCanvas/KonvaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-slate-900">
      <Loader2 className="size-8 animate-spin text-slate-300" />
    </div>
  ),
});

interface ClassWhiteboardProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher?: boolean;
}

export function ClassWhiteboard({
  room, courseId, courseTitle, isFullscreen, onToggleFullscreen, isTeacher = false,
}: ClassWhiteboardProps) {
  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<KonvaCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const eraserMenuRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const stylusMenuRef = useRef<HTMLDivElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const pagesTrayRef = useRef<HTMLDivElement>(null);
  const chunkAssemblerRef = useRef<ChunkAssembler>(new ChunkAssembler());

  // --- Prefs ---
  const prefs = useWhiteboardPrefs();
  const {
    activeTool, setActiveTool,
    strokeColor, setStrokeColor,
    strokeWidth, setStrokeWidth,
    eraserWidth, setEraserWidth,
    isDark, setIsDark,
    stylusOnly, setStylusOnly,
    stylusPrimaryAction, setStylusPrimaryAction,
    stylusSecondaryAction, setStylusSecondaryAction,
  } = prefs;

  // --- Publish data ---
  const publishDataSafe = usePublishDataSafe(room);

  // --- Whiteboard pages & history ---
  const wb = useWhiteboardState({ courseId, isTeacher, isDark, publishDataSafe });
  const {
    pages, setPages, pagesRef,
    currentPageIndex, setCurrentPageIndex, currentPageIndexRef,
    selectedPages, setSelectedPages,
    isPagesTrayOpen, setIsPagesTrayOpen,
    historyMapRef, isRemoteUpdateRef,
    canUndo, canRedo, updateUndoRedoState,
    handleElementsChange, handleUndo, handleRedo,
    handleClearPage, handleAddNewPage, handleDeletePages,
    handleSwitchPage, togglePageSelect, selectAllPages,
  } = wb;

  // --- Stylus actions ---
  const { applyStylusAction, previousToolRef, isTemporaryEraserRef } = useStylusActions({
    activeTool, setActiveTool,
    strokeColor, setStrokeColor,
    stylusPrimaryAction, stylusSecondaryAction,
    handleUndo,
  });

  // --- Prefs persistence (needs stylus refs) ---
  usePersistPrefs({
    isTemporaryEraserRef, previousToolRef,
    activeTool, strokeColor, strokeWidth, eraserWidth, isDark,
    stylusOnly, stylusPrimaryAction, stylusSecondaryAction,
  });

  // --- Zoom ---
  const { zoomScale, setZoomScale, handleZoomIn, handleZoomOut, handleZoomReset, zoomPercent } = useZoom();

  // --- Laser pointer ---
  const handleLaserMove = useLaserPointer({ publishDataSafe, currentPageIndexRef });

  // --- Enrolled students ---
  const { students } = useEnrolledStudents(courseId, isTeacher);

  // --- Assign ---
  const {
    isAssignModalOpen, setIsAssignModalOpen,
    selectedPagesForAssign, setSelectedPagesForAssign,
    selectedStudentIdentities, setSelectedStudentIdentities,
    assignedStatus, assignPending, assignTargetType, assignError,
    togglePageSelectionForAssign, toggleStudentSelection, selectAllStudents,
    handleAssignSelectedBoards,
  } = useAssign({ courseTitle, isDark, pagesRef, currentPageIndexRef, canvasRef, students });

  // --- Ask AI ---
  const {
    isAiModalOpen, setIsAiModalOpen,
    aiModel, setAiModel, aiModelStatus,
    aiInitialImages, setAiInitialImages,
    handleAskAIAboutBoard,
  } = useAskAI({ isTeacher, isDark, pagesRef, currentPageIndexRef, canvasRef });

  // --- Image input ---
  const { pasteImageFromClipboard, openCropForElement, pendingImage, cancelCrop, confirmCrop, handleDrop, handleFileInputChange } = useImageInput({
    pagesRef, currentPageIndexRef, handleElementsChange, setActiveTool,
  });

  // --- Clear confirm state ---
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);

  // --- Menu open states ---
  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isEraserMenuOpen, setIsEraserMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isStylusMenuOpen, setIsStylusMenuOpen] = useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);

  // --- Global hooks ---
  useScrollLock(containerRef);
  useClickOutsideMenus({
    penMenuRef, eraserMenuRef, shapesMenuRef, colorMenuRef, stylusMenuRef, imageMenuRef, pagesTrayRef,
    closePenMenu: () => setIsPenMenuOpen(false),
    closeEraserMenu: () => setIsEraserMenuOpen(false),
    closeShapesMenu: () => setIsShapesMenuOpen(false),
    closeColorMenu: () => setIsColorMenuOpen(false),
    closeStylusMenu: () => setIsStylusMenuOpen(false),
    closeImageMenu: () => setIsImageMenuOpen(false),
    closePagesTray: () => setIsPagesTrayOpen(false),
  });
  useUndoRedoEvents(handleUndo, handleRedo);
  useKeyboardShortcuts({ handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleZoomReset });
  useFullSyncOnJoin(isTeacher, room, publishDataSafe, pagesRef, currentPageIndexRef);
  useWhiteboardDataChannel({
    room, isDark, updateUndoRedoState, canvasRef,
    pagesRef, currentPageIndexRef, historyMapRef,
    isRemoteUpdateRef, chunkAssemblerRef,
    setPages, setCurrentPageIndex,
  });

  // --- Derived ---
  const effectiveStroke = adaptStrokeForTheme(strokeColor, isDark);

  const openSendModal = () => {
    const pagesToAssign = selectedPages.length > 0 ? selectedPages : [currentPageIndex];
    setSelectedPagesForAssign(pagesToAssign);
    if (students.length > 0) setSelectedStudentIdentities([students[0].identity]);
    setIsAssignModalOpen(true);
  };

  const handleAskAIFromBoard = () => handleAskAIAboutBoard(selectedPages, currentPageIndex);

  const handleCropImage = () => canvasRef.current?.cropSelectedImage();

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative flex flex-col min-h-0 min-w-0 overflow-hidden overscroll-none touch-none select-none ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      } ${isFullscreen ? 'h-full w-full' : 'h-full w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" className="hidden" />

      {isClearConfirmOpen && (
        <ClearConfirmDialog
          onCancel={() => setIsClearConfirmOpen(false)}
          onConfirm={() => { handleClearPage(); setIsClearConfirmOpen(false); }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          title={pendingDelete.length === 1 ? 'დაფის წაშლა' : 'დაფების წაშლა'}
          description={
            pendingDelete.length === 1
              ? 'ნამდვილად გსურთ ამ დაფის წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია.'
              : `ნამდვილად გსურთ ${pendingDelete.length} დაფის წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია.`
          }
          confirmLabel="წაშლა"
          cancelLabel="გაუქმება"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            handleDeletePages(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}

      {pendingImage && (
        <ImageCropModal
          src={pendingImage.src}
          onCancel={cancelCrop}
          onConfirm={confirmCrop}
        />
      )}

      {isTeacher && isAssignModalOpen && (
        <AssignModal
          pages={pages}
          isDark={isDark}
          currentPageIndex={currentPageIndex}
          students={students}
          selectedPagesForAssign={selectedPagesForAssign}
          selectedStudentIdentities={selectedStudentIdentities}
          assignedStatus={assignedStatus}
          assignError={assignError}
          assignPending={assignPending}
          assignTargetType={assignTargetType}
          onClose={() => { setIsAssignModalOpen(false); /* assignError null */ }}
          onTogglePage={togglePageSelectionForAssign}
          onSelectAllPagesToggle={() => {
            if (selectedPagesForAssign.length === pages.length) setSelectedPagesForAssign([currentPageIndex]);
            else setSelectedPagesForAssign(pages.map((_, i) => i));
          }}
          onToggleStudent={toggleStudentSelection}
          onSelectAllStudents={selectAllStudents}
          onAssign={handleAssignSelectedBoards}
        />
      )}

      <TopToolbar
        isTeacher={isTeacher}
        isStudent={!isTeacher}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        effectiveStroke={effectiveStroke}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        eraserWidth={eraserWidth}
        setEraserWidth={setEraserWidth}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        stylusOnly={stylusOnly}
        onToggleStylusOnly={() => setStylusOnly((p) => !p)}
        stylusPrimaryAction={stylusPrimaryAction}
        setStylusPrimaryAction={setStylusPrimaryAction}
        stylusSecondaryAction={stylusSecondaryAction}
        setStylusSecondaryAction={setStylusSecondaryAction}
        onFileInputClick={() => fileInputRef.current?.click()}
        onClearClick={() => setIsClearConfirmOpen(true)}
        onPasteImage={pasteImageFromClipboard}
        onCropImage={handleCropImage}
        imageMenuRef={imageMenuRef}
        penMenuRef={penMenuRef}
        eraserMenuRef={eraserMenuRef}
        shapesMenuRef={shapesMenuRef}
        colorMenuRef={colorMenuRef}
        stylusMenuRef={stylusMenuRef}
        isPenMenuOpen={isPenMenuOpen} setIsPenMenuOpen={setIsPenMenuOpen}
        isEraserMenuOpen={isEraserMenuOpen} setIsEraserMenuOpen={setIsEraserMenuOpen}
        isShapesMenuOpen={isShapesMenuOpen} setIsShapesMenuOpen={setIsShapesMenuOpen}
        isColorMenuOpen={isColorMenuOpen} setIsColorMenuOpen={setIsColorMenuOpen}
        isStylusMenuOpen={isStylusMenuOpen} setIsStylusMenuOpen={setIsStylusMenuOpen}
        isImageMenuOpen={isImageMenuOpen} setIsImageMenuOpen={setIsImageMenuOpen}
      />

      <div className="relative flex-1 w-full min-h-0 min-w-0 overflow-hidden"
        style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}>
        <KonvaCanvas
          ref={canvasRef}
          elements={pages[currentPageIndex] || []}
          onElementsChange={handleElementsChange}
          activeTool={activeTool}
          strokeColor={effectiveStroke}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          isDark={isDark}
          scale={zoomScale}
          onScaleChange={(newScale) => setZoomScale(newScale)}
          onLaserMove={handleLaserMove}
          onCropImage={openCropForElement}
          stylusOnly={stylusOnly}
          onStylusButtonAction={applyStylusAction}
        />
      </div>

      {isTeacher && (
        <button
          type="button"
          aria-label="AI ასისტენტი"
          title="AI ასისტენტი"
          onClick={handleAskAIFromBoard}
          className="absolute right-4 bottom-16 sm:bottom-20 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white shadow-xl hover:bg-navy-strong hover:scale-105 active:scale-95 transition-all focus:outline-none border-2 border-white/20">
          <Sparkles className="size-5 text-amber-300" />
        </button>
      )}

      {isTeacher && isAiModalOpen && (
        <AiChatModal
          aiModel={aiModel}
          aiModelStatus={aiModelStatus}
          aiInitialImages={aiInitialImages}
          onModelChange={setAiModel}
          onClose={() => { setIsAiModalOpen(false); setAiInitialImages([]); }}
        />
      )}

      <BottomPanel
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isTeacher={isTeacher}
        zoomPercent={zoomPercent}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFit={() => canvasRef.current?.fitToContent()}
        currentPageIndex={currentPageIndex}
        pagesLength={pages.length}
        selectedPagesCount={selectedPages.length}
        isPagesTrayOpen={isPagesTrayOpen}
        onPrevPage={() => handleSwitchPage(currentPageIndex - 1)}
        onNextPage={() => handleSwitchPage(currentPageIndex + 1)}
        onToggleTray={() => setIsPagesTrayOpen(!isPagesTrayOpen)}
        onAddNewPage={handleAddNewPage}
        onAskAI={handleAskAIFromBoard}
        onOpenSend={openSendModal}
      />

      {isPagesTrayOpen && isTeacher && (
        <PagesTray
          ref={pagesTrayRef}
          pages={pages}
          currentPageIndex={currentPageIndex}
          selectedPages={selectedPages}
          isDark={isDark}
          onClose={() => setIsPagesTrayOpen(false)}
          onSelectAll={selectAllPages}
          onSwitchPage={handleSwitchPage}
          onTogglePageSelect={togglePageSelect}
          onDeletePage={(idx) => setPendingDelete([idx])}
          onDeleteSelectedPages={() => setPendingDelete(selectedPages)}
          onAddNewPage={handleAddNewPage}
        />
      )}
    </div>
  );
}