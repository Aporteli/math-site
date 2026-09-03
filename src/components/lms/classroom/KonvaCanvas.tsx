'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import Konva from 'konva';
import {
  Stage,
  Layer,
  Line,
  Circle,
  Rect,
  Arrow,
  Star,
  Text,
  Transformer,
  Group,
  Image as KonvaImage,
} from 'react-konva';
import { Clipboard } from 'lucide-react';

export interface CanvasElement {
  id: string;
  type: string;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  fontSize?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  text?: string;
  src?: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}

export interface KonvaCanvasHandle {
  toDataURL: () => string | null;
  fitToContent: () => void;
  renderRemoteLaser: (point: { x: number; y: number } | null) => void;
  deleteSelected: () => void;
}

interface KonvaCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  activeTool: string;
  strokeColor: string;
  strokeWidth: number;
  isDark: boolean;
  scale?: number;
  onScaleChange?: (newScale: number) => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
  textPlaceholder?: string;
  onPasteImage?: (dataUrl: string, pos?: { x: number; y: number }) => void;
  stylusOnly?: boolean;
}

interface LaserPoint {
  x: number;
  y: number;
}

function distToSegmentSquared(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCenter(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function cleanPastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
    .join('\n\n')
    .trim();
}

function tryMergeClosedPolygon(allElements: CanvasElement[], newLine: CanvasElement): CanvasElement[] | null {
  if (newLine.type !== 'line' || !newLine.points || newLine.points.length !== 4) return null;

  interface Segment {
    el: CanvasElement;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  }

  const getAbsEnds = (el: CanvasElement): { p1: { x: number; y: number }; p2: { x: number; y: number } } => {
    const pts = el.points || [0, 0, 0, 0];
    const cos = Math.cos(((el.rotation || 0) * Math.PI) / 180);
    const sin = Math.sin(((el.rotation || 0) * Math.PI) / 180);
    const ex = el.x || 0;
    const ey = el.y || 0;
    const sx = el.scaleX || 1;
    const sy = el.scaleY || 1;

    const x1 = pts[0] * sx;
    const y1 = pts[1] * sy;
    const x2 = pts[2] * sx;
    const y2 = pts[3] * sy;

    return {
      p1: { x: ex + x1 * cos - y1 * sin, y: ey + x1 * sin + y1 * cos },
      p2: { x: ex + x2 * cos - y2 * sin, y: ey + x2 * sin + y2 * cos },
    };
  };

  const lineElements = allElements.filter((el) => el.type === 'line' && el.points && el.points.length === 4);
  const segments: Segment[] = [...lineElements, newLine].map((el) => ({
    el,
    ...getAbsEnds(el),
  }));

  const EPSILON = 18;
  const isClose = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= EPSILON;

  const used = new Set<string>();
  const currentPath: { pt: { x: number; y: number }; seg: Segment }[] = [];

  const lastSeg = segments[segments.length - 1];

  function findCycle(
    currentPoint: { x: number; y: number },
    startPoint: { x: number; y: number },
    depth: number,
  ): boolean {
    if (depth >= 3 && isClose(currentPoint, startPoint)) {
      return true;
    }
    if (depth > 8) return false;

    for (const seg of segments) {
      if (used.has(seg.el.id)) continue;

      if (isClose(currentPoint, seg.p1)) {
        used.add(seg.el.id);
        currentPath.push({ pt: seg.p2, seg });
        if (findCycle(seg.p2, startPoint, depth + 1)) return true;
        currentPath.pop();
        used.delete(seg.el.id);
      } else if (isClose(currentPoint, seg.p2)) {
        used.add(seg.el.id);
        currentPath.push({ pt: seg.p1, seg });
        if (findCycle(seg.p1, startPoint, depth + 1)) return true;
        currentPath.pop();
        used.delete(seg.el.id);
      }
    }
    return false;
  }

  used.add(lastSeg.el.id);
  currentPath.push({ pt: lastSeg.p2, seg: lastSeg });

  let found = findCycle(lastSeg.p2, lastSeg.p1, 1);

  if (!found) {
    used.clear();
    currentPath.length = 0;
    used.add(lastSeg.el.id);
    currentPath.push({ pt: lastSeg.p1, seg: lastSeg });
    found = findCycle(lastSeg.p1, lastSeg.p2, 1);
  }

  if (found && currentPath.length >= 3) {
    const polygonPoints: number[] = [];
    currentPath.forEach((step) => {
      polygonPoints.push(Math.round(step.pt.x), Math.round(step.pt.y));
    });

    const usedIds = new Set(currentPath.map((p) => p.seg.el.id));
    const remaining = allElements.filter((el) => !usedIds.has(el.id));

    const mergedPolygon: CanvasElement = {
      id: `poly_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'triangle',
      points: polygonPoints,
      x: 0,
      y: 0,
      stroke: newLine.stroke,
      strokeWidth: newLine.strokeWidth,
    };

    return [...remaining, mergedPolygon];
  }

  return null;
}

function CanvasImageElement({
  el,
  isListening,
  activeTool,
  onClick,
  onDragEnd,
  onTransformEnd,
}: {
  el: CanvasElement;
  isListening: boolean;
  activeTool: string;
  onClick: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
}) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!el.src) return;
    const img = new window.Image();
    img.src = el.src;
    img.onload = () => {
      setImageObj(img);
    };
  }, [el.src]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      key={el.id}
      id={el.id}
      image={imageObj}
      x={el.x || 0}
      y={el.y || 0}
      width={el.width || imageObj.width}
      height={el.height || imageObj.height}
      rotation={el.rotation || 0}
      scaleX={el.scaleX || 1}
      scaleY={el.scaleY || 1}
      draggable={activeTool === 'select'}
      listening={isListening}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

const KonvaCanvas = forwardRef<KonvaCanvasHandle, KonvaCanvasProps>(function KonvaCanvas(
  {
    elements,
    onElementsChange,
    activeTool,
    strokeColor,
    strokeWidth,
    isDark,
    scale = 1,
    onScaleChange,
    onLaserMove,
    textPlaceholder = 'ტექსტი...',
    onPasteImage,
    stylusOnly = false,
  },
  ref,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [editingPos, setEditingPos] = useState<{ x: number; y: number; width: number }>({
    x: 0,
    y: 0,
    width: 550,
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stageX: number; stageY: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const laserLayerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<any>(null);
  const textareaInputRef = useRef<HTMLTextAreaElement>(null);

  const isDrawing = useRef(false);
  const isErasing = useRef(false);
  const isLasering = useRef(false);
  const activeShapeRef = useRef<any>(null);
  const activeShapeIdRef = useRef<string>('');
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;

  const isStylusActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);

  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);
  const isPinching = useRef<boolean>(false);

  const laserStrokesRef = useRef<LaserPoint[][]>([]);
  const laserReleaseTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return transform.point(pos);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const stage = stageRef.current;
      let stageX = 0,
        stageY = 0;
      if (stage) {
        const transform = stage.getAbsoluteTransform().copy().invert();
        const pos = transform.point({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        stageX = pos.x;
        stageY = pos.y;
      }
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, stageX, stageY });
    };
    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handlePasteClick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('ბრაუზერი არ უჭერს მხარს ამ ფუნქციას. გთხოვთ გამოიყენოთ Ctrl+V.');
        setContextMenu(null);
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageTypes = item.types.filter((type) => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result && onPasteImage) {
              onPasteImage(e.target.result as string, { x: contextMenu!.stageX, y: contextMenu!.stageY });
            }
          };
          reader.readAsDataURL(blob);
          setContextMenu(null);
          return;
        }
      }
      alert('ბუფერში (Clipboard) სურათი ვერ მოიძებნა.');
    } catch (err) {
      console.error(err);
      alert('გთხოვთ დართოთ ბუფერთან წვდომის უფლება, ან გამოიყენოთ კლავიატურა (Ctrl+V).');
    }
    setContextMenu(null);
  };

  const renderLaserFrame = useCallback(() => {
    const layer = laserLayerRef.current;
    if (!layer) return;

    const strokes = laserStrokesRef.current;
    if (strokes.length === 0) {
      layer.destroyChildren();
      layer.batchDraw();
      animFrameRef.current = null;
      return;
    }

    let opacity = 1;
    const HOLD_DURATION = 600;
    const FADE_DURATION = 250;

    if (laserReleaseTimeRef.current !== null) {
      const elapsed = Date.now() - laserReleaseTimeRef.current;
      if (elapsed < HOLD_DURATION) {
        opacity = 1;
      } else {
        const fadeElapsed = elapsed - HOLD_DURATION;
        opacity = Math.max(0, 1 - fadeElapsed / FADE_DURATION);
        if (opacity <= 0) {
          laserStrokesRef.current = [];
          laserReleaseTimeRef.current = null;
          layer.destroyChildren();
          layer.batchDraw();
          animFrameRef.current = null;
          return;
        }
      }
    }

    layer.destroyChildren();

    strokes.forEach((points) => {
      if (points.length >= 2) {
        const laserShape = new Konva.Shape({
          sceneFunc: (context) => {
            const ctx = context._context as CanvasRenderingContext2D;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            if (points.length === 2) {
              ctx.lineTo(points[1].x, points[1].y);
            } else {
              for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) * 0.5;
                const yc = (points[i].y + points[i + 1].y) * 0.5;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
              }
              const last = points[points.length - 1];
              ctx.lineTo(last.x, last.y);
            }

            ctx.strokeStyle = `rgba(255, 0, 34, ${opacity})`;
            ctx.lineWidth = 4.5;
            ctx.stroke();
            ctx.restore();
          },
        });
        layer.add(laserShape);
      } else if (points.length === 1) {
        const single = points[0];
        const singleDot = new Konva.Circle({
          x: single.x,
          y: single.y,
          radius: 2.25,
          fill: '#ff0022',
          opacity,
        });
        layer.add(singleDot);
      }
    });

    layer.batchDraw();
    if (laserReleaseTimeRef.current !== null) {
      animFrameRef.current = requestAnimationFrame(renderLaserFrame);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  const startLaserDrawing = useCallback(
    (pos: { x: number; y: number }) => {
      laserReleaseTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      laserStrokesRef.current.push([pos]);
      renderLaserFrame();
    },
    [renderLaserFrame],
  );

  const addLaserPoint = useCallback(
    (pos: { x: number; y: number }) => {
      const strokes = laserStrokesRef.current;
      if (strokes.length === 0) {
        laserStrokesRef.current.push([pos]);
      } else {
        const currentStroke = strokes[strokes.length - 1];
        if (currentStroke.length > 0) {
          const last = currentStroke[currentStroke.length - 1];
          if (Math.hypot(pos.x - last.x, pos.y - last.y) < 1.2) return;
        }
        currentStroke.push(pos);
      }
      renderLaserFrame();
    },
    [renderLaserFrame],
  );

  const triggerLaserFade = useCallback(() => {
    if (laserStrokesRef.current.length > 0) {
      laserReleaseTimeRef.current = Date.now();
      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(renderLaserFrame);
      }
    }
  }, [renderLaserFrame]);

  const renderRemoteLaser = useCallback(
    (point: { x: number; y: number } | null) => {
      if (point) {
        if (laserReleaseTimeRef.current !== null || laserStrokesRef.current.length === 0) {
          startLaserDrawing(point);
        } else {
          addLaserPoint(point);
        }
      } else {
        triggerLaserFade();
      }
    },
    [startLaserDrawing, addLaserPoint, triggerLaserFade],
  );

  const fitToContent = useCallback(() => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    if (width <= 0 || height <= 0) return;

    const currentElems = elementsRef.current;
    if (currentElems.length === 0) {
      setStagePos({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    currentElems.forEach((el) => {
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
        const w = el.width || (el.radius ? el.radius * 2 : 150);
        const h = el.height || (el.radius ? el.radius * 2 : 60);
        if (el.x < minX) minX = el.x;
        if (el.x + w > maxX) maxX = el.x + w;
        if (el.y < minY) minY = el.y;
        if (el.y + h > maxY) maxY = el.y + h;
      }
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = width;
      minY = 0;
      maxY = height;
    }

    const padding = 30;
    setStagePos({ x: -minX * scale + padding * scale, y: -minY * scale + padding * scale });
  }, [scale]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const remaining = elementsRef.current.filter((el) => el.id !== selectedId);
    elementsRef.current = remaining;
    onElementsChange(remaining);
    setSelectedId(null);
  }, [selectedId, onElementsChange]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      if (trRef.current) {
        trRef.current.nodes([]);
        mainLayerRef.current?.batchDraw();
      }

      const bgRect = new Konva.Rect({
        x: -stage.x() / stage.scaleX(),
        y: -stage.y() / stage.scaleY(),
        width: stage.width() / stage.scaleX(),
        height: stage.height() / stage.scaleY(),
        fill: isDark ? '#020617' : '#ffffff',
        listening: false,
      });

      mainLayerRef.current?.add(bgRect);
      bgRect.moveToBottom();
      mainLayerRef.current?.batchDraw();

      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      bgRect.destroy();
      mainLayerRef.current?.batchDraw();

      return dataUrl;
    },
    fitToContent,
    renderRemoteLaser,
    deleteSelected,
  }));

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;
    const val = cleanPastedText(editingTextValue);

    let finalWidth = editingPos.width / (scale || 1);
    if (textareaInputRef.current) {
      finalWidth = Math.max(140, textareaInputRef.current.offsetWidth / (scale || 1));
    }

    if (!val) {
      const remaining = elementsRef.current.filter((el) => el.id !== editingTextId);
      elementsRef.current = remaining;
      onElementsChange(remaining);
      setSelectedId(null);
    } else {
      const updated = elementsRef.current.map((el) =>
        el.id === editingTextId ? { ...el, text: val, fontSize: currentFontSize, width: finalWidth } : el,
      );
      elementsRef.current = updated;
      onElementsChange(updated);
    }
    setEditingTextId(null);
    setEditingTextValue('');
  }, [editingTextId, editingTextValue, currentFontSize, editingPos.width, scale, onElementsChange]);

  const startTextInlineEditing = useCallback(
    (el: CanvasElement) => {
      const stageScale = scale || 1;
      setEditingTextId(el.id);
      setEditingTextValue(el.text || '');
      setCurrentFontSize(el.fontSize || 24);
      const renderWidth = (el.width || 550) * stageScale;

      setEditingPos({
        x: (el.x || 50) * stageScale + stagePos.x,
        y: (el.y || 50) * stageScale + stagePos.y,
        width: Math.max(300, renderWidth),
      });

      setTimeout(() => {
        if (textareaInputRef.current) {
          textareaInputRef.current.focus();
          textareaInputRef.current.select();
        }
      }, 30);
    },
    [scale, stagePos],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editingTextId) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingTextId, selectedId, deleteSelected]);

  const handleTouchStart = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches) return;

    if (touchEvent.touches.length === 2) {
      isPinching.current = true;
      if (isDrawing.current && activeShapeRef.current) {
        isDrawing.current = false;
        activeShapeRef.current.destroy();
        activeShapeRef.current = null;
        drawLayerRef.current?.batchDraw();
      }

      const t1 = touchEvent.touches[0];
      const t2 = touchEvent.touches[1];
      const p1 = { x: t1.clientX, y: t1.clientY };
      const p2 = { x: t2.clientX, y: t2.clientY };

      lastDist.current = getDistance(p1, p2);
      lastCenter.current = getCenter(p1, p2);
    }
  };

  const handleTouchMove = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length !== 2 || !stageRef.current) return;

    e.evt.preventDefault();
    isPinching.current = true;

    const t1 = touchEvent.touches[0];
    const t2 = touchEvent.touches[1];
    const p1 = { x: t1.clientX, y: t1.clientY };
    const p2 = { x: t2.clientX, y: t2.clientY };

    const dist = getDistance(p1, p2);
    const center = getCenter(p1, p2);

    if (!lastCenter.current) {
      lastCenter.current = center;
      lastDist.current = dist;
      return;
    }

    const oldScale = scale;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentCenterStage = {
      x: (center.x - rect.left - stagePos.x) / oldScale,
      y: (center.y - rect.top - stagePos.y) / oldScale,
    };

    const scaleFactor = dist / (lastDist.current || dist);
    const newScale = Math.max(0.2, Math.min(4, Math.round(oldScale * scaleFactor * 100) / 100));

    const dx = center.x - lastCenter.current.x;
    const dy = center.y - lastCenter.current.y;

    const newPos = {
      x: center.x - rect.left - currentCenterStage.x * newScale + dx,
      y: center.y - rect.top - currentCenterStage.y * newScale + dy,
    };

    lastDist.current = dist;
    lastCenter.current = center;

    setStagePos(newPos);
    if (newScale !== oldScale) {
      onScaleChange?.(newScale);
    }
  };

  const handleTouchEnd = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length < 2) {
      lastCenter.current = null;
      lastDist.current = 0;
      setTimeout(() => {
        isPinching.current = false;
      }, 50);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        setStageSize({ width: container.offsetWidth, height: container.offsetHeight });
      }
    };
    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (drawLayerRef.current && !isDrawing.current) {
      drawLayerRef.current.destroyChildren();
      drawLayerRef.current.batchDraw();
    }
  }, [elements]);

  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        mainLayerRef.current?.batchDraw();
      } else {
        trRef.current.nodes([]);
        mainLayerRef.current?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      mainLayerRef.current?.batchDraw();
    }
  }, [selectedId]);

  const eraseAtPosition = useCallback(
    (pos: { x: number; y: number }) => {
      const threshold = 26;
      const thresholdSq = threshold * threshold;
      let hasChanges = false;

      const remaining = elementsRef.current.filter((el) => {
        if (el.points && el.points.length >= 2) {
          const ox = el.x || 0;
          const oy = el.y || 0;
          const pts = el.points;
          for (let i = 0; i < pts.length - 2; i += 2) {
            const x1 = ox + pts[i];
            const y1 = oy + pts[i + 1];
            const x2 = ox + pts[i + 2];
            const y2 = oy + pts[i + 3];
            if (distToSegmentSquared(pos.x, pos.y, x1, y1, x2, y2) <= thresholdSq) {
              hasChanges = true;
              return false;
            }
          }
        }
        if (el.type === 'circle' && el.x !== undefined && el.y !== undefined) {
          const rad = el.radius || 10;
          const distToCenter = Math.hypot(pos.x - el.x, pos.y - el.y);
          if (Math.abs(distToCenter - rad) <= threshold || distToCenter <= rad) {
            hasChanges = true;
            return false;
          }
        }
        if (
          (el.type === 'rect' ||
            el.type === 'text' ||
            el.type === 'triangle' ||
            el.type === 'diamond' ||
            el.type === 'star' ||
            el.type === 'image') &&
          el.x !== undefined &&
          el.y !== undefined
        ) {
          const w = el.width || 100;
          const h = el.height || 60;
          if (
            pos.x >= el.x - threshold &&
            pos.x <= el.x + w + threshold &&
            pos.y >= el.y - threshold &&
            pos.y <= el.y + h + threshold
          ) {
            hasChanges = true;
            return false;
          }
        }
        return true;
      });

      if (hasChanges) {
        elementsRef.current = remaining;
        onElementsChange(remaining);
        if (selectedId && !remaining.find((el) => el.id === selectedId)) {
          setSelectedId(null);
        }
      }
    },
    [onElementsChange, selectedId],
  );

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isErasing.current = false;
      if (isLasering.current) {
        isLasering.current = false;
        triggerLaserFade();
        onLaserMove?.(null);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [triggerLaserFade, onLaserMove]);

  const handlePointerDown = (e: any) => {
    const evt = e.evt as PointerEvent;
    if (stylusOnly && evt.pointerType === 'touch') return;
    if (isPinching.current) return;
    if (contextMenu) setContextMenu(null);

    if (editingTextId) {
      finishTextEditing();
      return;
    }

    if (evt.pointerType === 'touch' && isStylusActiveRef.current) return;
    if (evt.pointerType === 'pen') isStylusActiveRef.current = true;

    const pid = evt.pointerId ?? 1;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== pid) {
      return;
    }
    activePointerIdRef.current = pid;

    if (activeTool === 'hand') return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    const clientX = evt.clientX ?? (evt as any).touches?.[0]?.clientX;
    const clientY = evt.clientY ?? (evt as any).touches?.[0]?.clientY;
    if (clientX !== undefined && clientY !== undefined) {
      pointerStartPos.current = { x: clientX, y: clientY };
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
      longPressTimeout.current = setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setContextMenu({ x: clientX - rect.left, y: clientY - rect.top, stageX: pos.x, stageY: pos.y });
        }
        isDrawing.current = false;
        if (activeShapeRef.current) {
          activeShapeRef.current.destroy();
          activeShapeRef.current = null;
          drawLayerRef.current?.batchDraw();
        }
      }, 800);
    }

    if (activeTool === 'laser') {
      isLasering.current = true;
      startLaserDrawing(pos);
      onLaserMove?.(pos);
      return;
    }

    if (activeTool === 'eraser') {
      isErasing.current = true;
      eraseAtPosition(pos);
      return;
    }

    if (activeTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) setSelectedId(null);
      return;
    }

    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (activeTool === 'text') {
      const newElem: CanvasElement = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: 550,
        text: '',
        fontSize: currentFontSize || 24,
        scaleX: 1,
        scaleY: 1,
        stroke: strokeColor,
        strokeWidth: 1,
      };
      elementsRef.current = [...elementsRef.current, newElem];
      onElementsChange(elementsRef.current);
      setSelectedId(id);
      startTextInlineEditing(newElem);
      return;
    }

    let startX = pos.x;
    let startY = pos.y;

    if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'triangle' || activeTool === 'diamond') {
      const SNAP_DIST = 18;
      for (const el of elementsRef.current) {
        if (el.points) {
          const cos = Math.cos(((el.rotation || 0) * Math.PI) / 180);
          const sin = Math.sin(((el.rotation || 0) * Math.PI) / 180);
          const ex = el.x || 0;
          const ey = el.y || 0;
          for (let i = 0; i < el.points.length; i += 2) {
            const px = el.points[i] * (el.scaleX || 1);
            const py = el.points[i + 1] * (el.scaleY || 1);
            const absX = ex + px * cos - py * sin;
            const absY = ey + px * sin + py * cos;
            if (Math.hypot(absX - pos.x, absY - pos.y) <= SNAP_DIST) {
              startX = absX;
              startY = absY;
              break;
            }
          }
        }
        if (startX !== pos.x) break;
      }
    }

    isDrawing.current = true;
    activeShapeIdRef.current = id;

    if (activeTool === 'pen') {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX + 0.1, startY + 0.1],
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.4,
      });
    } else if (activeTool === 'line') {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY],
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'arrow') {
      activeShapeRef.current = new Konva.Arrow({
        points: [startX, startY, startX, startY],
        stroke: strokeColor,
        fill: strokeColor,
        strokeWidth: strokeWidth,
        pointerLength: Math.max(8, strokeWidth * 3),
        pointerWidth: Math.max(8, strokeWidth * 3),
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'rect') {
      activeShapeRef.current = new Konva.Rect({
        x: startX,
        y: startY,
        width: 1,
        height: 1,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'circle') {
      activeShapeRef.current = new Konva.Circle({
        x: startX,
        y: startY,
        radius: 1,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'triangle') {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY, startX, startY],
        closed: true,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineJoin: 'round',
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'diamond') {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY, startX, startY, startX, startY],
        closed: true,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineJoin: 'round',
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === 'star') {
      activeShapeRef.current = new Konva.Star({
        x: startX,
        y: startY,
        numPoints: 5,
        innerRadius: 1,
        outerRadius: 2,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    }

    if (activeShapeRef.current && drawLayerRef.current) {
      drawLayerRef.current.add(activeShapeRef.current);
      drawLayerRef.current.batchDraw();
    }
  };

  const handlePointerMove = (e: any) => {
    const evt = e.evt as PointerEvent;
    if (stylusOnly && evt.pointerType === 'touch') return;
    if (isPinching.current) return;

    if (evt.pointerType === 'touch' && isStylusActiveRef.current) return;
    if (evt.pointerId !== activePointerIdRef.current) return;

    const clientX = evt.clientX ?? (evt as any).touches?.[0]?.clientX;
    const clientY = evt.clientY ?? (evt as any).touches?.[0]?.clientY;
    if (pointerStartPos.current && clientX !== undefined && clientY !== undefined) {
      const dx = clientX - pointerStartPos.current.x;
      const dy = clientY - pointerStartPos.current.y;
      if (Math.hypot(dx, dy) > 10 && longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
    }

    const stage = stageRef.current;
    if (!stage) return;
    const transform = stage.getAbsoluteTransform().copy().invert();

    const nativeEvt = e.evt;
    const events = (nativeEvt.getCoalescedEvents ? nativeEvt.getCoalescedEvents() : [nativeEvt]) as PointerEvent[];

    if (activeTool === 'laser') {
      if (isLasering.current || nativeEvt.buttons === 1) {
        for (let i = 0; i < events.length; i++) {
          const cPos = { x: events[i].clientX, y: events[i].clientY };
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const relPos = transform.point({ x: cPos.x - rect.left, y: cPos.y - rect.top });
            addLaserPoint(relPos);
            if (i === events.length - 1) onLaserMove?.(relPos);
          }
        }
      }
      return;
    }

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'eraser' && (isErasing.current || nativeEvt.buttons === 1)) {
      eraseAtPosition(pos);
      return;
    }

    if (!isDrawing.current || !activeShapeRef.current) return;

    let snapX = pos.x;
    let snapY = pos.y;

    if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'triangle' || activeTool === 'diamond') {
      const SNAP_DIST = 18;
      for (const el of elementsRef.current) {
        if (el.points) {
          const cos = Math.cos(((el.rotation || 0) * Math.PI) / 180);
          const sin = Math.sin(((el.rotation || 0) * Math.PI) / 180);
          const ex = el.x || 0;
          const ey = el.y || 0;
          for (let i = 0; i < el.points.length; i += 2) {
            const px = el.points[i] * (el.scaleX || 1);
            const py = el.points[i + 1] * (el.scaleY || 1);
            const absX = ex + px * cos - py * sin;
            const absY = ey + px * sin + py * cos;
            if (Math.hypot(absX - pos.x, absY - pos.y) <= SNAP_DIST) {
              snapX = absX;
              snapY = absY;
              break;
            }
          }
        }
        if (snapX !== pos.x) break;
      }
    }

    if (activeTool === 'pen') {
      const currentPts = activeShapeRef.current.points();
      const len = currentPts.length;
      const lastX = currentPts[len - 2];
      const lastY = currentPts[len - 1];
      if (Math.hypot(pos.x - lastX, pos.y - lastY) >= 1.5) {
        activeShapeRef.current.points(currentPts.concat([pos.x, pos.y]));
      }
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      const points = activeShapeRef.current.points();
      activeShapeRef.current.points([points[0], points[1], snapX, snapY]);
    } else if (activeTool === 'rect') {
      activeShapeRef.current.width(snapX - activeShapeRef.current.x());
      activeShapeRef.current.height(snapY - activeShapeRef.current.y());
    } else if (activeTool === 'circle') {
      const dx = snapX - activeShapeRef.current.x();
      const dy = snapY - activeShapeRef.current.y();
      activeShapeRef.current.radius(Math.sqrt(dx * dx + dy * dy));
    } else if (activeTool === 'triangle') {
      const startX = activeShapeRef.current.attrs._startX ?? activeShapeRef.current.points()[0];
      const startY = activeShapeRef.current.attrs._startY ?? activeShapeRef.current.points()[1];
      if (activeShapeRef.current.attrs._startX === undefined) {
        activeShapeRef.current.setAttr('_startX', startX);
        activeShapeRef.current.setAttr('_startY', startY);
      }
      activeShapeRef.current.points([(startX + snapX) / 2, startY, startX, snapY, snapX, snapY]);
    } else if (activeTool === 'diamond') {
      const startX = activeShapeRef.current.attrs._startX ?? activeShapeRef.current.points()[0];
      const startY = activeShapeRef.current.attrs._startY ?? activeShapeRef.current.points()[1];
      if (activeShapeRef.current.attrs._startX === undefined) {
        activeShapeRef.current.setAttr('_startX', startX);
        activeShapeRef.current.setAttr('_startY', startY);
      }
      const midX = (startX + snapX) / 2;
      const midY = (startY + snapY) / 2;
      activeShapeRef.current.points([midX, startY, snapX, midY, midX, snapY, startX, midY]);
    } else if (activeTool === 'star') {
      const dx = snapX - activeShapeRef.current.x();
      const dy = snapY - activeShapeRef.current.y();
      const radius = Math.sqrt(dx * dx + dy * dy);
      activeShapeRef.current.innerRadius(radius * 0.4);
      activeShapeRef.current.outerRadius(radius);
    }

    drawLayerRef.current?.batchDraw();
  };

  const handlePointerUp = (e: any) => {
    const evt = e.evt as PointerEvent;

    if (evt.pointerId === activePointerIdRef.current) activePointerIdRef.current = null;
    if (evt.pointerType === 'pen')
      setTimeout(() => {
        isStylusActiveRef.current = false;
      }, 200);
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    if (activeTool === 'laser') {
      isLasering.current = false;
      triggerLaserFade();
      onLaserMove?.(null);
      return;
    }

    if (activeTool === 'eraser') {
      isErasing.current = false;
      return;
    }
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (!activeShapeRef.current) return;

    let newElem: CanvasElement | null = null;
    if (
      activeTool === 'pen' ||
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'triangle' ||
      activeTool === 'diamond'
    ) {
      newElem = {
        id: activeShapeIdRef.current,
        type: activeTool === 'pen' ? 'freedraw' : activeTool,
        points: activeShapeRef.current.points(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === 'rect') {
      newElem = {
        id: activeShapeIdRef.current,
        type: 'rect',
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        width: activeShapeRef.current.width(),
        height: activeShapeRef.current.height(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === 'circle') {
      newElem = {
        id: activeShapeIdRef.current,
        type: 'circle',
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        radius: activeShapeRef.current.radius(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === 'star') {
      newElem = {
        id: activeShapeIdRef.current,
        type: 'star',
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        radius: activeShapeRef.current.outerRadius(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    }

    activeShapeRef.current = null;

    if (newElem) {
      if (newElem.type === 'line') {
        const mergedList = tryMergeClosedPolygon(elementsRef.current, newElem);
        if (mergedList) {
          onElementsChange(mergedList);
          return;
        }
      }
      onElementsChange([...elementsRef.current, newElem]);
    }
  };

  const handleElementClick = (el: CanvasElement) => {
    if (activeTool === 'select') {
      setSelectedId(el.id);
      if (el.type === 'text') startTextInlineEditing(el);
    }
  };

  const handleDragEnd = (id: string, e: any) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === id) return { ...el, x: e.target.x(), y: e.target.y() };
      return el;
    });
    onElementsChange(updated);
  };

  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    const updated = elementsRef.current.map((el) => {
      if (el.id === id) {
        if (el.type === 'image') {
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            width: Math.max(20, (el.width || 100) * scaleX),
            height: Math.max(20, (el.height || 100) * scaleY),
          };
        }
        if (el.type === 'text') {
          const newWidth = Math.max(80, (el.width || 550) * scaleX);
          node.scaleX(1);
          node.scaleY(1);
          return { ...el, x: node.x(), y: node.y(), rotation, width: newWidth, scaleX: 1, scaleY: 1 };
        }
        if (el.type === 'rect') {
          const newW = Math.max(5, (el.width || 10) * scaleX);
          const newH = Math.max(5, (el.height || 10) * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          return { ...el, x: node.x(), y: node.y(), rotation, width: newW, height: newH, scaleX: 1, scaleY: 1 };
        }
        if (el.type === 'circle' || el.type === 'star') {
          const newRad = Math.max(5, (el.radius || 10) * Math.max(scaleX, scaleY));
          node.scaleX(1);
          node.scaleY(1);
          return { ...el, x: node.x(), y: node.y(), rotation, radius: newRad, scaleX: 1, scaleY: 1 };
        }
        if (
          el.type === 'freedraw' ||
          el.type === 'line' ||
          el.type === 'arrow' ||
          el.type === 'triangle' ||
          el.type === 'diamond'
        ) {
          const pts = el.points || [];
          const newPoints: number[] = [];
          for (let i = 0; i < pts.length; i += 2) {
            newPoints.push(pts[i] * scaleX, pts[i + 1] * scaleY);
          }
          node.scaleX(1);
          node.scaleY(1);
          return { ...el, x: node.x(), y: node.y(), rotation, points: newPoints, scaleX: 1, scaleY: 1 };
        }
        return { ...el, x: node.x(), y: node.y(), rotation };
      }
      return el;
    });
    onElementsChange(updated);
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative inset-0 overflow-hidden select-none touch-none ${
        activeTool === 'hand'
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'laser'
            ? 'cursor-crosshair active:cursor-none'
            : 'cursor-crosshair'
      }`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@700&display=swap');
      `}</style>

      {contextMenu && (
        <div
          className={`absolute z-[9999] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-xl shadow-xl p-1 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onContextMenu={(e) => e.preventDefault()}>
          <button
            type="button"
            onClick={handlePasteClick}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg ${isDark ? 'text-slate-300' : 'text-slate-700'} transition-colors`}>
            <Clipboard className="size-4" />
            <span>ჩასმა (Paste)</span>
          </button>
        </div>
      )}

      {editingTextId && (
        <div
          style={{
            position: 'absolute',
            top: Math.max(10, editingPos.y - 48),
            left: Math.max(10, editingPos.x),
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
          className="flex flex-col gap-1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>
          <div
            className={`flex items-center gap-1.5 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} p-1 rounded-xl shadow-md border text-xs w-max select-none`}
            onMouseDown={(e) => e.preventDefault()}>
            <span className="text-[11px] font-bold text-slate-500 px-1">ზომა:</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const s = Math.max(12, currentFontSize - 4);
                setCurrentFontSize(s);
                onElementsChange(
                  elementsRef.current.map((el) => (el.id === editingTextId ? { ...el, fontSize: s } : el)),
                );
              }}
              className={`size-6 flex items-center justify-center rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold transition-colors`}>
              -
            </button>
            <span
              className={`font-mono font-bold px-1 min-w-[32px] text-center ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {currentFontSize}px
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const s = Math.min(72, currentFontSize + 4);
                setCurrentFontSize(s);
                onElementsChange(
                  elementsRef.current.map((el) => (el.id === editingTextId ? { ...el, fontSize: s } : el)),
                );
              }}
              className={`size-6 flex items-center justify-center rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold transition-colors`}>
              +
            </button>
            {[18, 24, 32, 40, 48].map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setCurrentFontSize(s);
                  onElementsChange(
                    elementsRef.current.map((el) => (el.id === editingTextId ? { ...el, fontSize: s } : el)),
                  );
                }}
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${currentFontSize === s ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaInputRef}
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onPaste={(e) => {
              e.stopPropagation();
              const pasted = e.clipboardData.getData('text/plain');
              if (pasted) {
                e.preventDefault();
                const cleaned = cleanPastedText(pasted);
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                setEditingTextValue(editingTextValue.substring(0, start) + cleaned + editingTextValue.substring(end));
              }
            }}
            onBlur={finishTextEditing}
            placeholder="ჩაწერეთ ან ჩასვით ტექსტი..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                finishTextEditing();
              }
            }}
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: `${Math.max(14, currentFontSize * (scale || 1))}px`,
              lineHeight: '1.4',
              color: strokeColor === '#1e293b' && isDark ? '#ffffff' : strokeColor,
              width: `${Math.max(300, editingPos.width)}px`,
              minHeight: '85px',
              pointerEvents: 'auto',
              userSelect: 'text',
              touchAction: 'auto',
            }}
            className={`border-2 border-indigo-500 shadow-2xl outline-none p-2.5 resize rounded-xl ${isDark ? 'bg-slate-900/95' : 'bg-white/95'}`}
          />
        </div>
      )}

      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={activeTool === 'hand'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2}>
          <Layer ref={mainLayerRef}>
            {elements.map((el) => {
              const isListening = activeTool === 'select';

              if (el.type === 'image' && el.src) {
                return (
                  <CanvasImageElement
                    key={el.id}
                    el={el}
                    isListening={isListening}
                    activeTool={activeTool}
                    onClick={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'freedraw' && el.points) {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    x={el.x || 0}
                    y={el.y || 0}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    points={el.points}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                    hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
                    perfectDrawEnabled={false}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'line' && el.points) {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    x={el.x || 0}
                    y={el.y || 0}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    points={el.points}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    lineCap="round"
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'arrow' && el.points) {
                return (
                  <Arrow
                    key={el.id}
                    id={el.id}
                    x={el.x || 0}
                    y={el.y || 0}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    points={el.points}
                    stroke={el.stroke}
                    fill={el.stroke}
                    strokeWidth={el.strokeWidth}
                    pointerLength={Math.max(8, strokeWidth * 3)}
                    pointerWidth={Math.max(8, strokeWidth * 3)}
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'rect') {
                return (
                  <Rect
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={24}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'circle') {
                return (
                  <Circle
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    radius={el.radius || 10}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={24}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'triangle' && el.points) {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    x={el.x || 0}
                    y={el.y || 0}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    points={el.points}
                    closed={true}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    lineJoin="round"
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={24}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'diamond' && el.points) {
                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    x={el.x || 0}
                    y={el.y || 0}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    points={el.points}
                    closed={true}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    lineJoin="round"
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={24}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'star') {
                return (
                  <Star
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    numPoints={5}
                    innerRadius={(el.radius || 30) * 0.4}
                    outerRadius={el.radius || 30}
                    rotation={el.rotation || 0}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    perfectDrawEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={24}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === 'text') {
                return (
                  <Text
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width || 550}
                    wrap="word"
                    text={el.text || ''}
                    fontSize={el.fontSize || 24}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    rotation={el.rotation || 0}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontStyle="bold"
                    lineHeight={1.4}
                    fill={el.stroke}
                    visible={editingTextId !== el.id}
                    listening={isListening}
                    draggable={activeTool === 'select'}
                    onClick={() => handleElementClick(el)}
                    onTap={() => handleElementClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              return null;
            })}

            {activeTool === 'select' && (
              <Transformer
                ref={trRef}
                enabledAnchors={
                  selectedElement?.type === 'text'
                    ? ['middle-left', 'middle-right']
                    : [
                        'top-left',
                        'top-center',
                        'top-right',
                        'middle-left',
                        'middle-right',
                        'bottom-left',
                        'bottom-center',
                        'bottom-right',
                      ]
                }
                centeredScaling={false}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (selectedElement?.type === 'text' && newBox.width < 100) return oldBox;
                  if (selectedElement?.type !== 'text' && (newBox.width < 5 || newBox.height < 15)) return oldBox;
                  return newBox;
                }}
              />
            )}

            {activeTool === 'select' &&
              selectedElement &&
              selectedElement.points &&
              selectedElement.type !== 'freedraw' && (
                <Group
                  x={selectedElement.x || 0}
                  y={selectedElement.y || 0}
                  rotation={selectedElement.rotation || 0}
                  scaleX={selectedElement.scaleX || 1}
                  scaleY={selectedElement.scaleY || 1}>
                  {Array.from({ length: selectedElement.points.length / 2 }).map((_, i) => (
                    <Circle
                      key={`anchor-${selectedElement.id}-${i}`}
                      x={selectedElement.points![i * 2]}
                      y={selectedElement.points![i * 2 + 1]}
                      radius={8}
                      fill="#16233a"
                      stroke="#ffffff"
                      strokeWidth={2}
                      draggable
                      onMouseDown={(e) => {
                        e.cancelBubble = true;
                      }}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const newPoints = [...selectedElement.points!];
                        newPoints[i * 2] = e.target.x();
                        newPoints[i * 2 + 1] = e.target.y();
                        const updatedElements = elementsRef.current.map((el) =>
                          el.id === selectedElement.id ? { ...el, points: newPoints } : el,
                        );
                        elementsRef.current = updatedElements;
                        onElementsChange(updatedElements);
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                      }}
                      onMouseEnter={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'crosshair';
                      }}
                      onMouseLeave={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'default';
                      }}
                    />
                  ))}
                </Group>
              )}
          </Layer>
          <Layer ref={drawLayerRef} />
          <Layer ref={laserLayerRef} listening={false} />
        </Stage>
      )}
    </div>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';
export default KonvaCanvas;
