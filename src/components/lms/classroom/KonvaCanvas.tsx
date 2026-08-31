"use client";

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import Konva from "konva";
import { Stage, Layer, Line, Circle, Rect, Arrow, Star, Text, Transformer, Group, Image as KonvaImage } from "react-konva";

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
}

interface LaserPoint {
  x: number;
  y: number;
}

function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
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

// 🌟 ხაზების ჯაჭვისგან შეკრული მრავალკუთხედის ამოცნობა და გაერთიანება
function tryMergeClosedPolygon(allElements: CanvasElement[], newLine: CanvasElement): CanvasElement[] | null {
  if (newLine.type !== "line" || !newLine.points || newLine.points.length !== 4) return null;

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

  const lineElements = allElements.filter((el) => el.type === "line" && el.points && el.points.length === 4);
  const segments: Segment[] = [...lineElements, newLine].map((el) => ({
    el,
    ...getAbsEnds(el),
  }));

  const EPSILON = 18; // მიწებების მანძილი
  const isClose = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= EPSILON;

  const used = new Set<string>();
  const currentPath: { pt: { x: number; y: number }; seg: Segment }[] = [];

  const lastSeg = segments[segments.length - 1]; // ახალი ხაზი

  function findCycle(currentPoint: { x: number; y: number }, startPoint: { x: number; y: number }, depth: number): boolean {
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
      type: "triangle", // Konva იყენებს დახურულ Line-ს closed: true
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
      draggable={activeTool === "select"}
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
    textPlaceholder = "დააჭირეთ ორჯერ ჩასასწორებლად",
  },
  ref
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingPos, setEditingPos] = useState<{ x: number; y: number; fontSize: number }>({
    x: 0,
    y: 0,
    fontSize: 32,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const laserLayerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<any>(null);

  const isDrawing = useRef(false);
  const isErasing = useRef(false);
  const isLasering = useRef(false);
  const activeShapeRef = useRef<any>(null);
  const activeShapeIdRef = useRef<string>("");
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;

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
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
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
          fill: "#ff0022",
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
    [renderLaserFrame]
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
    [renderLaserFrame]
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
    [startLaserDrawing, addLaserPoint, triggerLaserFade]
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

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

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
    setStagePos({
      x: -minX * scale + padding * scale,
      y: -minY * scale + padding * scale,
    });
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
        fill: isDark ? "#020617" : "#ffffff",
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editingTextId) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;

      if (newWidth > 0 && newHeight > 0) {
        setStageSize({ width: newWidth, height: newHeight });
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
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
      const selectedNode = stageRef.current.findOne("#" + selectedId);
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

  const eraseAtPosition = useCallback((pos: { x: number; y: number }) => {
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
        if (pts.length === 2) {
          const x1 = ox + pts[0];
          const y1 = oy + pts[1];
          if ((pos.x - x1) ** 2 + (pos.y - y1) ** 2 <= thresholdSq) {
            hasChanges = true;
            return false;
          }
        }
      }

      if (el.type === "circle" && el.x !== undefined && el.y !== undefined) {
        const rad = el.radius || 10;
        const distToCenter = Math.hypot(pos.x - el.x, pos.y - el.y);
        if (Math.abs(distToCenter - rad) <= threshold || distToCenter <= rad) {
          hasChanges = true;
          return false;
        }
      }

      if (
        (el.type === "rect" ||
          el.type === "text" ||
          el.type === "triangle" ||
          el.type === "diamond" ||
          el.type === "star" ||
          el.type === "image") &&
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
  }, [onElementsChange, selectedId]);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isErasing.current = false;
      if (isLasering.current) {
        isLasering.current = false;
        triggerLaserFade();
        onLaserMove?.(null);
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [triggerLaserFade, onLaserMove]);

  const handlePointerDown = (e: any) => {
    if (isPinching.current) return;
    if (editingTextId) finishTextEditing();
    if (activeTool === "hand") return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === "laser") {
      isLasering.current = true;
      startLaserDrawing(pos);
      onLaserMove?.(pos);
      return;
    }

    if (activeTool === "eraser") {
      isErasing.current = true;
      eraseAtPosition(pos);
      return;
    }

    if (activeTool === "select") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) setSelectedId(null);
      return;
    }

    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (activeTool === "text") {
      const newElem: CanvasElement = {
        id,
        type: "text",
        x: pos.x,
        y: pos.y,
        text: textPlaceholder,
        fontSize: 36,
        scaleX: 1,
        scaleY: 1,
        stroke: strokeColor,
        strokeWidth: 1,
      };
      onElementsChange([...elementsRef.current, newElem]);
      setSelectedId(id);
      return;
    }

    let startX = pos.x;
    let startY = pos.y;

    // 🌟 Snap სხვა ფიგურების წვეროებთან
    if (activeTool === "line" || activeTool === "arrow" || activeTool === "triangle" || activeTool === "diamond") {
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

    if (activeTool === "pen") {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX + 0.1, startY + 0.1],
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineCap: "round",
        lineJoin: "round",
        tension: 0.4,
      });
    } else if (activeTool === "line") {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY],
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineCap: "round",
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === "arrow") {
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
    } else if (activeTool === "rect") {
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
    } else if (activeTool === "circle") {
      activeShapeRef.current = new Konva.Circle({
        x: startX,
        y: startY,
        radius: 1,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === "triangle") {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY, startX, startY],
        closed: true,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineJoin: "round",
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === "diamond") {
      activeShapeRef.current = new Konva.Line({
        points: [startX, startY, startX, startY, startX, startY, startX, startY],
        closed: true,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineJoin: "round",
        perfectDrawEnabled: false,
        strokeScaleEnabled: false,
      });
    } else if (activeTool === "star") {
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
    if (isPinching.current) return;

    const stage = stageRef.current;
    if (!stage) return;
    const transform = stage.getAbsoluteTransform().copy().invert();

    const nativeEvt = e.evt;
    const events = (nativeEvt.getCoalescedEvents ? nativeEvt.getCoalescedEvents() : [nativeEvt]) as PointerEvent[];

    if (activeTool === "laser") {
      if (isLasering.current || nativeEvt.buttons === 1) {
        for (let i = 0; i < events.length; i++) {
          const clientPos = { x: events[i].clientX, y: events[i].clientY };
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const relPos = transform.point({
              x: clientPos.x - rect.left,
              y: clientPos.y - rect.top,
            });
            addLaserPoint(relPos);
            if (i === events.length - 1) onLaserMove?.(relPos);
          }
        }
      }
      return;
    }

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === "eraser" && (isErasing.current || nativeEvt.buttons === 1)) {
      eraseAtPosition(pos);
      return;
    }

    if (!isDrawing.current || !activeShapeRef.current) return;

    let snapX = pos.x;
    let snapY = pos.y;

    // 🌟 Snap ბოლო წერტილისთვის
    if (activeTool === "line" || activeTool === "arrow" || activeTool === "triangle" || activeTool === "diamond") {
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

    if (activeTool === "pen") {
      const currentPts = activeShapeRef.current.points();
      const len = currentPts.length;
      const lastX = currentPts[len - 2];
      const lastY = currentPts[len - 1];

      if (Math.hypot(pos.x - lastX, pos.y - lastY) >= 1.5) {
        activeShapeRef.current.points(currentPts.concat([pos.x, pos.y]));
      }
    } else if (activeTool === "line" || activeTool === "arrow") {
      const points = activeShapeRef.current.points();
      activeShapeRef.current.points([points[0], points[1], snapX, snapY]);
    } else if (activeTool === "rect") {
      activeShapeRef.current.width(snapX - activeShapeRef.current.x());
      activeShapeRef.current.height(snapY - activeShapeRef.current.y());
    } else if (activeTool === "circle") {
      const dx = snapX - activeShapeRef.current.x();
      const dy = snapY - activeShapeRef.current.y();
      activeShapeRef.current.radius(Math.sqrt(dx * dx + dy * dy));
    } else if (activeTool === "triangle") {
      const startX = activeShapeRef.current.attrs._startX ?? activeShapeRef.current.points()[0];
      const startY = activeShapeRef.current.attrs._startY ?? activeShapeRef.current.points()[1];
      if (activeShapeRef.current.attrs._startX === undefined) {
        activeShapeRef.current.setAttr("_startX", startX);
        activeShapeRef.current.setAttr("_startY", startY);
      }
      const topX = (startX + snapX) / 2;
      const topY = startY;
      const leftX = startX;
      const leftY = snapY;
      const rightX = snapX;
      const rightY = snapY;
      activeShapeRef.current.points([topX, topY, leftX, leftY, rightX, rightY]);
    } else if (activeTool === "diamond") {
      const startX = activeShapeRef.current.attrs._startX ?? activeShapeRef.current.points()[0];
      const startY = activeShapeRef.current.attrs._startY ?? activeShapeRef.current.points()[1];
      if (activeShapeRef.current.attrs._startX === undefined) {
        activeShapeRef.current.setAttr("_startX", startX);
        activeShapeRef.current.setAttr("_startY", startY);
      }
      const midX = (startX + snapX) / 2;
      const midY = (startY + snapY) / 2;
      activeShapeRef.current.points([midX, startY, snapX, midY, midX, snapY, startX, midY]);
    } else if (activeTool === "star") {
      const dx = snapX - activeShapeRef.current.x();
      const dy = snapY - activeShapeRef.current.y();
      const radius = Math.sqrt(dx * dx + dy * dy);
      activeShapeRef.current.innerRadius(radius * 0.4);
      activeShapeRef.current.outerRadius(radius);
    }

    drawLayerRef.current?.batchDraw();
  };

  const handlePointerUp = () => {
    if (activeTool === "laser") {
      isLasering.current = false;
      triggerLaserFade();
      onLaserMove?.(null);
      return;
    }

    if (activeTool === "eraser") {
      isErasing.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (!activeShapeRef.current) return;

    let newElem: CanvasElement | null = null;

    if (activeTool === "pen" || activeTool === "line" || activeTool === "arrow" || activeTool === "triangle" || activeTool === "diamond") {
      newElem = {
        id: activeShapeIdRef.current,
        type: activeTool === "pen" ? "freedraw" : activeTool,
        points: activeShapeRef.current.points(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === "rect") {
      newElem = {
        id: activeShapeIdRef.current,
        type: "rect",
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        width: activeShapeRef.current.width(),
        height: activeShapeRef.current.height(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === "circle") {
      newElem = {
        id: activeShapeIdRef.current,
        type: "circle",
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        radius: activeShapeRef.current.radius(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    } else if (activeTool === "star") {
      newElem = {
        id: activeShapeIdRef.current,
        type: "star",
        x: activeShapeRef.current.x(),
        y: activeShapeRef.current.y(),
        radius: activeShapeRef.current.outerRadius(),
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      };
    }

    activeShapeRef.current = null;

    if (newElem) {
      // 🌟 თუ ახალი ხაზით შეიკრა მრავალკუთხედი (სამკუთხედი, ოთხკუთხედი და ა.შ.), გაერთიანდეს ერთიან ფიგურად
      if (newElem.type === "line") {
        const mergedList = tryMergeClosedPolygon(elementsRef.current, newElem);
        if (mergedList) {
          onElementsChange(mergedList);
          return;
        }
      }

      onElementsChange([...elementsRef.current, newElem]);
    }
  };

  const handleElementClick = (id: string) => {
    if (activeTool === "select") {
      setSelectedId(id);
    }
  };

  const handleTextDblClick = (el: CanvasElement) => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageScale = scale || 1;

    setEditingTextId(el.id);
    setEditingTextValue(el.text || "");
    const effectiveFontSize = (el.fontSize || 36) * (el.scaleX || 1) * stageScale;

    setEditingPos({
      x: (el.x || 50) * stageScale + stagePos.x,
      y: (el.y || 50) * stageScale + stagePos.y,
      fontSize: effectiveFontSize,
    });
  };

  const finishTextEditing = () => {
    if (!editingTextId) return;
    const updated = elementsRef.current.map((el) =>
      el.id === editingTextId ? { ...el, text: editingTextValue } : el
    );
    onElementsChange(updated);
    setEditingTextId(null);
  };

  const handleDragEnd = (id: string, e: any) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === id) {
        return {
          ...el,
          x: e.target.x(),
          y: e.target.y(),
        };
      }
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
        if (el.type === "image") {
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

        if (el.type === "text") {
          const currentFont = el.fontSize || 36;
          const newFontSize = Math.max(12, Math.round(currentFont * Math.max(scaleX, scaleY)));
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            fontSize: newFontSize,
            scaleX: 1,
            scaleY: 1,
          };
        }

        if (el.type === "rect") {
          const newW = Math.max(5, (el.width || 10) * scaleX);
          const newH = Math.max(5, (el.height || 10) * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            width: newW,
            height: newH,
            scaleX: 1,
            scaleY: 1,
          };
        }

        if (el.type === "circle") {
          const newRad = Math.max(5, (el.radius || 10) * Math.max(scaleX, scaleY));
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            radius: newRad,
            scaleX: 1,
            scaleY: 1,
          };
        }

        if (el.type === "star") {
          const newRad = Math.max(5, (el.radius || 10) * Math.max(scaleX, scaleY));
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            radius: newRad,
            scaleX: 1,
            scaleY: 1,
          };
        }

        if (el.type === "freedraw" || el.type === "line" || el.type === "arrow" || el.type === "triangle" || el.type === "diamond") {
          const pts = el.points || [];
          const newPoints: number[] = [];
          for (let i = 0; i < pts.length; i += 2) {
            newPoints.push(pts[i] * scaleX, pts[i + 1] * scaleY);
          }
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation,
            points: newPoints,
            scaleX: 1,
            scaleY: 1,
          };
        }

        return {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation,
        };
      }
      return el;
    });

    onElementsChange(updated);
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative touch-none select-none inset-0 overflow-hidden ${
        activeTool === "hand"
          ? "cursor-grab active:cursor-grabbing"
          : activeTool === "laser"
          ? "cursor-crosshair active:cursor-none"
          : "cursor-crosshair"
      }`}
      style={{ touchAction: "none" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@700&display=swap');
      `}</style>

      {editingTextId && (
        <textarea
          autoFocus
          value={editingTextValue}
          onChange={(e) => setEditingTextValue(e.target.value)}
          onBlur={finishTextEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              finishTextEditing();
            }
          }}
          style={{
            position: "absolute",
            top: editingPos.y,
            left: editingPos.x,
            fontFamily: "'Caveat', 'Kalam', cursive, sans-serif",
            fontSize: `${editingPos.fontSize}px`,
            lineHeight: "1.2",
            color: strokeColor,
            zIndex: 1000,
          }}
          className="bg-transparent border border-dashed border-navy outline-none p-1 resize rounded min-w-[200px]"
        />
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
          draggable={activeTool === "hand"}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          pixelRatio={typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2}
        >
          <Layer ref={mainLayerRef}>
            {elements.map((el) => {
              const isListening = activeTool === "select";

              if (el.type === "image" && el.src) {
                return (
                  <CanvasImageElement
                    key={el.id}
                    el={el}
                    isListening={isListening}
                    activeTool={activeTool}
                    onClick={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }

              if (el.type === "freedraw" && el.points) {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "line" && el.points) {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "arrow" && el.points) {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "rect") {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "circle") {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "triangle" && el.points) {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "diamond" && el.points) {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "star") {
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
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <Text
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    text={el.text || ""}
                    fontSize={el.fontSize || 36}
                    scaleX={el.scaleX || 1}
                    scaleY={el.scaleY || 1}
                    rotation={el.rotation || 0}
                    fontFamily="'Caveat', 'Kalam', cursive, sans-serif"
                    fontStyle="bold"
                    lineHeight={1.2}
                    fill={el.stroke}
                    visible={editingTextId !== el.id}
                    listening={isListening}
                    draggable={activeTool === "select"}
                    onClick={() => handleElementClick(el.id)}
                    onTap={() => handleElementClick(el.id)}
                    onDblClick={() => handleTextDblClick(el)}
                    onDblTap={() => handleTextDblClick(el)}
                    onDragEnd={(e) => handleDragEnd(el.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                  />
                );
              }
              return null;
            })}

            {activeTool === "select" && (
              <Transformer
                ref={trRef}
                enabledAnchors={[
                  "top-left",
                  "top-center",
                  "top-right",
                  "middle-left",
                  "middle-right",
                  "bottom-left",
                  "bottom-center",
                  "bottom-right",
                ]}
                centeredScaling={false}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 15) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}

            {/* წვეროების გადაადგილების წერტილები (Anchor Points) */}
            {activeTool === "select" && selectedElement && selectedElement.points && selectedElement.type !== "freedraw" && (
              <Group
                x={selectedElement.x || 0}
                y={selectedElement.y || 0}
                rotation={selectedElement.rotation || 0}
                scaleX={selectedElement.scaleX || 1}
                scaleY={selectedElement.scaleY || 1}
              >
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
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const newPoints = [...selectedElement.points!];
                      newPoints[i * 2] = e.target.x();
                      newPoints[i * 2 + 1] = e.target.y();
                      const updatedElements = elementsRef.current.map((el) =>
                        el.id === selectedElement.id ? { ...el, points: newPoints } : el
                      );
                      elementsRef.current = updatedElements;
                      onElementsChange(updatedElements);
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "crosshair";
                    }}
                    onMouseLeave={(e) => {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "default";
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

export default KonvaCanvas;