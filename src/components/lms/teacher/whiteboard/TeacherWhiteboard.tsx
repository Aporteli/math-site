'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Crosshair,
  Diamond,
  Download,
  Eraser,
  Hand,
  ImageIcon,
  Loader2,
  Maximize2,
  Minus,
  Moon,
  MousePointer,
  MoveRight,
  PanelLeftOpen,
  Pencil,
  Plus,
  Redo2,
  Send,
  Sparkles,
  Square,
  Star,
  Sun,
  Trash2,
  Triangle,
  Type,
  Undo2,
  UserCheck,
  X,
  Layers,
  Check,
  BookOpen,
  GraduationCap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useDashboardFrame } from '@/components/layout/DashboardFrame';
import type { CanvasElement, KonvaCanvasHandle } from '@/components/lms/classroom/KonvaCanvas';
import type { Dictionary } from '@/i18n/types';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { getTeacherStudentsAction } from '@/lib/actions/teacher-students';

const KonvaCanvas = dynamic(() => import('@/components/lms/classroom/KonvaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <Loader2 className="size-8 animate-spin text-muted" />
    </div>
  ),
});

const ClassroomAiModal = dynamic(
  () => import('@/components/lms/classroom/ClassroomAiModal').then((m) => m.ClassroomAiModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    ),
  },
);

type WhiteboardCopy = Dictionary['dashboard']['teacher']['whiteboard'];

type ToolId =
  | 'select'
  | 'hand'
  | 'pen'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'text'
  | 'eraser'
  | 'laser';

const STORAGE_KEY_PAGES = 'teacher_whiteboard_permanent_pages_v7';
const PREFS_KEY = 'teacher_whiteboard_permanent_prefs_v7';
const DEFAULT_COLOR = '#1e293b';
const DARK_COLORS = ['#1e293b', '#000000']; // default dark-blue and black
const LIGHT_COLOR = '#ffffff';

const COLORS = [
  { hex: '#1e293b', label: 'მუქი ლურჯი' },
  { hex: '#000000', label: 'შავი' },
  { hex: '#ef4444', label: 'წითელი' },
  { hex: '#10b981', label: 'მწვანე' },
  { hex: '#3b82f6', label: 'ცისფერი' },
  { hex: '#f59e0b', label: 'ყვითელი' },
  { hex: '#8b5cf6', label: 'იასამნისფერი' },
  { hex: '#ffffff', label: 'თეთრი' },
];

const STROKE_SIZES = [1, 2, 4, 8, 14];

const SHAPE_TOOLS: { id: ToolId; icon: typeof Minus; label: string }[] = [
  { id: 'line', icon: Minus, label: 'ხაზი' },
  { id: 'arrow', icon: MoveRight, label: 'ისარი' },
  { id: 'rect', icon: Square, label: 'მართკუთხედი' },
  { id: 'circle', icon: Circle, label: 'წრე' },
  { id: 'triangle', icon: Triangle, label: 'სამკუთხედი' },
  { id: 'diamond', icon: Diamond, label: 'რომბი' },
  { id: 'star', icon: Star, label: 'ვარსკვლავი' },
];

interface CourseGroup {
  id: string;
  title: string;
  students: { id: string; name: string; email?: string }[];
}

