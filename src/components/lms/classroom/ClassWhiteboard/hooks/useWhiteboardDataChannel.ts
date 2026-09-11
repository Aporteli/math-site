'use client';

import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import type { CanvasElement, KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { ChunkAssembler } from '../utils/chunk';
import { adaptElementsForTheme } from '../utils/theme';
import type { HistoryMap } from '../utils/types';

interface Options {
  room: Room | null;
  isDark: boolean;
  updateUndoRedoState: () => void;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  historyMapRef: MutableRefObject<HistoryMap>;
  isRemoteUpdateRef: MutableRefObject<boolean>;
  chunkAssemblerRef: MutableRefObject<ChunkAssembler>;
  setPages: (pages: CanvasElement[][]) => void;
  setCurrentPageIndex: (idx: number) => void;
}

export function useWhiteboardDataChannel(opts: Options) {
  const {
    room, isDark, updateUndoRedoState, canvasRef,
    pagesRef, currentPageIndexRef, historyMapRef,
    isRemoteUpdateRef, chunkAssemblerRef,
    setPages, setCurrentPageIndex,
  } = opts;

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const fullPayload = chunkAssemblerRef.current.push(payload);
        if (!fullPayload) return;

        const data = JSON.parse(new TextDecoder().decode(fullPayload));

        if (data.type === 'WHITEBOARD_FULL_SYNC') {
          if (Array.isArray(data.pages)) {
            const newPages = (data.pages as CanvasElement[][]).map((page) =>
              adaptElementsForTheme(page || [], isDark),
            );
            const newPageIndex = data.currentPageIndex ?? 0;
            historyMapRef.current = new Map();
            newPages.forEach((p, idx) => {
              historyMapRef.current.set(idx, { states: [p || []], index: 0 });
            });
            setPages(newPages);
            pagesRef.current = newPages;
            setCurrentPageIndex(newPageIndex);
            updateUndoRedoState();
            return;
          }
          return;
        }

        if (data.type === 'WHITEBOARD_SYNC' && Array.isArray(data.elements)) {
          isRemoteUpdateRef.current = true;
          const adaptedElements = adaptElementsForTheme(data.elements, isDark);
          const updated = [...pagesRef.current];
          updated[data.pageIndex] = adaptedElements;
          setPages(updated);
          pagesRef.current = updated;

          const pHist = historyMapRef.current.get(data.pageIndex) || { states: [], index: -1 };
          pHist.states.push(adaptedElements);
          pHist.index = pHist.states.length - 1;
          historyMapRef.current.set(data.pageIndex, pHist);
          updateUndoRedoState();

          setTimeout(() => { isRemoteUpdateRef.current = false; }, 30);
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
  }, [
    room, updateUndoRedoState, isDark, canvasRef,
    pagesRef, currentPageIndexRef, historyMapRef,
    isRemoteUpdateRef, chunkAssemblerRef, setPages, setCurrentPageIndex,
  ]);
}