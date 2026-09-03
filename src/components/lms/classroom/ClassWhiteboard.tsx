'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Room, RemoteParticipant } from 'livekit-client';
import { ConnectionState, RoomEvent } from 'livekit-client';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  UserCheck,
  X,
  MousePointer,
  Hand,
  Crosshair,
  Maximize2,
  Pencil,
  Eraser,
  Minus,
  MoveRight,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Type,
  ImageIcon,
  Trash2,
  Moon,
  Sun,
  ChevronDown,
  AlertTriangle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Layers,
  Check,
  BookOpen,
  Sparkles,
  PenTool,
} from 'lucide-react';
import type { CanvasElement, KonvaCanvasHandle } from './KonvaCanvas';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { TeacherAiChatPanel } from '@/components/lms/teacher/problem-bank/components/TeacherAiChatPanel';
import { loadAiModelStatusAction } from '@/lib/math/problems/actions';
import { DEFAULT_AI_MODEL, type AiModelId, type AiModelStatus, type ProblemBankCopy } from '@/lib/math/problems';

const KonvaCanvas = dynamic(() => import('./KonvaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-slate-900">
      <Loader2 className="size-8 animate-spin text-slate-300" />
    </div>
  ),
});

const DEFAULT_AI_COPY = {
  title: 'ამოცანების ბანკი',
  prompt: 'პირობა',
  solution: 'ამოხსნა',
  difficulties: { easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული' },
  topics: {
    algebra: 'ალგებრა',
    geometry: 'გეომეტრია',
    trigonometry: 'ტრიგონომეტრია',
    calculus: 'მათემატიკური ანალიზი',
    combinatorics: 'კომბინატორიკა',
    probability: 'ალბათობა',
    number_theory: 'რიცხვთა თეორია',
    logic: 'ლოგიკა',
    other: 'სხვა',
  },
  years: {
    grade7: 'VII კლასი',
    grade8: 'VIII კლასი',
    grade9: 'IX კლასი',
    grade10: 'X კლასი',
    grade11: 'XI კლასი',
    grade12: 'XII კლასი',
    ent: 'ეროვნული გამოცდები',
    other: 'სხვა',
  },
  chat: {
    title: 'AI ასისტენტი',
    open: 'AI ასისტენტის გახსნა',
    close: 'დახურვა',
    launcher: 'AI',
    model: 'მოდელი',
    models: {
      'gemini-flash-lite': 'Gemini 2.5 Flash Lite',
      'gemini-flash': 'Gemini 2.5 Flash',
      'gemini-pro': 'Gemini 2.5 Pro',
      'deepseek-chat': 'DeepSeek V3',
      'deepseek-reasoner': 'DeepSeek R1',
      'gpt-4o-mini': 'GPT-4o mini',
      'gpt-4o': 'GPT-4o',
      'claude-haiku': 'Claude 3.5 Haiku',
      'claude-sonnet': 'Claude 3.7 Sonnet',
    },
    limitLabel: 'ლიმიტი',
    limitNoKey: 'გასაღები არაა მითითებული',
    limitExhausted: 'ლიმიტი ამოიწურა',
    limitReady: 'მზადაა',
    limitUsed: 'გამოყენებულია: {used}/{limit}',
    replyLanguage: 'პასუხის ენა',
    languages: {
      ka: 'ქართული',
      en: 'English',
    },
    clear: 'გასუფთავება',
    emptyTitle: 'დასვით კითხვა, ჩასვით (Ctrl+V) სურათი ან მოითხოვეთ ამოცანა',
    you: 'თქვენ',
    assistant: 'ასისტენტი',
    cardsTitle: 'ამოცანის ბარათები',
    savingCard: 'ინახება...',
    saveToBank: 'ბანკში შენახვა',
    saveAllToBank: 'ყველას ბანკში შენახვა',
    saveToLab: 'ლაბორატორიაში შენახვა',
    saveAllToLab: 'ყველას ლაბორატორიაში შენახვა',
    savedToBank: 'შენახულია ბანკში',
    savedToLab: 'შენახულია ლაბორატორიაში',
    saveFailed: 'შენახვა ვერ მოხერხდა',
    addImage: 'სურათის დამატება',
    imageHint: 'შეგიძლიათ ატვირთოთ ან ჩასვათ (Ctrl+V) ამოცანის სურათი',
    removeImage: 'სურათის წაშლა',
    inputLabel: 'ტექსტი',
    inputPlaceholder: 'ჩაწერეთ შეკითხვა, მათემატიკური ამოცანა ან ჩასვით სურათი...',
    previewLabel: 'KaTeX წინასწარი ნახვა',
    sending: 'იგზავნება...',
    send: 'გაგზავნა',
    thinking: 'AI ფიქრობს...',
    emptyReply: 'პასუხი ცარიელია',
    errorMissingKey: 'API გასაღები არ არის მითითებული',
    errorInvalidKey: 'API გასაღები არასწორია',
    errorLimit: 'მოთხოვნების ლიმიტი ამოიწურა',
    errorBilling: 'ბილინგის შეცდომა',
    errorTimeout: 'მოთხოვნის დრო ამოიწურა',
    errorUnauthorized: 'ავტორიზაციის შეცდომა',
    errorBadOutput: 'არასწორი პასუხი',
    errorImageUnsupported: 'ეს მოდელი არ უჭერს მხარს სურათებს',
    errorFailed: 'მოთხოვნა ვერ შესრულდა',
    slashPrompts: {
      title: 'სწრაფი პრომპტები',
      manage: 'პრომპტების მართვა',
      add: 'დამატება',
      edit: 'რედაქტირება',
      delete: 'წაშლა',
      name: 'სახელი',
      prompt: 'პრომპტი',
      save: 'შენახვა',
      cancel: 'გაუქმება',
      fillTitle: 'პარამეტრების შევსება',
      fillConfirm: 'ჩასმა',
      noPrompts: 'პრომპტები არ არის',
    },
  },
} as unknown as ProblemBankCopy;

interface ClassWhiteboardProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher?: boolean;
}