function renderElementsToDataUrl(elements: CanvasElement[], isDark: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = isDark ? '#020617' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (elements.length === 0) return canvas.toDataURL('image/png');

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  elements.forEach((el) => {
    if (el.points && el.points.length > 0) {
      for (let i = 0; i < el.points.length; i += 2) {
        const px = (el.x || 0) + el.points[i];
        const py = (el.y || 0) + el.points[i + 1];
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    } else if (el.x !== undefined && el.y !== undefined) {
      const ew = el.width || (el.radius ? el.radius * 2 : 150);
      const eh = el.height || (el.radius ? el.radius * 2 : 60);
      if (el.x < minX) minX = el.x;
      if (el.x + ew > maxX) maxX = el.x + ew;
      if (el.y < minY) minY = el.y;
      if (el.y + eh > maxY) maxY = el.y + eh;
    }
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const padding = 40;
  const boundW = Math.max(100, maxX - minX + padding * 2);
  const boundH = Math.max(100, maxY - minY + padding * 2);
  const scale = Math.min((canvas.width - padding * 2) / boundW, (canvas.height - padding * 2) / boundH, 1.5);
  const offsetX = (canvas.width - boundW * scale) / 2 - (minX - padding) * scale;
  const offsetY = (canvas.height - boundH * scale) / 2 - (minY - padding) * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  elements.forEach((el) => {
    ctx.strokeStyle = isDark && el.stroke === '#16233a' ? '#ffffff' : el.stroke || '#6366f1';
    ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.points && el.points.length >= 2) {
      ctx.beginPath();
      const ox = el.x || 0;
      const oy = el.y || 0;
      ctx.moveTo(ox + el.points[0], oy + el.points[1]);
      for (let i = 2; i < el.points.length; i += 2) ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
      if (el.type === 'triangle' || el.type === 'diamond') ctx.closePath();
      ctx.stroke();
    } else if (el.type === 'rect') {
      ctx.strokeRect(el.x || 0, el.y || 0, el.width || 100, el.height || 60);
    } else if (el.type === 'circle') {
      ctx.beginPath();
      ctx.arc(el.x || 0, el.y || 0, el.radius || 30, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === 'text') {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(el.text || '', el.x || 0, (el.y || 0) + 32);
    }
  });

  ctx.restore();
  return canvas.toDataURL('image/png');
}

function BoardThumbnail({ elements, isActive, pageIndex, isDark, onClick, onDelete, canDelete }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    if (!elements || elements.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    elements.forEach((el: any) => {
      if (el.points && el.points.length > 0) {
        for (let i = 0; i < el.points.length; i += 2) {
          const px = (el.x || 0) + el.points[i];
          const py = (el.y || 0) + el.points[i + 1];
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      } else if (el.x !== undefined && el.y !== undefined) {
        const ew = el.width || (el.radius ? el.radius * 2 : 80);
        const eh = el.height || (el.radius ? el.radius * 2 : 40);
        if (el.x < minX) minX = el.x;
        if (el.x + ew > maxX) maxX = el.x + ew;
        if (el.y < minY) minY = el.y;
        if (el.y + eh > maxY) maxY = el.y + eh;
      }
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }
    const boundW = Math.max(100, maxX - minX);
    const boundH = Math.max(100, maxY - minY);
    const scale = Math.min((w - 16) / boundW, (h - 16) / boundH);
    const offsetX = (w - boundW * scale) / 2 - minX * scale;
    const offsetY = (h - boundH * scale) / 2 - minY * scale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    elements.forEach((el: any) => {
      ctx.strokeStyle = isDark && el.stroke === '#16233a' ? '#ffffff' : el.stroke || '#6366f1';
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        if (el.type === 'triangle' || el.type === 'diamond') ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 40, el.height || 40);
      } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.arc(el.x || 0, el.y || 0, el.radius || 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'text') {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(el.text || '', el.x || 0, (el.y || 0) + 20);
      }
    });
    ctx.restore();
  }, [elements, isDark]);

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl cursor-pointer transition-all shrink-0 ${isActive ? 'bg-navy-tint ring-2 ring-navy shadow-xs' : 'hover:bg-paper border border-hairline'}`}>
      <div className="relative w-28 h-18 rounded-xl overflow-hidden shadow-2xs border border-hairline bg-white">
        <canvas ref={canvasRef} width={112} height={72} className="w-full h-full object-contain" />
        {canDelete && (
          <button
            type="button"
            title="გვერდის წაშლა"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-rose-600 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-xs z-10">
            <X className="size-3" />
          </button>
        )}
      </div>
      <span className={`text-[11px] font-bold ${isActive ? 'text-navy font-extrabold' : 'text-muted'}`}>
        დაფა {pageIndex + 1}
      </span>
    </div>
  );
}

function AssignBoardThumbnail({ elements, isSelected, pageIndex, isDark, onToggle }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    if (!elements || elements.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    elements.forEach((el: any) => {
      if (el.points && el.points.length > 0) {
        for (let i = 0; i < el.points.length; i += 2) {
          const px = (el.x || 0) + el.points[i];
          const py = (el.y || 0) + el.points[i + 1];
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      } else if (el.x !== undefined && el.y !== undefined) {
        const ew = el.width || (el.radius ? el.radius * 2 : 80);
        const eh = el.height || (el.radius ? el.radius * 2 : 40);
        if (el.x < minX) minX = el.x;
        if (el.x + ew > maxX) maxX = el.x + ew;
        if (el.y < minY) minY = el.y;
        if (el.y + eh > maxY) maxY = el.y + eh;
      }
    });
    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }
    const boundW = Math.max(100, maxX - minX);
    const boundH = Math.max(100, maxY - minY);
    const scale = Math.min((w - 12) / boundW, (h - 12) / boundH);
    const offsetX = (w - boundW * scale) / 2 - minX * scale;
    const offsetY = (h - boundH * scale) / 2 - minY * scale;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    elements.forEach((el: any) => {
      ctx.strokeStyle = isDark && el.stroke === '#16233a' ? '#ffffff' : el.stroke || '#6366f1';
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        if (el.type === 'triangle' || el.type === 'diamond') ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 40, el.height || 40);
      } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.arc(el.x || 0, el.y || 0, el.radius || 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'text') {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(el.text || '', el.x || 0, (el.y || 0) + 20);
      }
    });
    ctx.restore();
  }, [elements, isDark]);

  return (
    <div
      onClick={onToggle}
      className={`group relative flex flex-col items-center gap-1 p-1 rounded-2xl cursor-pointer transition-all shrink-0 select-none ${isSelected ? 'bg-navy-tint ring-2 ring-navy' : 'hover:bg-paper border border-hairline'}`}>
      <div className="relative w-24 h-15 rounded-xl overflow-hidden shadow-2xs border border-hairline bg-white">
        <canvas ref={canvasRef} width={96} height={60} className="w-full h-full object-contain" />
        <div
          className={`absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border transition-all ${isSelected ? 'bg-navy border-navy text-white' : 'bg-white/80 border-slate-300 text-transparent group-hover:border-slate-400'}`}>
          <Check className="size-2.5 stroke-[3]" />
        </div>
      </div>
      <span className={`text-[10px] font-bold ${isSelected ? 'text-navy font-extrabold' : 'text-muted'}`}>
        გვერდი {pageIndex + 1}
      </span>
    </div>
  );
}

function ToolButton({ title, onClick, active, disabled, children }: any) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors',
        active ? 'bg-navy text-white shadow-sm' : 'text-body hover:bg-paper hover:text-navy',
        disabled ? 'pointer-events-none opacity-40' : '',
      ].join(' ')}>
      {children}
    </button>
  );
}

export function TeacherWhiteboard({ copy }: { copy: WhiteboardCopy }) {
  const { toggleSidebarDrawer } = useDashboardFrame();
  const canvasRef = useRef<KonvaCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const pagesTrayRef = useRef<HTMLDivElement>(null);

  const [pages, setPages] = useState<CanvasElement[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<ToolId>('pen');
  const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const isHydratedRef = useRef(false);

  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
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

  useEffect(() => {
    try {
      const prefsRaw = localStorage.getItem(PREFS_KEY);
      if (prefsRaw) {
        const p = JSON.parse(prefsRaw);
        if (p.tool) setActiveTool(p.tool);
        if (p.color) setStrokeColor(p.color);
        if (typeof p.width === 'number') setStrokeWidth(p.width);
        if (typeof p.isDark === 'boolean') setIsDark(p.isDark);
        if (typeof p.zoomScale === 'number') setZoomScale(p.zoomScale);
        if (typeof p.currentPageIndex === 'number') setCurrentPageIndex(p.currentPageIndex);
      }
      const pagesRaw = localStorage.getItem(STORAGE_KEY_PAGES);
      if (pagesRaw) {
        const parsed = JSON.parse(pagesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPages(parsed);
          pagesRef.current = parsed;
          parsed.forEach((p, idx) => {
            historyMapRef.current.set(idx, { states: [p || []], index: 0 });
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  const savePreferencesImmediately = useCallback(
    (updates: any) => {
      if (typeof window === 'undefined' || !isHydratedRef.current) return;
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        const current = raw ? JSON.parse(raw) : {};
        const next = {
          tool: updates.tool ?? activeTool,
          color: updates.color ?? strokeColor,
          width: updates.width ?? strokeWidth,
          isDark: updates.isDark ?? isDark,
          zoomScale: updates.zoomScale ?? zoomScale,
          currentPageIndex: updates.pageIdx ?? currentPageIndex,
        };
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
    },
    [activeTool, strokeColor, strokeWidth, isDark, zoomScale, currentPageIndex],
  );

  const updateUndoRedoState = useCallback(() => {
    const hist = historyMapRef.current.get(currentPageIndexRef.current);
    if (hist) {
      setCanUndo(hist.index > 0);
      setCanRedo(hist.index < hist.states.length - 1);
    } else {
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  const handleElementsChange = useCallback(
    (next: CanvasElement[]) => {
      const pIndex = currentPageIndexRef.current;
      const updated = [...pagesRef.current];
      updated[pIndex] = next;
      setPages(updated);
      pagesRef.current = updated;

      if (isHydratedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
        } catch (e) {}
      }

      let hist = historyMapRef.current.get(pIndex);
      if (!hist) {
        hist = { states: [[]], index: 0 };
      }
      const nextStates = hist.states.slice(0, hist.index + 1);
      nextStates.push(next);
      historyMapRef.current.set(pIndex, { states: nextStates, index: nextStates.length - 1 });
      updateUndoRedoState();
    },
    [updateUndoRedoState],
  );

  const undo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const hist = historyMapRef.current.get(pIndex);
    if (!hist || hist.index <= 0) return;
    hist.index -= 1;
    const targetElements = hist.states[hist.index];
    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;
    if (isHydratedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      } catch {}
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const hist = historyMapRef.current.get(pIndex);
    if (!hist || hist.index >= hist.states.length - 1) return;
    hist.index += 1;
    const targetElements = hist.states[hist.index];
    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;
    if (isHydratedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      } catch {}
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  // --- 🌟 Smart theme conversion for existing elements ---
  useEffect(() => {
    const darkColors = DARK_COLORS; // ['#1e293b', '#000000']
    const lightColor = LIGHT_COLOR; // '#ffffff'
    let updated = false;

    const newPages = pagesRef.current.map((page) =>
      page.map((el) => {
        if (isDark) {
          // In dark mode: convert any dark default colour to white
          if (darkColors.includes(el.stroke)) {
            updated = true;
            return { ...el, stroke: lightColor };
          }
        } else {
          // In light mode: convert white (that came from conversion) back to default
          if (el.stroke === lightColor) {
            updated = true;
            return { ...el, stroke: DEFAULT_COLOR };
          }
        }
        return el;
      }),
    );

    if (updated) {
      setPages(newPages);
      pagesRef.current = newPages;

      // Update history for the current page
      const pIndex = currentPageIndexRef.current;
      let hist = historyMapRef.current.get(pIndex);
      if (hist) {
        const nextStates = hist.states.slice(0, hist.index + 1);
        nextStates.push(newPages[pIndex]);
        historyMapRef.current.set(pIndex, { states: nextStates, index: nextStates.length - 1 });
        updateUndoRedoState();
      }

      // Persist to localStorage
      if (isHydratedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(newPages));
        } catch (e) {}
      }
    }
  }, [isDark, updateUndoRedoState]);

  const addImage = useCallback(
    (dataUrl: string, pos?: { x: number; y: number }) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxW = 450;
        const maxH = 450;
        let w = img.width || 300;
        let h = img.height || 200;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const elem: CanvasElement = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          x: pos ? pos.x : 100,
          y: pos ? pos.y : 100,
          width: w,
          height: h,
          src: dataUrl,
          stroke: 'transparent',
          strokeWidth: 0,
        };

        const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
        handleElementsChange([...currentElems, elem]);
        setActiveTool('select');
        savePreferencesImmediately({ tool: 'select' });
      };
    },
    [handleElementsChange, savePreferencesImmediately],
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (penMenuRef.current && !penMenuRef.current.contains(target)) setIsPenMenuOpen(false);
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(target)) setIsShapesMenuOpen(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setIsColorMenuOpen(false);
      if (pagesTrayRef.current && !pagesTrayRef.current.contains(target)) {
        const el = target as HTMLElement;
        if (!el.closest?.('[data-tray-trigger]')) setIsPagesTrayOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImage]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const setAndSaveTool = (tool: ToolId) => {
    setActiveTool(tool);
    savePreferencesImmediately({ tool });
  };
  const setAndSaveColor = (color: string) => {
    setStrokeColor(color);
    savePreferencesImmediately({ color });
  };
  const setAndSaveWidth = (width: number) => {
    setStrokeWidth(width);
    savePreferencesImmediately({ width });
  };
  const toggleAndSaveTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    savePreferencesImmediately({ isDark: nextDark });
  };
  const zoomIn = () => {
    const next = Math.min(4, Math.round((zoomScale + 0.15) * 100) / 100);
    setZoomScale(next);
    savePreferencesImmediately({ zoomScale: next });
  };
  const zoomOut = () => {
    const next = Math.max(0.2, Math.round((zoomScale - 0.15) * 100) / 100);
    setZoomScale(next);
    savePreferencesImmediately({ zoomScale: next });
  };
  const zoomReset = () => {
    setZoomScale(1);
    savePreferencesImmediately({ zoomScale: 1 });
  };

  const fitToContent = () => canvasRef.current?.fitToContent();
  const deleteSelected = () => canvasRef.current?.deleteSelected();
  const clearBoard = () => handleElementsChange([]);
  const openImagePicker = () => fileInputRef.current?.click();

  const exportPng = () => {
    const url = canvasRef.current?.toDataURL();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
  };

  const handleAddNewPage = () => {
    const updated = [...pagesRef.current, []];
    const newIdx = updated.length - 1;
    setPages(updated);
    pagesRef.current = updated;
    setCurrentPageIndex(newIdx);
    historyMapRef.current.set(newIdx, { states: [[]], index: 0 });
    if (isHydratedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      } catch {}
    }
    savePreferencesImmediately({ pageIdx: newIdx });
    updateUndoRedoState();
  };

  const handleDeletePage = (pageIdx: number) => {
    if (pages.length <= 1) {
      clearBoard();
      return;
    }
    const updated = pages.filter((_, idx) => idx !== pageIdx);
    setPages(updated);
    pagesRef.current = updated;
    const nextIdx = Math.min(currentPageIndex, updated.length - 1);
    setCurrentPageIndex(nextIdx);
    if (isHydratedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      } catch {}
    }
    savePreferencesImmediately({ pageIdx: nextIdx });
    updateUndoRedoState();
  };

  const handleSwitchPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    savePreferencesImmediately({ pageIdx: idx });
    if (!historyMapRef.current.has(idx)) {
      historyMapRef.current.set(idx, { states: [pages[idx] || []], index: 0 });
    }
    updateUndoRedoState();
  };

  const fetchCoursesAndStudents = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getTeacherStudentsAction();
      if (res.success && res.courseGroups) {
        setCourseGroups(res.courseGroups);
        if (res.courseGroups.length > 0) setExpandedCourseIds([res.courseGroups[0].id]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const handleOpenAssignModal = () => {
    setAssignError(null);
    setSelectedPagesForAssign([currentPageIndex]);
    setIsAssignModalOpen(true);
    void fetchCoursesAndStudents();
  };

  const togglePageSelection = (idx: number) => {
    setSelectedPagesForAssign((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  };
  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  };
  const toggleCourseSelectAll = (course: CourseGroup) => {
    const studentIds = course.students.map((s) => s.id);
    const allSelected = studentIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...studentIds])));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleAssignSelectedBoards = async (mode: 'task' | 'material') => {
    if (selectedPagesForAssign.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 დაფა');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }
    if (selectedStudentIds.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 მოსწავლე');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }
    setAssignPending(true);
    setAssignTargetType(mode);
    setAssignError(null);
    try {
      const boardImages: { pageIdx: number; url: string }[] = [];
      for (const pageIdx of selectedPagesForAssign) {
        if (pageIdx === currentPageIndexRef.current && canvasRef.current) {
          const liveUrl = canvasRef.current.toDataURL();
          if (liveUrl) {
            boardImages.push({ pageIdx, url: liveUrl });
            continue;
          }
        }
        const elems = pagesRef.current[pageIdx] || [];
        const renderedUrl = renderElementsToDataUrl(elems, isDark);
        boardImages.push({ pageIdx, url: renderedUrl });
      }

      const uploadedBoardUrls = await Promise.all(
        boardImages.map((board) =>
          uploadImageToStorageAction({
            dataUrl: board.url,
            fileName: `${mode === 'material' ? 'material' : 'board'}-page-${board.pageIdx + 1}.png`,
          }),
        ),
      );

      const resolvedBoardImages: { pageIdx: number; url: string }[] = [];
      for (let index = 0; index < boardImages.length; index++) {
        const uploaded = uploadedBoardUrls[index];
        if (!uploaded?.success || !uploaded.url) throw new Error('დაფის სურათის ატვირთვა ვერ მოხერხდა');
        resolvedBoardImages.push({ pageIdx: boardImages[index].pageIdx, url: uploaded.url });
      }

      const isMat = mode === 'material';
      const sendPromises = [];
      for (const studentId of selectedStudentIds) {
        for (const board of resolvedBoardImages) {
          const title = isMat
            ? `სასწავლო მასალა (დაფა ${board.pageIdx + 1})`
            : `დაფის ამოცანა — გვერდი ${board.pageIdx + 1}`;
          sendPromises.push(
            sendProblemToStudentAction({
              studentId,
              instructions: isMat ? 'მასალა' : undefined,
              attachmentUrl: board.url,
              problem: {
                id: `${isMat ? 'mat' : 'whiteboard'}-${Date.now()}-${board.pageIdx}`,
                topic: title,
                difficulty: isMat ? 'easy' : 'medium',
                promptTex: '',
                solutionTex: '',
              },
            }),
          );
        }
      }

      const results = await Promise.all(sendPromises);
      if (results.some((r) => !r.success)) throw new Error('ზოგიერთი ჩანაწერის გაგზავნა ვერ მოხერხდა');
      setAssignedStatus(
        isMat
          ? `მასალები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`
          : `დავალებები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`,
      );
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setAssignError(err.message || 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setAssignPending(false);
      setAssignTargetType(null);
    }
  };

  const currentShapeObj = SHAPE_TOOLS.find((s) => s.id === activeTool) || SHAPE_TOOLS[2];
  const CurrentShapeIcon = currentShapeObj.icon;
  const isShapeActive = SHAPE_TOOLS.some((s) => s.id === activeTool);
  const effectiveStroke =
    isDark && (strokeColor === DEFAULT_COLOR || strokeColor === '#000000') ? '#ffffff' : strokeColor;

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }
        }}
      />

      <div className="relative z-30 shrink-0 border-b border-hairline bg-surface overflow-visible">
        <div className="flex w-max min-w-full items-center gap-1.5 px-3 py-2 overflow-visible">
          <button
            type="button"
            onClick={toggleSidebarDrawer}
            title={copy.openMenu}
            aria-label={copy.openMenu}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-ink shadow-sm transition-all hover:border-navy/30 hover:text-navy">
            <PanelLeftOpen className="size-4" />
          </button>
          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />
          <ToolButton title={copy.undo} onClick={undo} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton title={copy.redo} onClick={redo} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </ToolButton>
          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />
          <ToolButton
            title={copy.tools.select}
            active={activeTool === 'select'}
            onClick={() => setAndSaveTool('select')}>
            <MousePointer className="size-4" />
          </ToolButton>
          <ToolButton title={copy.tools.hand} active={activeTool === 'hand'} onClick={() => setAndSaveTool('hand')}>
            <Hand className="size-4" />
          </ToolButton>
          <ToolButton title={copy.tools.laser} active={activeTool === 'laser'} onClick={() => setAndSaveTool('laser')}>
            <Crosshair className="size-4" />
          </ToolButton>

          <div ref={penMenuRef} className="relative flex shrink-0 items-center">
            <div
              className={`flex items-center h-8 rounded-xl transition-all shadow-xs ${activeTool === 'pen' ? 'bg-navy text-white' : 'bg-paper hover:bg-paper-deep text-ink border border-hairline'}`}>
              <button
                type="button"
                title="კალამი"
                onClick={() => {
                  setAndSaveTool('pen');
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                }}
                className="flex items-center gap-1 h-full px-2 rounded-l-xl focus:outline-none">
                <Pencil className="size-4" />
                <span className="text-[11px] font-mono font-medium opacity-90">{strokeWidth}px</span>
              </button>
              <button
                type="button"
                title="სისქის მენიუ"
                onClick={() => {
                  setIsPenMenuOpen((prev) => !prev);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                }}
                className={`flex items-center justify-center px-1.5 h-full rounded-r-xl transition-colors border-l ${activeTool === 'pen' ? 'border-white/20 hover:bg-navy-strong' : 'border-hairline hover:bg-paper'}`}>
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${isPenMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {isPenMenuOpen && (
              <div className="absolute top-full mt-2 left-0 z-[120] w-56 rounded-2xl bg-white p-3 shadow-2xl border border-hairline animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline">
                  <span className="text-xs font-semibold text-ink">კალმის სისქე</span>
                  <span className="text-xs font-mono font-bold text-navy">{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={strokeWidth}
                  onChange={(e) => setAndSaveWidth(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-paper-deep rounded-lg appearance-none cursor-pointer accent-navy"
                />
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-hairline">
                  {STROKE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setAndSaveWidth(size)}
                      className={`size-7 flex items-center justify-center rounded-xl transition-colors ${strokeWidth === size ? 'bg-navy-tint text-navy ring-1 ring-navy font-bold' : 'hover:bg-paper text-muted'}`}>
                      <div
                        className="rounded-full bg-current"
                        style={{ width: Math.min(14, size + 2), height: Math.min(14, size + 2) }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={shapesMenuRef} className="relative flex shrink-0 items-center">
            <div
              className={`flex items-center h-8 rounded-xl transition-all shadow-xs ${isShapeActive ? 'bg-navy text-white' : 'bg-paper hover:bg-paper-deep text-ink border border-hairline'}`}>
              <button
                type="button"
                title="ფიგურა"
                onClick={() => {
                  setAndSaveTool(currentShapeObj.id);
                  setIsShapesMenuOpen(false);
                  setIsPenMenuOpen(false);
                  setIsColorMenuOpen(false);
                }}
                className="flex items-center justify-center size-8 rounded-l-xl focus:outline-none">
                <CurrentShapeIcon className="size-4" />
              </button>
              <button
                type="button"
                title="ფიგურების მენიუ"
                onClick={() => {
                  setIsShapesMenuOpen((prev) => !prev);
                  setIsPenMenuOpen(false);
                  setIsColorMenuOpen(false);
                }}
                className={`flex items-center justify-center px-1.5 h-full rounded-r-xl transition-colors border-l ${isShapeActive ? 'border-white/20 hover:bg-navy-strong' : 'border-hairline hover:bg-paper'}`}>
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${isShapesMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {isShapesMenuOpen && (
              <div className="absolute top-full mt-2 left-0 z-[120] w-48 rounded-2xl bg-white p-2.5 shadow-2xl border border-hairline animate-in fade-in zoom-in-95 duration-150">
                <div className="grid grid-cols-2 gap-1.5">
                  {SHAPE_TOOLS.map((s) => {
                    const SIcon = s.icon;
                    const isSelected = activeTool === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        title={s.label}
                        onClick={() => {
                          setAndSaveTool(s.id);
                          setIsShapesMenuOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-navy text-white font-bold' : 'text-body hover:bg-paper hover:text-navy'}`}>
                        <SIcon className="size-3.5 shrink-0" />
                        <span className="truncate text-[11px]">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ToolButton title={copy.tools.text} active={activeTool === 'text'} onClick={() => setAndSaveTool('text')}>
            <Type className="size-4" />
          </ToolButton>
          <ToolButton title={copy.tools.image} onClick={openImagePicker}>
            <ImageIcon className="size-4" />
          </ToolButton>
          <ToolButton
            title={copy.tools.eraser}
            active={activeTool === 'eraser'}
            onClick={() => setAndSaveTool('eraser')}>
            <Eraser className="size-4" />
          </ToolButton>

          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />

          <div ref={colorMenuRef} className="relative flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => {
                setIsColorMenuOpen((prev) => !prev);
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              title="ფერის არჩევა"
              className="flex items-center gap-1.5 h-8 px-2 rounded-xl bg-paper hover:bg-paper-deep transition-colors border border-hairline">
              <span
                className="size-4 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: effectiveStroke }}
              />
              <ChevronDown
                className={`size-3 text-muted transition-transform duration-200 ${isColorMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isColorMenuOpen && (
              <div className="absolute top-full mt-2 left-0 z-[120] w-max rounded-2xl bg-white p-2.5 shadow-2xl border border-hairline animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      onClick={() => setAndSaveColor(c.hex)}
                      className={`size-7 rounded-full border transition-transform ${strokeColor === c.hex ? 'scale-115 ring-2 ring-navy ring-offset-1' : 'hover:scale-110 border-black/10'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />

          <ToolButton title={copy.zoomOut} onClick={zoomOut}>
            <ZoomOut className="size-4" />
          </ToolButton>
          <button
            type="button"
            onClick={zoomReset}
            title={copy.zoomReset}
            className="shrink-0 rounded-lg px-1 text-xs font-semibold tabular-nums text-muted hover:text-navy">
            {Math.round(zoomScale * 100)}%
          </button>
          <ToolButton title={copy.zoomIn} onClick={zoomIn}>
            <ZoomIn className="size-4" />
          </ToolButton>
          <ToolButton title={copy.fitToContent} onClick={fitToContent}>
            <Maximize2 className="size-4" />
          </ToolButton>
          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            title="AI ასისტენტი"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-95 shrink-0">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>AI</span>
          </button>
          <div className="mx-1 h-6 w-px shrink-0 bg-hairline" />
          <ToolButton title={isDark ? copy.lightMode : copy.darkMode} onClick={toggleAndSaveTheme}>
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </ToolButton>
          <ToolButton title={copy.export} onClick={exportPng}>
            <Download className="size-4" />
          </ToolButton>
          <button
            type="button"
            title={copy.clear}
            aria-label={copy.clear}
            onClick={() => setIsClearConfirmOpen(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-body transition-colors hover:bg-rose-50 hover:text-rose-500">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Canvas container – inline style guarantees isolation from global theme */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden touch-none select-none"
        style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(file);
          }
        }}>
        <KonvaCanvas
          ref={canvasRef}
          elements={pages[currentPageIndex] || []}
          onElementsChange={handleElementsChange}
          activeTool={activeTool}
          strokeColor={effectiveStroke}
          strokeWidth={strokeWidth}
          isDark={isDark}
          scale={zoomScale}
          onScaleChange={(s) => {
            setZoomScale(s);
            savePreferencesImmediately({ zoomScale: s });
          }}
          textPlaceholder={copy.textPlaceholder}
          onPasteImage={addImage}
        />
      </div>

      <div className="relative z-20 shrink-0 flex flex-col items-center justify-center p-2 bg-paper/30 border-t border-hairline select-none">
        {isPagesTrayOpen && (
          <div
            ref={pagesTrayRef}
            className="absolute bottom-14 max-w-[94vw] sm:max-w-2xl bg-white/95 backdrop-blur-md p-3 rounded-3xl border border-hairline shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 z-30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline px-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-navy" />
                <span className="text-xs font-bold text-ink">დაფის გვერდები ({pages.length})</span>
              </div>
              <button type="button" onClick={() => setIsPagesTrayOpen(false)} className="text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-1 px-1 custom-scrollbar">
              {pages.map((pageElems, idx) => (
                <BoardThumbnail
                  key={idx}
                  pageIndex={idx}
                  elements={pageElems}
                  isActive={currentPageIndex === idx}
                  isDark={isDark}
                  onClick={() => handleSwitchPage(idx)}
                  onDelete={() => handleDeletePage(idx)}
                  canDelete={pages.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={handleAddNewPage}
                className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl border-2 border-dashed border-hairline hover:border-navy hover:bg-navy-tint text-muted hover:text-navy transition-all shrink-0 cursor-pointer">
                <Plus className="size-5" />
                <span className="text-[11px] font-bold">ახალი დაფა</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[96vw] overflow-x-auto thin-scrollbar touch-pan-x rounded-2xl border border-hairline bg-white shadow-sm">
          <div className="flex w-max items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5">
            <button
              type="button"
              onClick={() => handleSwitchPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-paper hover:bg-paper-deep disabled:opacity-40 text-ink transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              data-tray-trigger
              onClick={() => setIsPagesTrayOpen((prev) => !prev)}
              title="ყველა დაფის ნახვა"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${isPagesTrayOpen ? 'bg-navy text-white shadow-xs' : 'hover:bg-paper text-ink'}`}>
              <Layers className="size-3.5" />
              <span>
                {currentPageIndex + 1} / {pages.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-paper hover:bg-paper-deep disabled:opacity-40 text-ink transition-colors">
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleAddNewPage}
              className="flex items-center gap-1.5 h-7 sm:h-8 px-2.5 rounded-xl bg-paper hover:bg-paper-deep text-ink text-xs font-medium transition-colors">
              <Plus className="size-3.5" />
              <span>ახალი</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAssignModal}
              title="დაფის სურათის გაგზავნა მოსწავლეებთან"
              className="flex items-center gap-1.5 h-7 sm:h-8 px-3 rounded-xl bg-navy hover:bg-navy-strong text-white text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0">
              <Send className="size-3.5" />
              <span>გაგზავნა</span>
            </button>
          </div>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-hairline animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-hairline bg-paper/30 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
                  <Send className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink leading-tight">დაფის გაგზავნა მოსწავლეებთან</h3>
                  <p className="text-[11px] text-muted">აირჩიეთ დაფები და ადრესატები კურსების მიხედვით</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignError(null);
                }}
                className="flex size-7 items-center justify-center rounded-xl border border-hairline bg-white text-muted hover:bg-paper hover:text-ink transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-ink">
                    მონიშნული დაფები ({selectedPagesForAssign.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPagesForAssign.length === pages.length) {
                        setSelectedPagesForAssign([currentPageIndex]);
                      } else {
                        setSelectedPagesForAssign(pages.map((_, i) => i));
                      }
                    }}
                    className="text-xs font-bold text-navy hover:underline">
                    {selectedPagesForAssign.length === pages.length ? 'მხოლოდ მიმდინარე' : 'ყველა დაფა'}
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto px-2 py-2 custom-scrollbar border border-hairline rounded-2xl bg-paper/20">
                  {pages.map((pageElems, idx) => (
                    <AssignBoardThumbnail
                      key={idx}
                      pageIndex={idx}
                      elements={pageElems}
                      isSelected={selectedPagesForAssign.includes(idx)}
                      isDark={isDark}
                      onToggle={() => togglePageSelection(idx)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">
                    კურსები და მოსწავლეები ({selectedStudentIds.length} მონიშნულია):
                  </span>
                  {courseGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allStudentIds = courseGroups.flatMap((g) => g.students.map((s) => s.id));
                        if (allStudentIds.every((id) => selectedStudentIds.includes(id))) {
                          setSelectedStudentIds([]);
                        } else {
                          setSelectedStudentIds(Array.from(new Set(allStudentIds)));
                        }
                      }}
                      className="text-xs font-bold text-navy hover:underline">
                      {courseGroups.flatMap((g) => g.students).every((s) => selectedStudentIds.includes(s.id))
                        ? 'მონიშვნის მოხსნა'
                        : 'ყველა მოსწავლის მონიშვნა'}
                    </button>
                  )}
                </div>
                {loadingCourses ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
                    <Loader2 className="size-6 animate-spin text-navy" />
                    <span className="text-xs">კურსები იტვირთება...</span>
                  </div>
                ) : courseGroups.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed rounded-2xl">
                    კურსები და მოსწავლეები ვერ მოიძებნა
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {courseGroups.map((group) => {
                      const isExpanded = expandedCourseIds.includes(group.id);
                      const groupStudentIds = group.students.map((s) => s.id);
                      const allGroupSelected =
                        groupStudentIds.length > 0 && groupStudentIds.every((id) => selectedStudentIds.includes(id));
                      const someGroupSelected =
                        groupStudentIds.some((id) => selectedStudentIds.includes(id)) && !allGroupSelected;
                      return (
                        <div
                          key={group.id}
                          className="rounded-2xl border border-hairline bg-paper/30 overflow-hidden transition-all">
                          <div
                            onClick={() => toggleCourseExpand(group.id)}
                            className="flex items-center justify-between p-3 bg-white hover:bg-paper cursor-pointer transition-colors">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <GraduationCap className="size-4 text-navy shrink-0" />
                              <span className="text-xs font-bold text-ink truncate">{group.title}</span>
                              <span className="rounded-md bg-paper-deep px-1.5 py-0.5 text-[10px] font-bold text-muted">
                                {group.students.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseSelectAll(group);
                                }}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${allGroupSelected ? 'bg-navy text-white border-navy' : someGroupSelected ? 'bg-navy-tint text-navy border-navy/30' : 'bg-paper text-muted border-hairline hover:text-ink'}`}>
                                {allGroupSelected ? 'მონიშნულია' : 'ჯგუფის მონიშვნა'}
                              </button>
                              <ChevronDown
                                className={`size-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="p-2 border-t border-hairline bg-slate-50/50 space-y-1">
                              {group.students.length === 0 ? (
                                <p className="text-[11px] text-muted p-2 text-center">ამ კურსში მოსწავლეები არ არიან</p>
                              ) : (
                                group.students.map((student) => {
                                  const isSelected = selectedStudentIds.includes(student.id);
                                  return (
                                    <div
                                      key={student.id}
                                      onClick={() => toggleStudentSelection(student.id)}
                                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${isSelected ? 'bg-navy text-white shadow-2xs font-bold' : 'bg-white hover:bg-paper text-ink border border-hairline'}`}>
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <div
                                          className={`flex size-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${isSelected ? 'bg-white text-navy' : 'bg-paper-deep text-muted'}`}>
                                          {student.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{student.name}</span>
                                      </div>
                                      <div
                                        className={`flex size-4 shrink-0 items-center justify-center rounded-md border transition-all ${isSelected ? 'bg-white border-white text-navy' : 'border-slate-300 bg-paper text-transparent'}`}>
                                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {assignedStatus && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  <UserCheck className="size-4" />
                  <span>{assignedStatus}</span>
                </div>
              )}
              {assignError && (
                <div className="py-2 text-xs font-bold text-rose-600 text-center animate-in fade-in">
                  <span>{assignError}</span>
                </div>
              )}
            </div>
            <div className="border-t border-hairline bg-paper/30 p-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIds.length === 0}
                onClick={() => handleAssignSelectedBoards('task')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-navy hover:bg-navy-strong text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer">
                {assignPending && assignTargetType === 'task' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="size-3.5" />
                    <span>დავალებებში</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIds.length === 0}
                onClick={() => handleAssignSelectedBoards('material')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer">
                {assignPending && assignTargetType === 'material' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Layers className="size-3.5" />
                    <span>მასალებში</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAiModalOpen && <ClassroomAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />}

      {isClearConfirmOpen && (
        <div className="absolute inset-0 z-[160] flex items-center justify-center bg-ink/40 backdrop-blur-xs">
          <div className="w-80 rounded-2xl border border-hairline bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-ink">{copy.clearTitle}</h3>
            <p className="mb-5 text-xs text-muted">{copy.clearMessage}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 rounded-xl border border-hairline py-2 text-xs font-semibold text-body transition-colors hover:bg-paper">
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearBoard();
                  setIsClearConfirmOpen(false);
                }}
                className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-600">
                {copy.confirmClear}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
