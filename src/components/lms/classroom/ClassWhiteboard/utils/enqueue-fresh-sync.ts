import type { MutableRefObject } from 'react';
import { assignedFullSyncPayload, sharedFullSyncPayload } from '@/lib/livekit/board-assignment';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { PublishDataSafe, PublishResult } from '../hooks/usePublishDataSafe';

export async function enqueueFreshFullSync(
  publish: PublishDataSafe,
  pagesRef: MutableRefObject<CanvasElement[][]>,
  currentPageIndexRef: MutableRefObject<number>,
  destinationIdentities: string[] | undefined,
  assignedPageIndex: number | null | undefined,
  noteSnapshotSent: (pages: CanvasElement[][], assignedPageIndex?: number | null) => void,
): Promise<PublishResult> {
  let captured: CanvasElement[][] = [];
  const result = await publish(() => {
    const pages = pagesRef.current.map((page) => page);
    captured = pages;
    if (typeof assignedPageIndex === 'number') return assignedFullSyncPayload(pages, assignedPageIndex);
    return sharedFullSyncPayload(pages, currentPageIndexRef.current);
  }, true, destinationIdentities);
  if (result.ok) noteSnapshotSent(captured, assignedPageIndex);
  return result;
}