const STORAGE_PREFS_KEY = 'konva_whiteboard_prefs';
const CHUNK_PAYLOAD_BYTES = 16 * 1024;
const CHUNK_HEADER_BYTES = 13;
const MAGIC_CHUNK_START = 0x01;
const MAGIC_CHUNK_CONT = 0x02;
const MAGIC_CHUNK_END = 0x03;

const DEFAULT_COLOR = '#1e293b';
const DARK_COLORS = [DEFAULT_COLOR, '#000000'];
const LIGHT_COLOR = '#ffffff';
const WHITEBOARD_COLORS = ['#1e293b', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'] as const;

type StylusAction = 'temporary-eraser' | 'toggle-eraser' | 'cycle-colors' | 'toggle-laser' | 'undo' | 'none';

const STYLUS_ACTION_OPTIONS: Array<{ value: StylusAction; label: string }> = [
  { value: 'temporary-eraser', label: 'დროებითი მოსაშლელი' },
  { value: 'toggle-eraser', label: 'მოსაშლელის გადართვა' },
  { value: 'cycle-colors', label: 'ფერის ციკლი' },
  { value: 'toggle-laser', label: 'ლაზერის გადართვა' },
  { value: 'undo', label: 'უკან დაბრუნება' },
  { value: 'none', label: 'არცერთი' },
];

const DEFAULT_STYLUS_ACTIONS = {
  stylusPrimaryAction: 'temporary-eraser' as StylusAction,
  stylusSecondaryAction: 'toggle-eraser' as StylusAction,
};

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function chunkPayload(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length <= CHUNK_PAYLOAD_BYTES) return [bytes];

  const transferId = Math.floor(Math.random() * 0x7fffffff) >>> 0;
  const totalChunks = Math.ceil(bytes.length / CHUNK_PAYLOAD_BYTES);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_PAYLOAD_BYTES;
    const end = Math.min(start + CHUNK_PAYLOAD_BYTES, bytes.length);
    const magic = i === 0 ? MAGIC_CHUNK_START : i === totalChunks - 1 ? MAGIC_CHUNK_END : MAGIC_CHUNK_CONT;

    const header = new Uint8Array(CHUNK_HEADER_BYTES);
    const view = new DataView(header.buffer);
    header[0] = magic;
    view.setUint32(1, transferId, false);
    view.setUint32(5, i, false);
    view.setUint32(9, totalChunks, false);

    chunks.push(concatBytes(header, bytes.subarray(start, end)));
  }

  return chunks;
}

class ChunkAssembler {
  private pending = new Map<
    number,
    { totalChunks: number; chunks: (Uint8Array | null)[]; received: number; createdAt: number }
  >();

  push(bytes: Uint8Array): Uint8Array | null {
    if (bytes.length < CHUNK_HEADER_BYTES) return bytes;
    const magic = bytes[0];
    if (magic !== MAGIC_CHUNK_START && magic !== MAGIC_CHUNK_CONT && magic !== MAGIC_CHUNK_END) {
      return bytes;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const transferId = view.getUint32(1, false);
    const chunkIndex = view.getUint32(5, false);
    const totalChunks = view.getUint32(9, false);
    const data = bytes.subarray(CHUNK_HEADER_BYTES);

    if (magic === MAGIC_CHUNK_START) {
      const entry = {
        totalChunks,
        chunks: new Array<Uint8Array | null>(totalChunks).fill(null),
        received: 0,
        createdAt: Date.now(),
      };
      if (chunkIndex < totalChunks) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
      this.pending.set(transferId, entry);
    } else {
      const entry = this.pending.get(transferId);
      if (!entry) return null;
      if (chunkIndex < entry.totalChunks && !entry.chunks[chunkIndex]) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
    }

    const entry = this.pending.get(transferId);
    if (!entry || entry.received < entry.totalChunks) {
      this.cleanup();
      return null;
    }

    this.pending.delete(transferId);

    let totalLength = 0;
    for (const chunk of entry.chunks) {
      if (chunk) totalLength += chunk.length;
    }

    const out = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of entry.chunks) {
      if (chunk) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
    }
    return out;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.pending) {
      if (now - entry.createdAt > 10_000) this.pending.delete(id);
    }
  }
}

