'use client';

import { useRef } from 'react';
import type { KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { ChunkAssembler } from '../utils/chunk';

export function useWhiteboardRefs() {
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

  return {
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
    chunkAssemblerRef,
  };
}
