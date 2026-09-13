import { useCallback, useRef } from 'react';
import Konva from 'konva';
import type { LaserPoint } from '../utils/types';

export function useLaser() {
  const laserLayerRef = useRef<Konva.Layer>(null);
  const laserStrokesRef = useRef<LaserPoint[][]>([]);
  const laserReleaseTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isLasering = useRef(false);

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

  return {
    laserLayerRef,
    isLasering,
    startLaserDrawing,
    addLaserPoint,
    triggerLaserFade,
    renderRemoteLaser,
  };
}