function BoardThumbnail({
  elements,
  isActive,
  isSelected,
  pageIndex,
  isDark,
  onClick,
  onLongPress,
  onDelete,
  canDelete,
}: {
  elements: CanvasElement[];
  isActive: boolean;
  isSelected?: boolean;
  pageIndex: number;
  isDark: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);

  const startPress = () => {
    isLongPressedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      onLongPress?.();
    }, 700);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    onClick();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    if (elements.length === 0) return;

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

    elements.forEach((el) => {
      let stroke = el.stroke || '#6366f1';
      if (isDark && DARK_COLORS.includes(stroke)) stroke = LIGHT_COLOR;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        }
        if (el.type === 'triangle' || el.type === 'diamond') {
          ctx.closePath();
        }
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
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl cursor-pointer transition-all shrink-0 select-none [-webkit-touch-callout:none] ${
        isSelected
          ? 'bg-indigo-600/20 ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-md'
          : isActive
            ? 'bg-indigo-600/10 dark:bg-indigo-500/20 ring-2 ring-indigo-600 dark:ring-indigo-400'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800'
      }`}>
      <div className="relative w-28 h-18 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 pointer-events-none">
        <canvas ref={canvasRef} width={112} height={72} className="w-full h-full object-contain" />

        {isSelected && (
          <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs z-10 animate-in zoom-in-75 duration-150">
            <Check className="size-3 stroke-[3]" />
          </div>
        )}

        {canDelete && (
          <button
            type="button"
            title="გვერდის წაშლა"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="pointer-events-auto absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-rose-600 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-xs z-10">
            <X className="size-3" />
          </button>
        )}
      </div>

      <span
        className={`text-[11px] font-bold ${
          isActive || isSelected
            ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
            : 'text-slate-600 dark:text-slate-400'
        }`}>
        დაფა {pageIndex + 1}
      </span>
    </div>
  );
}

function AssignBoardThumbnail({
  elements,
  isSelected,
  pageIndex,
  isDark,
  onToggle,
}: {
  elements: CanvasElement[];
  isSelected: boolean;
  pageIndex: number;
  isDark: boolean;
  onToggle: () => void;
}) {
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

    if (elements.length === 0) return;

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

    elements.forEach((el) => {
      let stroke = el.stroke || '#6366f1';
      if (isDark && DARK_COLORS.includes(stroke)) stroke = LIGHT_COLOR;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        }
        if (el.type === 'triangle' || el.type === 'diamond') {
          ctx.closePath();
        }
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
      className={`group relative flex flex-col items-center gap-1 p-1 rounded-2xl cursor-pointer transition-all shrink-0 select-none ${
        isSelected
          ? 'bg-indigo-600/10 dark:bg-indigo-500/20 ring-2 ring-indigo-600 dark:ring-indigo-400'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800'
      }`}>
      <div className="relative w-24 h-15 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
        <canvas ref={canvasRef} width={96} height={60} className="w-full h-full object-contain" />

        <div
          className={`absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border transition-all ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white/80 border-slate-300 text-transparent group-hover:border-slate-400'
          }`}>
          <Check className="size-2.5 stroke-[3]" />
        </div>
      </div>

      <span
        className={`text-[10px] font-bold ${
          isSelected ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
        }`}>
        გვერდი {pageIndex + 1}
      </span>
    </div>
  );
}

function renderElementsToDataUrl(elements: CanvasElement[], isDark: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = isDark ? '#020617' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (elements.length === 0) {
    return canvas.toDataURL('image/png');
  }

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
    let stroke = el.stroke || '#6366f1';
    if (isDark && DARK_COLORS.includes(stroke)) stroke = LIGHT_COLOR;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.points && el.points.length >= 2) {
      ctx.beginPath();
      const ox = el.x || 0;
      const oy = el.y || 0;
      ctx.moveTo(ox + el.points[0], oy + el.points[1]);
      for (let i = 2; i < el.points.length; i += 2) {
        ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
      }
      if (el.type === 'triangle' || el.type === 'diamond') {
        ctx.closePath();
      }
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

export function ClassWhiteboard({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  isTeacher = false,
}: ClassWhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<KonvaCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const pagesTrayRef = useRef<HTMLDivElement>(null);
  const lastLaserSentRef = useRef<number>(0);
  const storageKeyPages = `konva_whiteboard_pages_${courseId}`;
  const chunkAssemblerRef = useRef<ChunkAssembler>(new ChunkAssembler());

  // --- Initialise pages: load from localStorage ONLY if isTeacher ---
  const [pages, setPages] = useState<CanvasElement[][]>(() => {
    if (isTeacher && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKeyPages);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Failed to load pages:', e);
      }
    }
    return [[]];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isPagesTrayOpen, setIsPagesTrayOpen] = useState<boolean>(false);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModel, setAiModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [aiModelStatus, setAiModelStatus] = useState<AiModelStatus[] | null>(null);
  const [aiInitialImages, setAiInitialImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isTeacher) return;
    let cancelled = false;
    void loadAiModelStatusAction().then((status) => {
      if (!cancelled) setAiModelStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [isTeacher]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(4, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.2, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleZoomReset = () => {
    setZoomScale(1);
  };

  const historyMapRef = useRef<Map<number, { states: CanvasElement[][]; index: number }>>(
    new Map([[0, { states: [pages[0] || []], index: 0 }]]),
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [activeTool, setActiveTool] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return prefs.tool || 'pen';
      } catch {}
    }
    return 'pen';
  });

  const previousToolRef = useRef<any>(activeTool);
  const isTemporaryEraserRef = useRef(false);

  const handleTemporaryEraserStart = useCallback(() => {
    if (activeTool !== 'eraser' && !isTemporaryEraserRef.current) {
      previousToolRef.current = activeTool;
      isTemporaryEraserRef.current = true;
      setActiveTool('eraser');
    }
  }, [activeTool]);

  const handleTemporaryEraserEnd = useCallback(() => {
    if (isTemporaryEraserRef.current) {
      setActiveTool(previousToolRef.current);
      isTemporaryEraserRef.current = false;
    }
  }, []);

  const [strokeColor, setStrokeColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return prefs.color || DEFAULT_COLOR;
      } catch {}
    }
    return DEFAULT_COLOR;
  });

  const [strokeWidth, setStrokeWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return prefs.width || 2;
      } catch {}
    }
    return 2;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return !!prefs.isDark;
      } catch {}
    }
    return false;
  });

  // Stylus‑only mode (default false)
  const [stylusOnly, setStylusOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return !!prefs.stylusOnly;
      } catch {}
    }
    return false;
  });

  const [stylusPrimaryAction, setStylusPrimaryAction] = useState<StylusAction>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return (prefs.stylusPrimaryAction as StylusAction) || DEFAULT_STYLUS_ACTIONS.stylusPrimaryAction;
      } catch {}
    }
    return DEFAULT_STYLUS_ACTIONS.stylusPrimaryAction;
  });

  const [stylusSecondaryAction, setStylusSecondaryAction] = useState<StylusAction>(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
        return (prefs.stylusSecondaryAction as StylusAction) || DEFAULT_STYLUS_ACTIONS.stylusSecondaryAction;
      } catch {}
    }
    return DEFAULT_STYLUS_ACTIONS.stylusSecondaryAction;
  });

  const handleStylusButtonAction = useCallback(
    (buttonIndex: 1 | 2, state: 'down' | 'up') => {
      const action = buttonIndex === 1 ? stylusPrimaryAction : stylusSecondaryAction;
      if (action === 'none') return;

      if (action === 'temporary-eraser') {
        if (state === 'down') handleTemporaryEraserStart();
        else handleTemporaryEraserEnd();
        return;
      }

      if (action === 'toggle-eraser') {
        if (state !== 'down') return;
        setActiveTool((current: string) => {
          if (current === 'eraser') {
            return previousToolRef.current || 'pen';
          }
          previousToolRef.current = current;
          return 'eraser';
        });
        return;
      }

      if (action === 'cycle-colors') {
        if (state !== 'down') return;
        const currentIndex = WHITEBOARD_COLORS.indexOf(strokeColor as (typeof WHITEBOARD_COLORS)[number]);
        const nextColor = WHITEBOARD_COLORS[(currentIndex + 1) % WHITEBOARD_COLORS.length] || DEFAULT_COLOR;
        setStrokeColor(nextColor);
        return;
      }

      if (action === 'toggle-laser') {
        if (state !== 'down') return;
        setActiveTool((current: string) => {
          if (current === 'laser') {
            return previousToolRef.current || 'pen';
          }
          previousToolRef.current = current;
          return 'laser';
        });
        return;
      }

      if (action === 'undo') {
        if (state === 'down' && canUndo) {
          handleUndo();
        }
      }
    },
    [
      canUndo,
      handleTemporaryEraserEnd,
      handleTemporaryEraserStart,
      strokeColor,
      stylusPrimaryAction,
      stylusSecondaryAction,
    ],
  );

  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [students, setStudents] = useState<RemoteParticipant[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignPending, setAssignPending] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'task' | 'material' | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [selectedPagesForAssign, setSelectedPagesForAssign] = useState<number[]>([0]);
  const [selectedStudentIdentities, setSelectedStudentIdentities] = useState<string[]>([]);

  const pagesRef = useRef<CanvasElement[][]>(pages);
  const currentPageIndexRef = useRef<number>(0);
  const isRemoteUpdateRef = useRef(false);

  const updateUndoRedoState = useCallback(() => {
    const pageHist = historyMapRef.current.get(currentPageIndexRef.current);
    if (pageHist) {
      setCanUndo(pageHist.index > 0);
      setCanRedo(pageHist.index < pageHist.states.length - 1);
    } else {
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  // ---- Theme conversion effect ----
  useEffect(() => {
    let updated = false;
    const newPages = pagesRef.current.map((page) =>
      page.map((el) => {
        if (isDark) {
          if (DARK_COLORS.includes(el.stroke)) {
            updated = true;
            return { ...el, stroke: LIGHT_COLOR };
          }
        } else {
          if (el.stroke === LIGHT_COLOR) {
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

      const pIndex = currentPageIndexRef.current;
      let hist = historyMapRef.current.get(pIndex);
      if (hist) {
        const nextStates = hist.states.slice(0, hist.index + 1);
        nextStates.push(newPages[pIndex]);
        historyMapRef.current.set(pIndex, { states: nextStates, index: nextStates.length - 1 });
        updateUndoRedoState();
      }

      if (isTeacher && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKeyPages, JSON.stringify(newPages));
        } catch (e) {}
      }
    }
  }, [isDark, storageKeyPages, updateUndoRedoState, isTeacher]);

  // Save stylus prefs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
      prefs.stylusOnly = stylusOnly;
      prefs.stylusPrimaryAction = stylusPrimaryAction;
      prefs.stylusSecondaryAction = stylusSecondaryAction;
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
    }
  }, [stylusOnly, stylusPrimaryAction, stylusSecondaryAction]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (el.scrollTop !== 0) el.scrollTop = 0;
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };

    window.addEventListener('scroll', preventScroll, { passive: true });
    el.addEventListener('scroll', preventScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', preventScroll);
      el.removeEventListener('scroll', preventScroll);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (penMenuRef.current && !penMenuRef.current.contains(e.target as Node)) {
        setIsPenMenuOpen(false);
      }
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target as Node)) {
        setIsShapesMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorMenuOpen(false);
      }
      if (pagesTrayRef.current && !pagesTrayRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-tray-trigger]')) {
          setIsPagesTrayOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save pages to localStorage only if teacher
  useEffect(() => {
    pagesRef.current = pages;
    currentPageIndexRef.current = currentPageIndex;
    updateUndoRedoState();
    if (isTeacher && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKeyPages, JSON.stringify(pages));
      } catch (err) {
        console.warn('Quota warning:', err);
      }
    }
  }, [pages, currentPageIndex, isTeacher, storageKeyPages, updateUndoRedoState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({
          tool: activeTool,
          color: strokeColor,
          width: strokeWidth,
          isDark,
          stylusOnly,
          stylusPrimaryAction,
          stylusSecondaryAction,
        }),
      );
    }
  }, [activeTool, strokeColor, strokeWidth, isDark, stylusOnly, stylusPrimaryAction, stylusSecondaryAction]);

  const updateParticipantList = useCallback(() => {
    if (!room) return;
    setStudents(Array.from(room.remoteParticipants.values()));
  }, [room]);

  useEffect(() => {
    if (!room) return;
    updateParticipantList();
    room.on(RoomEvent.ParticipantConnected, updateParticipantList);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipantList);
    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipantList);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipantList);
    };
  }, [room, updateParticipantList]);

  const publishDataSafe = useCallback(
    async (payload: any, reliable = true) => {
      const participant = room?.localParticipant;
      if (!participant || !room || room.state !== ConnectionState.Connected) return;

      try {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        const chunks = chunkPayload(bytes);

        for (let i = 0; i < chunks.length; i++) {
          await participant.publishData(chunks[i] as any, { reliable });
          if (chunks.length > 1 && i < chunks.length - 1) {
            await new Promise((res) => setTimeout(res, 5));
          }
        }
      } catch (err) {
        console.warn('Data channel publish skipped (reconnecting):', err);
      }
    },
    [room],
  );

  const handleLaserMove = useCallback(
    (pos: { x: number; y: number } | null) => {
      const now = Date.now();
      if (!pos || now - lastLaserSentRef.current > 35) {
        lastLaserSentRef.current = now;
        void publishDataSafe({ type: 'WHITEBOARD_LASER', point: pos, pageIndex: currentPageIndexRef.current }, false);
      }
    },
    [publishDataSafe],
  );

  const handleElementsChange = useCallback(
    (newElems: CanvasElement[]) => {
      if (isRemoteUpdateRef.current) return;
      const pIndex = currentPageIndexRef.current;
      const updated = [...pagesRef.current];
      updated[pIndex] = newElems;
      setPages(updated);
      pagesRef.current = updated;

      let pageHist = historyMapRef.current.get(pIndex);
      if (!pageHist) {
        pageHist = { states: [[]], index: 0 };
      }
      const nextStates = pageHist.states.slice(0, pageHist.index + 1);
      nextStates.push(newElems);
      historyMapRef.current.set(pIndex, {
        states: nextStates,
        index: nextStates.length - 1,
      });

      updateUndoRedoState();

      void publishDataSafe({
        type: 'WHITEBOARD_SYNC',
        pageIndex: pIndex,
        elements: newElems,
      });
    },
    [publishDataSafe, updateUndoRedoState],
  );

  const addImageToCanvas = useCallback(
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

        const newImageElem: CanvasElement = {
          id: `el_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
        handleElementsChange([...currentElems, newImageElem]);
        setActiveTool('select');
      };
    },
    [handleElementsChange],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) addImageToCanvas(base64);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageToCanvas]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) addImageToCanvas(base64);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) addImageToCanvas(base64);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleUndo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const pageHist = historyMapRef.current.get(pIndex);
    if (!pageHist || pageHist.index <= 0) return;

    pageHist.index -= 1;
    const targetElements = pageHist.states[pageHist.index];

    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;

    updateUndoRedoState();

    void publishDataSafe({
      type: 'WHITEBOARD_SYNC',
      pageIndex: pIndex,
      elements: targetElements,
    });
  }, [publishDataSafe, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const pageHist = historyMapRef.current.get(pIndex);
    if (!pageHist || pageHist.index >= pageHist.states.length - 1) return;

    pageHist.index += 1;
    const targetElements = pageHist.states[pageHist.index];

    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;

    updateUndoRedoState();

    void publishDataSafe({
      type: 'WHITEBOARD_SYNC',
      pageIndex: pIndex,
      elements: targetElements,
    });
  }, [publishDataSafe, updateUndoRedoState]);

  useEffect(() => {
    const onUndoEvent = () => handleUndo();
    const onRedoEvent = () => handleRedo();

    window.addEventListener('whiteboard-undo', onUndoEvent);
    window.addEventListener('whiteboard-redo', onRedoEvent);

    return () => {
      window.removeEventListener('whiteboard-undo', onUndoEvent);
      window.removeEventListener('whiteboard-redo', onRedoEvent);
    };
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleClearPage = () => {
    handleElementsChange([]);
    setIsClearConfirmOpen(false);
  };

  const handleAddNewPage = () => {
    const updated = [...pagesRef.current, []];
    const newIdx = updated.length - 1;
    setPages(updated);
    setCurrentPageIndex(newIdx);
    historyMapRef.current.set(newIdx, { states: [[]], index: 0 });
    void publishDataSafe({ type: 'WHITEBOARD_PAGE_COUNT', count: updated.length });
  };

  const handleDeletePage = (pageIdx: number) => {
    if (pages.length <= 1) {
      handleClearPage();
      return;
    }
    const updated = pages.filter((_, idx) => idx !== pageIdx);
    setPages(updated);
    const nextIdx = Math.min(currentPageIndex, updated.length - 1);
    setCurrentPageIndex(nextIdx);
    setSelectedPages((prev) => prev.filter((p) => p !== pageIdx).map((p) => (p > pageIdx ? p - 1 : p)));
    void publishDataSafe({ type: 'WHITEBOARD_PAGE_COUNT', count: updated.length });
  };

  const handleSwitchPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    if (!historyMapRef.current.has(idx)) {
      historyMapRef.current.set(idx, { states: [pages[idx] || []], index: 0 });
    }
    updateUndoRedoState();
  };

  const togglePageSelect = (idx: number) => {
    setSelectedPages((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  };

  const selectAllPages = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map((_, i) => i));
    }
  };

  const handleAssignSelectedBoards = async (mode: 'task' | 'material') => {
    if (selectedPagesForAssign.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 დაფა');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    if (selectedStudentIdentities.length === 0) {
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
        if (!uploaded?.success || !uploaded.url) {
          throw new Error('დაფის სურათის ატვირთვა ვერ მოხერხდა');
        }
        resolvedBoardImages.push({
          pageIdx: boardImages[index].pageIdx,
          url: uploaded.url,
        });
      }

      const sendPromises = [];
      for (const studentIdentity of selectedStudentIdentities) {
        for (const board of resolvedBoardImages) {
          const isMat = mode === 'material';
          const title = isMat
            ? `${courseTitle || 'სასწავლო მასალა'} (დაფა ${board.pageIdx + 1})`
            : `${courseTitle || 'დაფის ამოცანა'} — გვერდი ${board.pageIdx + 1}`;

          sendPromises.push(
            sendProblemToStudentAction({
              studentId: studentIdentity,
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
      const hasFailure = results.some((r) => !r.success);

      if (hasFailure) {
        throw new Error('ზოგიერთი ჩანაწერის გაგზავნა ვერ მოხერხდა');
      }

      setAssignedStatus(
        mode === 'material'
          ? `მასალები წარმატებით გაეგზავნა ${selectedStudentIdentities.length} მოსწავლეს!`
          : `დავალებები წარმატებით გაეგზავნა ${selectedStudentIdentities.length} მოსწავლეს!`,
      );
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to assign boards to students:', err);
      setAssignError(err.message || 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setAssignPending(false);
      setAssignTargetType(null);
    }
  };

  const handleAskAIAboutBoard = () => {
    const targetPages = selectedPages.length > 0 ? selectedPages : [currentPageIndex];
    const imagesToPass: string[] = [];

    for (const pageIdx of targetPages) {
      if (pageIdx === currentPageIndexRef.current && canvasRef.current) {
        const live = canvasRef.current.toDataURL();
        if (live) {
          imagesToPass.push(live);
          continue;
        }
      }
      const elems = pagesRef.current[pageIdx] || [];
      const rendered = renderElementsToDataUrl(elems, isDark);
      if (rendered) {
        imagesToPass.push(rendered);
      }
    }

    setAiInitialImages(imagesToPass);
    setIsAiModalOpen(true);
  };

  const togglePageSelectionForAssign = (idx: number) => {
    setSelectedPagesForAssign((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  };

  const toggleStudentSelection = (identity: string) => {
    setSelectedStudentIdentities((prev) =>
      prev.includes(identity) ? prev.filter((id) => id !== identity) : [...prev, identity],
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIdentities.length === students.length) {
      setSelectedStudentIdentities([]);
    } else {
      setSelectedStudentIdentities(students.map((s) => s.identity));
    }
  };

  // --- Data handling: process incoming messages ---
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const fullPayload = chunkAssemblerRef.current.push(payload);
        if (!fullPayload) return;

        const data = JSON.parse(new TextDecoder().decode(fullPayload));

        // --- Handle FULL SYNC (teacher sends all pages) ---
        if (data.type === 'WHITEBOARD_FULL_SYNC') {
          if (Array.isArray(data.pages)) {
            // Student receives full board
            const newPages = data.pages;
            const newPageIndex = data.currentPageIndex ?? 0;
            // Reset history for the student
            historyMapRef.current = new Map();
            newPages.forEach((p: CanvasElement[], idx: number) => {
              historyMapRef.current.set(idx, { states: [p || []], index: 0 });
            });
            setPages(newPages);
            pagesRef.current = newPages;
            setCurrentPageIndex(newPageIndex);
            updateUndoRedoState();
            return; // important: exit after handling full sync
          }
          return;
        }

        // --- Handle incremental sync ---
        if (data.type === 'WHITEBOARD_SYNC' && Array.isArray(data.elements)) {
          isRemoteUpdateRef.current = true;
          const updated = [...pagesRef.current];
          updated[data.pageIndex] = data.elements;
          setPages(updated);
          pagesRef.current = updated;

          const pHist = historyMapRef.current.get(data.pageIndex) || { states: [], index: -1 };
          pHist.states.push(data.elements);
          pHist.index = pHist.states.length - 1;
          historyMapRef.current.set(data.pageIndex, pHist);
          updateUndoRedoState();

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 30);
        } else if (data.type === 'WHITEBOARD_PAGE_COUNT') {
          const newPages = [...pagesRef.current];
          while (newPages.length < data.count) newPages.push([]);
          setPages(newPages);
        } else if (data.type === 'WHITEBOARD_LASER') {
          if (data.pageIndex === undefined || data.pageIndex === currentPageIndexRef.current) {
            canvasRef.current?.renderRemoteLaser(data.point);
          }
        }
      } catch (err) {
        console.error('Packet reassembly error:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, updateUndoRedoState]);

  // --- Teacher: send full sync when a new participant joins ---
  useEffect(() => {
    if (!isTeacher || !room) return;

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      // Send the whole board to the newly connected participant
      void publishDataSafe(
        {
          type: 'WHITEBOARD_FULL_SYNC',
          pages: pagesRef.current,
          currentPageIndex: currentPageIndexRef.current,
        },
        true,
      );
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [isTeacher, room, publishDataSafe]);

  // --- The rest of the component (toolbar, rendering) remains unchanged ---
  const shapeTools = [
    { id: 'line', icon: Minus, title: 'ხაზი' },
    { id: 'arrow', icon: MoveRight, title: 'ისარი' },
    { id: 'rect', icon: Square, title: 'მართკუთხედი' },
    { id: 'circle', icon: Circle, title: 'წრე' },
    { id: 'triangle', icon: Triangle, title: 'სამკუთხედი' },
    { id: 'diamond', icon: Diamond, title: 'რომბი' },
    { id: 'star', icon: Star, title: 'ვარსკვლავი' },
  ];

  const currentShapeObj = shapeTools.find((s) => s.id === activeTool) || shapeTools[2];
  const CurrentShapeIcon = currentShapeObj.icon;
  const isShapeActive = shapeTools.some((s) => s.id === activeTool);

  const zoomPercent = Math.round(zoomScale * 100);

  const colorsList = WHITEBOARD_COLORS;

  const effectiveStroke = (() => {
    if (isDark && DARK_COLORS.includes(strokeColor)) return LIGHT_COLOR;
    return strokeColor;
  })();

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative flex flex-col min-h-0 overflow-hidden overscroll-none touch-none select-none ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      } ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-[100dvh] w-screen'
          : 'h-full w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'
      }`}>
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" className="hidden" />

      {isClearConfirmOpen && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-80 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 mb-3">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">დაფის გასუფთავება</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              ნამდვილად გსურთ ამ გვერდის სრულად წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                გაუქმება
              </button>
              <button
                type="button"
                onClick={handleClearPage}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2 text-xs font-semibold text-white shadow-xs transition-colors">
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeacher && isAssignModalOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-[340px] sm:w-[420px] rounded-3xl bg-white dark:bg-slate-900 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Send className="size-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">დაფის გაგზავნა</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssignError(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="size-4" />
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                აირჩიეთ დაფები ({selectedPagesForAssign.length}):
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
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                {selectedPagesForAssign.length === pages.length ? 'მხოლოდ მიმდინარე' : 'ყველა დაფა'}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 custom-scrollbar">
              {pages.map((pageElems, idx) => (
                <AssignBoardThumbnail
                  key={idx}
                  pageIndex={idx}
                  elements={pageElems}
                  isSelected={selectedPagesForAssign.includes(idx)}
                  isDark={isDark}
                  onToggle={() => togglePageSelectionForAssign(idx)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 mb-3.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                აირჩიეთ მოსწავლეები ({selectedStudentIdentities.length}):
              </span>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  {selectedStudentIdentities.length === students.length ? 'მონიშვნის მოხსნა' : 'ყველა მოსწავლე'}
                </button>
              )}
            </div>

            {assignedStatus ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <UserCheck className="size-4" />
                <span>{assignedStatus}</span>
              </div>
            ) : assignError ? (
              <div className="flex flex-col items-center justify-center gap-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 text-center animate-in fade-in">
                <span>{assignError}</span>
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-3">ქოლში სხვა მოსწავლეები არ არიან</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                {students.map((student) => {
                  const isChecked = selectedStudentIdentities.includes(student.identity);
                  return (
                    <button
                      key={student.identity}
                      type="button"
                      onClick={() => toggleStudentSelection(student.identity)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                        isChecked
                          ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-xs'
                          : 'border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                      <span className="font-semibold truncate max-w-[240px]">{student.name || student.identity}</span>
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-md transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}>
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIdentities.length === 0}
              onClick={() => handleAssignSelectedBoards('task')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
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
              disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIdentities.length === 0}
              onClick={() => handleAssignSelectedBoards('material')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              {assignPending && assignTargetType === 'material' ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>იგზავნება...</span>
                </>
              ) : (
                <>
                  <Layers className="size-3.5 text-indigo-400" />
                  <span>მასალებში</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toolbars – they still use global dark classes */}
      <div className="absolute top-2 sm:top-3 inset-x-0 z-[100] flex justify-center px-1 sm:px-2 pointer-events-none">
        <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 overflow-visible">
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 overflow-visible">
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1 dark:border-slate-800">
              <button
                type="button"
                title="უკან დაბრუნება (Ctrl+Z)"
                disabled={!canUndo}
                onClick={handleUndo}
                className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
                  canUndo
                    ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95'
                    : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}>
                <Undo2 className="size-3.5 sm:size-4" />
              </button>

              <button
                type="button"
                title="წინ გადასვლა (Ctrl+Y)"
                disabled={!canRedo}
                onClick={handleRedo}
                className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
                  canRedo
                    ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95'
                    : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}>
                <Redo2 className="size-3.5 sm:size-4" />
              </button>
            </div>

            <button
              type="button"
              title="მონიშვნა / ზომის შეცვლა"
              onClick={() => {
                setActiveTool('select');
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === 'select'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <MousePointer className="size-3.5 sm:size-4" />
            </button>

            <button
              type="button"
              title="დაფის გადაადგილება (Pan)"
              onClick={() => {
                setActiveTool('hand');
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === 'hand'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <Hand className="size-3.5 sm:size-4" />
            </button>

            <button
              type="button"
              title="ლაზერული მაჩვენებელი (Laser Pointer)"
              onClick={() => {
                setActiveTool('laser');
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === 'laser'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <Crosshair className="size-3.5 sm:size-4" />
            </button>

            {/* Pen menu */}
            <div ref={penMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
                  activeTool === 'pen'
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20'
                    : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                <button
                  type="button"
                  title="კალამი"
                  onClick={() => {
                    setActiveTool('pen');
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className="flex items-center gap-1 h-full px-2 rounded-l-xl focus:outline-none">
                  <Pencil className="size-3.5 sm:size-4" />
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium opacity-90">{strokeWidth}px</span>
                </button>

                <button
                  type="button"
                  title="სისქის მენიუ"
                  onClick={() => {
                    setIsPenMenuOpen((prev) => !prev);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
                    activeTool === 'pen'
                      ? 'border-indigo-500/40 hover:bg-indigo-700'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  <ChevronDown
                    className={`size-2.5 sm:size-3 transition-transform duration-200 ${isPenMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {isPenMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-52 sm:w-56 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">კალმის სისქე</span>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {strokeWidth}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {[1, 2, 4, 8, 14].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setStrokeWidth(size);
                        }}
                        className={`size-6 sm:size-7 flex items-center justify-center rounded-xl transition-colors ${
                          strokeWidth === size
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 ring-1 ring-indigo-500'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}>
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

            {/* Shapes menu */}
            <div ref={shapesMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
                  isShapeActive
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20'
                    : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                <button
                  type="button"
                  title="ფიგურა"
                  onClick={() => {
                    setActiveTool(currentShapeObj.id);
                    setIsShapesMenuOpen(false);
                    setIsPenMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className="flex items-center justify-center size-7 sm:size-8 rounded-l-xl focus:outline-none">
                  <CurrentShapeIcon className="size-3.5 sm:size-4" />
                </button>

                <button
                  type="button"
                  title="ფიგურების მენიუ"
                  onClick={() => {
                    setIsShapesMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
                    isShapeActive
                      ? 'border-indigo-500/40 hover:bg-indigo-700'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  <ChevronDown
                    className={`size-2.5 sm:size-3 transition-transform duration-200 ${isShapesMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {isShapesMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-36 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-2 gap-1">
                    {shapeTools.map((s) => {
                      const SIcon = s.icon;
                      const isSelected = activeTool === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setActiveTool(s.id);
                            setIsShapesMenuOpen(false);
                          }}
                          className={`flex items-center justify-center size-9 sm:size-10 rounded-xl transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}>
                          <SIcon className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              title="ტექსტი"
              onClick={() => {
                setActiveTool('text');
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === 'text'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <Type className="size-3.5 sm:size-4" />
            </button>

            <button
              type="button"
              title="სურათის ატვირთვა"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <ImageIcon className="size-3.5 sm:size-4" />
            </button>

            <button
              type="button"
              title="საშლელი"
              onClick={() => {
                setActiveTool('eraser');
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
                setIsColorMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === 'eraser'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <Eraser className="size-3.5 sm:size-4" />
            </button>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={() => canvasRef.current?.fitToContent()}
              title="ნახაზების ეკრანზე მორგება (Fit)"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <Maximize2 className="size-3.5 sm:size-4" />
            </button>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:border-slate-800 mx-0.5" />

            {/* Color menu */}
            <div ref={colorMenuRef} className="relative flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setIsColorMenuOpen((prev) => !prev);
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                }}
                title="ფერის არჩევა"
                className="flex items-center gap-1 h-7 sm:h-8 px-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60">
                <div
                  className="size-4 sm:size-4.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs"
                  style={{ backgroundColor: effectiveStroke }}
                />
                <ChevronDown
                  className={`size-2.5 sm:size-3 text-slate-500 transition-transform duration-200 ${isColorMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isColorMenuOpen && (
                <div className="absolute top-full mt-2 right-0 z-[120] w-max rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2">
                    {colorsList.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setStrokeColor(c);
                        }}
                        className={`size-6 rounded-full transition-transform ${
                          strokeColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:border-slate-800 mx-0.5" />

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/70">
              <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <span>სტილუსი</span>
              </label>

              <select
                aria-label="სტილუსის ძირითადი ღილაკი"
                value={stylusPrimaryAction}
                onChange={(e) => setStylusPrimaryAction(e.target.value as StylusAction)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {STYLUS_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="სტილუსის მეორე ღილაკი"
                value={stylusSecondaryAction}
                onChange={(e) => setStylusSecondaryAction(e.target.value as StylusAction)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {STYLUS_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stylus‑only toggle */}
            <button
              type="button"
              onClick={() => setStylusOnly((prev) => !prev)}
              title={stylusOnly ? 'მხოლოდ სტილუსი (ჩართული)' : 'მხოლოდ სტილუსი (გამორთული)'}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                stylusOnly
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              <PenTool className="size-3.5 sm:size-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              title="თემის შეცვლა"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              {isDark ? <Sun className="size-3.5 sm:size-4 text-amber-400" /> : <Moon className="size-3.5 sm:size-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              title="დაფის გასუფთავება"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors">
              <Trash2 className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas – background forced by local isDark */}
      <div
        className="relative flex-1 w-full min-h-0 overflow-hidden"
        style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}>
        <KonvaCanvas
          ref={canvasRef}
          elements={pages[currentPageIndex] || []}
          onElementsChange={handleElementsChange}
          activeTool={activeTool}
          strokeColor={effectiveStroke}
          strokeWidth={strokeWidth}
          isDark={isDark}
          scale={zoomScale}
          onScaleChange={(newScale) => setZoomScale(newScale)}
          onLaserMove={handleLaserMove}
          onPasteImage={addImageToCanvas}
          stylusOnly={stylusOnly}
          onTemporaryEraserStart={handleTemporaryEraserStart}
          onTemporaryEraserEnd={handleTemporaryEraserEnd}
          onStylusButtonAction={handleStylusButtonAction}
        />
      </div>

      {isTeacher && (
        <button
          type="button"
          aria-label="AI ასისტენტი"
          title="AI ასისტენტი"
          onClick={handleAskAIAboutBoard}
          className="absolute right-4 bottom-16 sm:bottom-20 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white shadow-xl hover:bg-navy-strong hover:scale-105 active:scale-95 transition-all focus:outline-none border-2 border-white/20">
          <Sparkles className="size-5 text-amber-300" />
        </button>
      )}

      {isTeacher && isAiModalOpen && (
        <div className="fixed inset-0 z-[1000001] flex items-end justify-end bg-slate-950/50 p-3 sm:items-center sm:justify-center sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
          <button
            type="button"
            aria-label="დახურვა"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => setIsAiModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <TeacherAiChatPanel
              copy={DEFAULT_AI_COPY.chat}
              fullCopy={DEFAULT_AI_COPY}
              model={aiModel}
              onModelChange={setAiModel}
              modelStatus={aiModelStatus || []}
              initialImagesBase64={aiInitialImages}
              onClose={() => {
                setIsAiModalOpen(false);
                setAiInitialImages([]);
              }}
              showSaveToLab={true}
              className="max-h-[min(85vh,56rem)] overflow-y-auto"
            />
          </div>
        </div>
      )}

      {/* Bottom panel (unchanged) */}
      <div
        className={`relative z-[100] flex flex-col items-center justify-center pt-1 px-1 sm:px-2 pointer-events-auto shrink-0 select-none ${
          isFullscreen ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]' : 'pb-3'
        }`}>
        {isPagesTrayOpen && (
          <div
            ref={pagesTrayRef}
            className="absolute bottom-14 max-w-[94vw] sm:max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 z-[120]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  დაფის გვერდები ({pages.length})
                </span>
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={selectAllPages}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-2">
                    {selectedPages.length === pages.length ? 'მონიშვნის მოხსნა' : 'ყველას მონიშვნა'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPagesTrayOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                  isSelected={selectedPages.includes(idx)}
                  isDark={isDark}
                  onClick={() => handleSwitchPage(idx)}
                  onLongPress={() => togglePageSelect(idx)}
                  onDelete={() => handleDeletePage(idx)}
                  canDelete={pages.length > 1}
                />
              ))}

              <button
                type="button"
                onClick={handleAddNewPage}
                className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shrink-0 cursor-pointer">
                <Plus className="size-5" />
                <span className="text-[11px] font-bold">ახალი დაფა</span>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[96vw] overflow-x-auto thin-scrollbar touch-pan-x rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl">
          <div className="flex w-max items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5">
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1 sm:pr-1.5 dark:border-slate-800">
              <button
                type="button"
                onClick={handleZoomOut}
                title="დაპატარავება (Ctrl + -)"
                className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95">
                <ZoomOut className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={handleZoomReset}
                title="100%-ზე დაბრუნება (Ctrl + 0)"
                className="flex h-7 sm:h-8 items-center justify-center px-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors min-w-[36px] sm:min-w-[42px]">
                {zoomPercent}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="გადიდება (Ctrl + +)"
                className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95">
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSwitchPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors">
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              data-tray-trigger
              onClick={() => setIsPagesTrayOpen((prev) => !prev)}
              title="ყველა დაფის ნახვა"
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                isPagesTrayOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
              <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                {currentPageIndex + 1} / {pages.length}
              </span>
              {selectedPages.length > 0 && (
                <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {selectedPages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors">
              <ChevronRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleAddNewPage}
              className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors">
              <Plus className="size-3.5" />
              <span>ახალი</span>
            </button>

            {isTeacher && (
              <>
                <button
                  type="button"
                  onClick={handleAskAIAboutBoard}
                  title="დაფის გაგზავნა AI-სთვის"
                  className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium transition-colors shadow-xs shrink-0">
                  <Sparkles className="size-3.5 text-amber-300" />
                  <span>AI-ს კითხვა {selectedPages.length > 0 ? `(${selectedPages.length})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAssignError(null);
                    const pagesToAssign = selectedPages.length > 0 ? selectedPages : [currentPageIndex];
                    setSelectedPagesForAssign(pagesToAssign);
                    if (students.length > 0) {
                      setSelectedStudentIdentities([students[0].identity]);
                    }
                    setIsAssignModalOpen(true);
                    updateParticipantList();
                  }}
                  title="დაფის სურათის გაგზავნა მოსწავლესთან"
                  className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs shrink-0">
                  <Send className="size-3.5" />
                  <span>გაგზავნა {selectedPages.length > 0 ? `(${selectedPages.length})` : ''}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
