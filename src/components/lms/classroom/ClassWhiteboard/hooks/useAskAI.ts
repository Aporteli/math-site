'use client';

import { useCallback, useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import type { CanvasElement, KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { loadAiModelStatusAction } from '@/lib/math/problems/actions';
import type { AiModelId, AiModelStatus } from '@/lib/math/problems';
import { DEFAULT_AI_MODEL } from '../constants/aiCopy';
import { renderElementsToDataUrl } from '../utils/renderElementsToDataUrl';

interface Options {
  isTeacher: boolean;
  isDark: boolean;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
}

export function useAskAI({ isTeacher, isDark, pagesRef, currentPageIndexRef, canvasRef }: Options) {
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
    return () => { cancelled = true; };
  }, [isTeacher]);

  const handleAskAIAboutBoard = useCallback((selectedPages: number[], currentPageIndex: number) => {
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
      if (rendered) imagesToPass.push(rendered);
    }

    setAiInitialImages(imagesToPass);
    setIsAiModalOpen(true);
  }, [pagesRef, currentPageIndexRef, canvasRef, isDark]);

  return {
    isAiModalOpen, setIsAiModalOpen,
    aiModel, setAiModel,
    aiModelStatus,
    aiInitialImages, setAiInitialImages,
    handleAskAIAboutBoard,
  };
}