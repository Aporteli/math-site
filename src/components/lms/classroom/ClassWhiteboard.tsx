"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Room, RemoteParticipant } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
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
} from "lucide-react";
import type { CanvasElement, KonvaCanvasHandle } from "./KonvaCanvas";
import { sendProblemToStudentAction } from "@/lib/actions/students";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), {
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

const STORAGE_PREFS_KEY = "konva_whiteboard_prefs";
const CHUNK_PAYLOAD_BYTES = 16 * 1024;
const CHUNK_HEADER_BYTES = 13;
const MAGIC_CHUNK_START = 0x01;
const MAGIC_CHUNK_CONT = 0x02;
const MAGIC_CHUNK_END = 0x03;

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
  pageIndex,
  isDark,
  onClick,
  onDelete,
  canDelete,
}: {
  elements: CanvasElement[];
  isActive: boolean;
  pageIndex: number;
  isDark: boolean;
  onClick: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isDark ? "#020617" : "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    if (elements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
      minX = 0; minY = 0; maxX = 800; maxY = 600;
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
      ctx.strokeStyle = isDark && el.stroke === "#1e293b" ? "#ffffff" : el.stroke || "#6366f1";
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        }
        if (el.type === "triangle" || el.type === "diamond") {
          ctx.closePath();
        }
        ctx.stroke();
      } else if (el.type === "rect") {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 40, el.height || 40);
      } else if (el.type === "circle") {
        ctx.beginPath();
        ctx.arc(el.x || 0, el.y || 0, el.radius || 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(el.text || "", el.x || 0, (el.y || 0) + 20);
      }
    });

    ctx.restore();
  }, [elements, isDark]);

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl cursor-pointer transition-all shrink-0 ${
        isActive
          ? "bg-indigo-600/10 dark:bg-indigo-500/20 ring-2 ring-indigo-600 dark:ring-indigo-400"
          : "hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="relative w-28 h-18 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
        <canvas ref={canvasRef} width={112} height={72} className="w-full h-full object-contain" />
        
        {canDelete && (
          <button
            type="button"
            title="გვერდის წაშლა"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-xs"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <span className={`text-[11px] font-bold ${isActive ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-600 dark:text-slate-400"}`}>
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isDark ? "#020617" : "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    if (elements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
      minX = 0; minY = 0; maxX = 800; maxY = 600;
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
      ctx.strokeStyle = isDark && el.stroke === "#1e293b" ? "#ffffff" : el.stroke || "#6366f1";
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        }
        if (el.type === "triangle" || el.type === "diamond") {
          ctx.closePath();
        }
        ctx.stroke();
      } else if (el.type === "rect") {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 40, el.height || 40);
      } else if (el.type === "circle") {
        ctx.beginPath();
        ctx.arc(el.x || 0, el.y || 0, el.radius || 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(el.text || "", el.x || 0, (el.y || 0) + 20);
      }
    });

    ctx.restore();
  }, [elements, isDark]);

  return (
    <div
      onClick={onToggle}
      className={`group relative flex flex-col items-center gap-1 p-1 rounded-2xl cursor-pointer transition-all shrink-0 select-none ${
        isSelected
          ? "bg-indigo-600/10 dark:bg-indigo-500/20 ring-2 ring-indigo-600 dark:ring-indigo-400"
          : "hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="relative w-24 h-15 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
        <canvas ref={canvasRef} width={96} height={60} className="w-full h-full object-contain" />
        
        <div className={`absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border transition-all ${
          isSelected 
            ? "bg-indigo-600 border-indigo-600 text-white" 
            : "bg-white/80 border-slate-300 text-transparent group-hover:border-slate-400"
        }`}>
          <Check className="size-2.5 stroke-[3]" />
        </div>
      </div>

      <span className={`text-[10px] font-bold ${isSelected ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-600 dark:text-slate-400"}`}>
        გვერდი {pageIndex + 1}
      </span>
    </div>
  );
}

function renderElementsToDataUrl(elements: CanvasElement[], isDark: boolean): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = isDark ? "#020617" : "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (elements.length === 0) {
    return canvas.toDataURL("image/png");
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
    minX = 0; minY = 0; maxX = 800; maxY = 600;
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
    ctx.strokeStyle = isDark && el.stroke === "#1e293b" ? "#ffffff" : el.stroke || "#6366f1";
    ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (el.points && el.points.length >= 2) {
      ctx.beginPath();
      const ox = el.x || 0;
      const oy = el.y || 0;
      ctx.moveTo(ox + el.points[0], oy + el.points[1]);
      for (let i = 2; i < el.points.length; i += 2) {
        ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
      }
      if (el.type === "triangle" || el.type === "diamond") {
        ctx.closePath();
      }
      ctx.stroke();
    } else if (el.type === "rect") {
      ctx.strokeRect(el.x || 0, el.y || 0, el.width || 100, el.height || 60);
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.arc(el.x || 0, el.y || 0, el.radius || 30, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === "text") {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(el.text || "", el.x || 0, (el.y || 0) + 32);
    }
  });

  ctx.restore();
  return canvas.toDataURL("image/png");
}

