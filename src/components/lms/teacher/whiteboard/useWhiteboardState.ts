'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useDashboardFrame } from '@/components/layout/DashboardFrame';
import { BOARD_WIDTH, BOARD_HEIGHT, DEFAULT_COLOR } from './constants';
import type { CanvasElement, KonvaCanvasHandle } from '@/components/lms/classroom/KonvaCanvas/utils/types';
import type { CourseGroup, ToolId, StylusButtonAction } from './types';

export function useWhiteboardState() {
  const { toggleSidebarDrawer } = useDashboardFrame();
  const canvasRef = useRef<KonvaCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const eraserMenuRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const stylusMenuRef = useRef<HTMLDivElement>(null);
  const smoothMenuRef = useRef<HTMLDivElement>(null);
  const pagesTrayRef = useRef<HTMLDivElement>(null);
  const boardRootRef = useRef<HTMLDivElement>(null);
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);

  const [pages, setPages] = useState<CanvasElement[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<ToolId>('pen');
  const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [eraserWidth, setEraserWidth] = useState<number>(40);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [stylusOnly, setStylusOnly] = useState(false);
  const [penSmoothEnabled, setPenSmoothEnabled] = useState(false);
  const [penSmoothIntensity, setPenSmoothIntensity] = useState(0.45);
  const [stylusPrimaryAction, setStylusPrimaryAction] = useState<StylusButtonAction>('temporary-eraser');
  const [stylusSecondaryAction, setStylusSecondaryAction] = useState<StylusButtonAction>('none');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width > 0 && height > 0) {
        setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fitScale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(viewport.width / BOARD_WIDTH, viewport.height / BOARD_HEIGHT)
      : 1;
  useLayoutEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return;
    const scale = zoomScale * fitScale;
    setStagePos({
      x: (viewport.width - BOARD_WIDTH * scale) / 2,
      y: (viewport.height - BOARD_HEIGHT * scale) / 2,
    });
  }, [viewport.width, viewport.height, fitScale, zoomScale]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const isHydratedRef = useRef(false);
  const clientIdRef = useRef('');
  if (!clientIdRef.current && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    clientIdRef.current = crypto.randomUUID();
  }
  const revisionRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const editEpochRef = useRef(0);
  const pushTimerRef = useRef<number | null>(null);
  const pushSendingRef = useRef(false);
  const pushQueuedRef = useRef(false);
  const liveStrokeRef = useRef<{ points: number[]; color: string; width: number } | null>(null);
  const inkTimerRef = useRef<number | null>(null);
  const inkSendingRef = useRef(false);
  const inkQueuedRef = useRef(false);
  const inkAbortRef = useRef<AbortController | null>(null);
  const inkSeqRef = useRef(0);
  const inkSentCountRef = useRef(0);
  const remoteInkRef = useRef<{ seq: number; points: number[] } | null>(null);
  const remoteInkFloorRef = useRef(0);
  const remoteStoreTimerRef = useRef<number | null>(null);
  const schedulePushRef = useRef<() => void>(() => {});
  const scheduleLocalPagesSaveRef = useRef<() => void>(() => {});
  const pagesJsonRef = useRef<{ pages: CanvasElement[][]; json: string } | null>(null);
  const localPagesTimerRef = useRef<number | null>(null);
  const lastLaserSentRef = useRef(0);

  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState<'rect' | 'freeform' | 'draw'>('rect');
  const [isEraserMenuOpen, setIsEraserMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isStylusMenuOpen, setIsStylusMenuOpen] = useState(false);
  const [isSmoothMenuOpen, setIsSmoothMenuOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isPagesTrayOpen, setIsPagesTrayOpen] = useState(false);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPagesForAssign, setSelectedPagesForAssign] = useState<number[]>([0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [assignPending, setAssignPending] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'task' | 'material' | null>(null);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;
  const historyMapRef = useRef<Map<number, { states: CanvasElement[][]; index: number }>>(new Map());
  const previousToolRef = useRef<ToolId>(activeTool === 'eraser' ? 'pen' : activeTool);
  const isTemporaryEraserRef = useRef(false);
  const temporaryEraserHoldersRef = useRef<Set<1 | 2>>(new Set());
  const stylusButtonHeldRef = useRef({ 1: false, 2: false });
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const strokeColorRef = useRef(strokeColor);
  strokeColorRef.current = strokeColor;
  const stylusPrimaryActionRef = useRef(stylusPrimaryAction);
  stylusPrimaryActionRef.current = stylusPrimaryAction;
  const stylusSecondaryActionRef = useRef(stylusSecondaryAction);
  stylusSecondaryActionRef.current = stylusSecondaryAction;
  return { toggleSidebarDrawer, canvasRef, fileInputRef, penMenuRef, selectMenuRef, eraserMenuRef, shapesMenuRef, colorMenuRef, stylusMenuRef, smoothMenuRef, pagesTrayRef, boardRootRef, isBoardFullscreen, setIsBoardFullscreen, pages, setPages, currentPageIndex, setCurrentPageIndex, activeTool, setActiveTool, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth, eraserWidth, setEraserWidth, isDark, setIsDark, stylusOnly, setStylusOnly, penSmoothEnabled, setPenSmoothEnabled, penSmoothIntensity, setPenSmoothIntensity, stylusPrimaryAction, setStylusPrimaryAction, stylusSecondaryAction, setStylusSecondaryAction, zoomScale, setZoomScale, boardViewportRef, viewport, setViewport, stagePos, setStagePos, fitScale, canUndo, setCanUndo, canRedo, setCanRedo, isHydratedRef, clientIdRef, revisionRef, applyingRemoteRef, editEpochRef, pushTimerRef, pushSendingRef, pushQueuedRef, liveStrokeRef, inkTimerRef, inkSendingRef, inkQueuedRef, inkAbortRef, inkSeqRef, inkSentCountRef, remoteInkRef, remoteInkFloorRef, remoteStoreTimerRef, schedulePushRef, scheduleLocalPagesSaveRef, pagesJsonRef, localPagesTimerRef, lastLaserSentRef, isPenMenuOpen, setIsPenMenuOpen, isSelectMenuOpen, setIsSelectMenuOpen, selectMode, setSelectMode, isEraserMenuOpen, setIsEraserMenuOpen, isShapesMenuOpen, setIsShapesMenuOpen, isColorMenuOpen, setIsColorMenuOpen, isStylusMenuOpen, setIsStylusMenuOpen, isSmoothMenuOpen, setIsSmoothMenuOpen, isClearConfirmOpen, setIsClearConfirmOpen, isPagesTrayOpen, setIsPagesTrayOpen, isAiModalOpen, setIsAiModalOpen, isAssignModalOpen, setIsAssignModalOpen, selectedPagesForAssign, setSelectedPagesForAssign, selectedStudentIds, setSelectedStudentIds, courseGroups, setCourseGroups, expandedCourseIds, setExpandedCourseIds, loadingCourses, setLoadingCourses, assignPending, setAssignPending, assignTargetType, setAssignTargetType, assignedStatus, setAssignedStatus, assignError, setAssignError, pagesRef, currentPageIndexRef, historyMapRef, previousToolRef, isTemporaryEraserRef, temporaryEraserHoldersRef, stylusButtonHeldRef, activeToolRef, strokeColorRef, stylusPrimaryActionRef, stylusSecondaryActionRef };
}

export type WhiteboardState = ReturnType<typeof useWhiteboardState>;