export function ClassWhiteboard({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  isTeacher = false,
}: ClassWhiteboardProps) {
  const canvasRef = useRef<KonvaCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const pagesTrayRef = useRef<HTMLDivElement>(null);
  const storageKeyPages = `konva_whiteboard_pages_${courseId}`;
  const chunkAssemblerRef = useRef<ChunkAssembler>(new ChunkAssembler());

  const [pages, setPages] = useState<CanvasElement[][]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKeyPages);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error("Failed to load pages:", e);
      }
    }
    return [[]];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isPagesTrayOpen, setIsPagesTrayOpen] = useState<boolean>(false);

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
    new Map([[0, { states: [pages[0] || []], index: 0 }]])
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [activeTool, setActiveTool] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || "{}");
        return prefs.tool || "pen";
      } catch {}
    }
    return "pen";
  });

  const [strokeColor, setStrokeColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || "{}");
        return prefs.color || "#1e293b";
      } catch {}
    }
    return "#1e293b";
  });

  const [strokeWidth, setStrokeWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || "{}");
        return prefs.width || 2;
      } catch {}
    }
    return 2;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || "{}");
        return !!prefs.isDark;
      } catch {}
    }
    return false;
  });

  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [students, setStudents] = useState<RemoteParticipant[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignPending, setAssignPending] = useState(false);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (penMenuRef.current && !penMenuRef.current.contains(e.target as Node)) {
        setIsPenMenuOpen(false);
      }
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target as Node)) {
        setIsShapesMenuOpen(false);
      }
      if (pagesTrayRef.current && !pagesTrayRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-tray-trigger]")) {
          setIsPagesTrayOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    pagesRef.current = pages;
    currentPageIndexRef.current = currentPageIndex;
    updateUndoRedoState();
    if (isTeacher && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKeyPages, JSON.stringify(pages));
      } catch (err) {
        console.warn("Quota warning:", err);
      }
    }
  }, [pages, currentPageIndex, isTeacher, storageKeyPages, updateUndoRedoState]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({ tool: activeTool, color: strokeColor, width: strokeWidth, isDark })
      );
    }
  }, [activeTool, strokeColor, strokeWidth, isDark]);

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

      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const chunks = chunkPayload(bytes);

      for (let i = 0; i < chunks.length; i++) {
        await participant.publishData(chunks[i] as any, { reliable });
        if (chunks.length > 1 && i < chunks.length - 1) {
          await new Promise((res) => setTimeout(res, 5));
        }
      }
    },
    [room]
  );

  const handleLaserMove = useCallback(
    (pos: { x: number; y: number } | null) => {
      void publishDataSafe({ type: "WHITEBOARD_LASER", point: pos }, false);
    },
    [publishDataSafe]
  );

  const handleElementsChange = useCallback((newElems: CanvasElement[]) => {
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
      type: "WHITEBOARD_SYNC",
      pageIndex: pIndex,
      elements: newElems,
    });
  }, [publishDataSafe, updateUndoRedoState]);

  const addImageToCanvas = useCallback((dataUrl: string) => {
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
        type: "image",
        x: 100,
        y: 100,
        width: w,
        height: h,
        src: dataUrl,
        stroke: "transparent",
        strokeWidth: 0,
      };

      const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
      handleElementsChange([...currentElems, newImageElem]);
      setActiveTool("select");
    };
  }, [handleElementsChange]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "INPUT") {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
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

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addImageToCanvas]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
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
      e.target.value = "";
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
      type: "WHITEBOARD_SYNC",
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
      type: "WHITEBOARD_SYNC",
      pageIndex: pIndex,
      elements: targetElements,
    });
  }, [publishDataSafe, updateUndoRedoState]);

  useEffect(() => {
    const onUndoEvent = () => handleUndo();
    const onRedoEvent = () => handleRedo();

    window.addEventListener("whiteboard-undo", onUndoEvent);
    window.addEventListener("whiteboard-redo", onRedoEvent);

    return () => {
      window.removeEventListener("whiteboard-undo", onUndoEvent);
      window.removeEventListener("whiteboard-redo", onRedoEvent);
    };
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "INPUT") {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    void publishDataSafe({ type: "WHITEBOARD_PAGE_COUNT", count: updated.length });
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
    void publishDataSafe({ type: "WHITEBOARD_PAGE_COUNT", count: updated.length });
    void publishDataSafe({ type: "WHITEBOARD_PAGE_SWITCH", pageIndex: nextIdx });
  };

  const handleSwitchPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    if (!historyMapRef.current.has(idx)) {
      historyMapRef.current.set(idx, { states: [pages[idx] || []], index: 0 });
    }
    updateUndoRedoState();
    void publishDataSafe({ type: "WHITEBOARD_PAGE_SWITCH", pageIndex: idx });
  };

  const handleAssignSelectedBoards = async () => {
    if (selectedPagesForAssign.length === 0) {
      setAssignError("გთხოვთ მონიშნოთ მინიმუმ 1 დაფა");
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    if (selectedStudentIdentities.length === 0) {
      setAssignError("გთხოვთ მონიშნოთ მინიმუმ 1 მოსწავლე");
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    setAssignPending(true);
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

      const sendPromises = [];
      for (const studentIdentity of selectedStudentIdentities) {
        for (const board of boardImages) {
          const title = `${courseTitle || "დაფის ამოცანა"} — გვერდი ${board.pageIdx + 1}`;
          sendPromises.push(
            sendProblemToStudentAction({
              studentId: studentIdentity,
              instructions: undefined,
              attachmentUrl: board.url,
              problem: {
                id: `whiteboard-${Date.now()}-${board.pageIdx}`,
                topic: title,
                difficulty: "medium",
                promptTex: "",
                solutionTex: "",
              },
            })
          );
        }
      }

      const results = await Promise.all(sendPromises);
      const hasFailure = results.some((r) => !r.success);

      if (hasFailure) {
        throw new Error("ზოგიერთი დავალების გაგზავნა ვერ მოხერხდა");
      }

      setAssignedStatus(`წარმატებით გაეგზავნა ${selectedStudentIdentities.length} მოსწავლეს!`);
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to assign boards to students:", err);
      setAssignError(err.message || "გაგზავნა ვერ მოხერხდა");
    } finally {
      setAssignPending(false);
    }
  };

  const togglePageSelectionForAssign = (idx: number) => {
    setSelectedPagesForAssign((prev) =>
      prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]
    );
  };

  const toggleStudentSelection = (identity: string) => {
    setSelectedStudentIdentities((prev) =>
      prev.includes(identity) ? prev.filter((id) => id !== identity) : [...prev, identity]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIdentities.length === students.length) {
      setSelectedStudentIdentities([]);
    } else {
      setSelectedStudentIdentities(students.map((s) => s.identity));
    }
  };

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const fullPayload = chunkAssemblerRef.current.push(payload);
        if (!fullPayload) return;

        const data = JSON.parse(new TextDecoder().decode(fullPayload));
        if (data.type === "WHITEBOARD_SYNC" && Array.isArray(data.elements)) {
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
        } else if (data.type === "WHITEBOARD_PAGE_SWITCH") {
          setCurrentPageIndex(data.pageIndex);
        } else if (data.type === "WHITEBOARD_PAGE_COUNT") {
          const newPages = [...pagesRef.current];
          while (newPages.length < data.count) newPages.push([]);
          setPages(newPages);
        } else if (data.type === "WHITEBOARD_LASER") {
          canvasRef.current?.renderRemoteLaser(data.point);
        }
      } catch (err) {
        console.error("Packet reassembly error:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, updateUndoRedoState]);

  const shapeTools = [
    { id: "line", icon: Minus, title: "ხაზი" },
    { id: "arrow", icon: MoveRight, title: "ისარი" },
    { id: "rect", icon: Square, title: "მართკუთხედი" },
    { id: "circle", icon: Circle, title: "წრე" },
    { id: "triangle", icon: Triangle, title: "სამკუთხედი" },
    { id: "diamond", icon: Diamond, title: "რომბი" },
    { id: "star", icon: Star, title: "ვარსკვლავი" },
  ];

  const currentShapeObj = shapeTools.find((s) => s.id === activeTool) || shapeTools[2];
  const CurrentShapeIcon = currentShapeObj.icon;
  const isShapeActive = shapeTools.some((s) => s.id === activeTool);

  const zoomPercent = Math.round(zoomScale * 100);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden overscroll-none touch-none select-none ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      } ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-[100dvh] w-screen"
          : "rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

      {/* გასუფთავების მოდალი */}
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
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={handleClearPage}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 მასწავლებლის გაგზავნის მოდალი 🌟 */}
      {isTeacher && isAssignModalOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-[340px] sm:w-[400px] rounded-3xl bg-white dark:bg-slate-900 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Send className="size-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">დაფის გაგზავნა დავალებად</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssignError(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
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
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedPagesForAssign.length === pages.length ? "მხოლოდ მიმდინარე" : "ყველა დაფა"}
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
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedStudentIdentities.length === students.length ? "მონიშვნის მოხსნა" : "ყველა მოსწავლე"}
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
                          ? "border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-xs"
                          : "border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-semibold truncate max-w-[240px]">
                        {student.name || student.identity}
                      </span>
                      <div className={`flex size-4 shrink-0 items-center justify-center rounded-md transition-all ${
                        isChecked 
                          ? "bg-indigo-600 text-white" 
                          : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      }`}>
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIdentities.length === 0}
            onClick={handleAssignSelectedBoards}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {assignPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>იგზავნება...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span>
                  გაგზავნა ({selectedPagesForAssign.length} დაფა ➔ {selectedStudentIdentities.length} მოსწავლე)
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 🌟 1. მცურავი ზედა პანელი 🌟 */}
      <div className="absolute top-3 inset-x-0 z-[100] flex justify-center px-2 pointer-events-none">
        <div className="pointer-events-auto max-w-full overflow-visible rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex w-max items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5">
            {/* Undo / Redo */}
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1 dark:border-slate-800">
              <button
                type="button"
                title="უკან დაბრუნება (Ctrl+Z)"
                disabled={!canUndo}
                onClick={handleUndo}
                className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
                  canUndo
                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95"
                    : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                }`}
              >
                <Undo2 className="size-3.5 sm:size-4" />
              </button>

              <button
                type="button"
                title="წინ გადასვლა (Ctrl+Y)"
                disabled={!canRedo}
                onClick={handleRedo}
                className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
                  canRedo
                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95"
                    : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                }`}
              >
                <Redo2 className="size-3.5 sm:size-4" />
              </button>
            </div>

            {/* მასშტაბირება */}
            <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1 dark:border-slate-800">
              <button
                type="button"
                onClick={handleZoomOut}
                title="დაპატარავება (Ctrl + -)"
                className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95"
              >
                <ZoomOut className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={handleZoomReset}
                title="100%-ზე დაბრუნება (Ctrl + 0)"
                className="flex h-7 sm:h-8 items-center justify-center px-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors min-w-[38px] sm:min-w-[44px]"
              >
                {zoomPercent}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="გადიდება (Ctrl + +)"
                className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            {/* Select Tool */}
            <button
              type="button"
              title="მონიშვნა / ზომის შეცვლა"
              onClick={() => {
                setActiveTool("select");
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === "select"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <MousePointer className="size-3.5 sm:size-4" />
            </button>

            {/* Hand Tool (Pan) */}
            <button
              type="button"
              title="დაფის გადაადგილება (Pan)"
              onClick={() => {
                setActiveTool("hand");
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === "hand"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Hand className="size-3.5 sm:size-4" />
            </button>

            {/* Laser Tool */}
            <button
              type="button"
              title="ლაზერული მაჩვენებელი (Laser Pointer)"
              onClick={() => {
                setActiveTool("laser");
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === "laser"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Crosshair className="size-3.5 sm:size-4" />
            </button>

            {/* Pen Tool */}
            <div ref={penMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
                  activeTool === "pen"
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-600/20"
                    : "bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <button
                  type="button"
                  title="კალამი"
                  onClick={() => {
                    setActiveTool("pen");
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                  }}
                  className="flex items-center gap-1 h-full px-2 rounded-l-xl focus:outline-none"
                >
                  <Pencil className="size-3.5 sm:size-4" />
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium opacity-90">{strokeWidth}px</span>
                </button>

                <button
                  type="button"
                  title="სისქის მენიუ"
                  onClick={() => {
                    setIsPenMenuOpen((prev) => !prev);
                    setIsShapesMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
                    activeTool === "pen"
                      ? "border-indigo-500/40 hover:bg-indigo-700"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  <ChevronDown className={`size-2.5 sm:size-3 transition-transform duration-200 ${isPenMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isPenMenuOpen && (
                <div className="absolute top-10 left-0 z-[120] w-52 sm:w-56 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
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
                          setIsPenMenuOpen(false);
                        }}
                        className={`size-6 sm:size-7 flex items-center justify-center rounded-xl transition-colors ${
                          strokeWidth === size
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 ring-1 ring-indigo-500"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        }`}
                      >
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

            {/* Shapes Tool */}
            <div ref={shapesMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
                  isShapeActive
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-600/20"
                    : "bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <button
                  type="button"
                  title="ფიგურა"
                  onClick={() => {
                    setActiveTool(currentShapeObj.id);
                    setIsShapesMenuOpen(false);
                    setIsPenMenuOpen(false);
                  }}
                  className="flex items-center justify-center size-7 sm:size-8 rounded-l-xl focus:outline-none"
                >
                  <CurrentShapeIcon className="size-3.5 sm:size-4" />
                </button>

                <button
                  type="button"
                  title="ფიგურების მენიუ"
                  onClick={() => {
                    setIsShapesMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
                    isShapeActive
                      ? "border-indigo-500/40 hover:bg-indigo-700"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  <ChevronDown className={`size-2.5 sm:size-3 transition-transform duration-200 ${isShapesMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isShapesMenuOpen && (
                <div className="absolute top-10 left-0 z-[120] w-36 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
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
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <SIcon className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Text Tool */}
            <button
              type="button"
              title="ტექსტი"
              onClick={() => {
                setActiveTool("text");
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === "text"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Type className="size-3.5 sm:size-4" />
            </button>

            {/* Image Upload */}
            <button
              type="button"
              title="სურათის ატვირთვა"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ImageIcon className="size-3.5 sm:size-4" />
            </button>

            {/* Eraser Tool */}
            <button
              type="button"
              title="საშლელი"
              onClick={() => {
                setActiveTool("eraser");
                setIsPenMenuOpen(false);
                setIsShapesMenuOpen(false);
              }}
              className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTool === "eraser"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Eraser className="size-3.5 sm:size-4" />
            </button>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Fit to content */}
            <button
              type="button"
              onClick={() => canvasRef.current?.fitToContent()}
              title="ნახაზების ეკრანზე მორგება (Fit)"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <Maximize2 className="size-3.5 sm:size-4" />
            </button>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Color Palette */}
            <div className="flex shrink-0 items-center gap-1">
              {["#1e293b", "#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStrokeColor(c)}
                  className={`size-4 sm:size-5 rounded-full transition-transform ${
                    strokeColor === c ? "scale-125 ring-2 ring-indigo-500 ring-offset-1" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="h-4 w-[1px] shrink-0 bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              title="თემის შეცვლა"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {isDark ? <Sun className="size-3.5 sm:size-4 text-amber-400" /> : <Moon className="size-3.5 sm:size-4" />}
            </button>

            {/* Clear Board */}
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              title="დაფის გასუფთავება"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
            >
              <Trash2 className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 2. ტილო (Canvas) 🌟 */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-transparent">
        <KonvaCanvas
          ref={canvasRef}
          elements={pages[currentPageIndex] || []}
          onElementsChange={handleElementsChange}
          activeTool={activeTool}
          strokeColor={isDark && strokeColor === "#1e293b" ? "#ffffff" : strokeColor}
          strokeWidth={strokeWidth}
          isDark={isDark}
          scale={zoomScale}
          onScaleChange={(newScale) => setZoomScale(newScale)}
          onLaserMove={handleLaserMove}
        />
      </div>

      {/* 🌟 3. ქვედა პანელი 🌟 */}
      <div className="absolute bottom-3 inset-x-0 z-[100] flex flex-col items-center gap-2 px-2 pointer-events-none">
        
        {/* დაფების მინიატურების ზოლი */}
        {isPagesTrayOpen && (
          <div
            ref={pagesTrayRef}
            className="pointer-events-auto max-w-[94vw] sm:max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  დაფის გვერდები ({pages.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPagesTrayOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
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
                className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="size-5" />
                <span className="text-[11px] font-bold">ახალი დაფა</span>
              </button>
            </div>
          </div>
        )}

        {/* ქვედა ღილაკების პანელი */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl select-none">
          <button
            type="button"
            onClick={() => handleSwitchPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>

          <button
            type="button"
            data-tray-trigger
            onClick={() => setIsPagesTrayOpen((prev) => !prev)}
            title="ყველა დაფის ნახვა"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              isPagesTrayOpen
                ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{currentPageIndex + 1} / {pages.length}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchPage(currentPageIndex + 1)}
            disabled={currentPageIndex === pages.length - 1}
            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleAddNewPage}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
          >
            <Plus className="size-3.5" />
            <span>ახალი</span>
          </button>

          {isTeacher && (
            <button
              type="button"
              onClick={() => {
                setAssignError(null);
                setSelectedPagesForAssign([currentPageIndex]);
                if (students.length > 0) {
                  setSelectedStudentIdentities([students[0].identity]);
                }
                setIsAssignModalOpen(true);
                updateParticipantList();
              }}
              title="დაფის სურათის გაგზავნა მოსწავლესთან"
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Send className="size-3.5" />
              <span>გაგზავნა</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}