'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { PREFS_KEY } from './constants';
import { capHistory, stringifyPages } from './pageHistory';
import { applyBoardDelta, diffBoard, type BoardDelta } from '@/lib/teacher-board/delta';
import type { CanvasElement } from '@/components/lms/classroom/KonvaCanvas/utils/types';
import type { WhiteboardState } from './useWhiteboardState';
import type { WhiteboardPersistence } from './useWhiteboardPersistence';

export function useWhiteboardSync(boardState: WhiteboardState, persistence: WhiteboardPersistence) {
  const {
    canvasRef,
    setPages,
    setCurrentPageIndex,
    isHydratedRef,
    clientIdRef,
    revisionRef,
    applyingRemoteRef,
    editEpochRef,
    pushTimerRef,
    pushSendingRef,
    pushQueuedRef,
    liveStrokeRef,
    inkTimerRef,
    inkSendingRef,
    inkQueuedRef,
    inkAbortRef,
    inkSeqRef,
    inkSentCountRef,
    remoteInkRef,
    remoteInkFloorRef,
    remoteStoreTimerRef,
    schedulePushRef,
    scheduleLocalPagesSaveRef,
    lastLaserSentRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    updateUndoRedoState,
  } = { ...boardState, ...persistence };

  // --- Refs local to the sync layer ---
  const pushInkSeqRef = useRef(0);
  const syncedPagesRef = useRef<CanvasElement[][] | null>(null);
  const syncedIndexRef = useRef(0);
  const appliedRevisionsRef = useRef(new Set<number>());
  const elementRevisionRef = useRef(new Map<string, number>());
  const structureRevisionRef = useRef(0);

  // --- Delta construction ---
  // Computes the delta between what the server last confirmed and the current
  // local state.  Returns null if there is nothing new to send.
  const buildDelta = useCallback(
    (): { body: string; delta: BoardDelta<CanvasElement>; inkSeq: number; clientId: string } | null => {
      const pages = pagesRef.current;
      const base = syncedPagesRef.current ?? [];
      const changes = diffBoard(base, pages);
      const pageIndex = currentPageIndexRef.current;
      if (
        changes.length === 0 &&
        pages.length === base.length &&
        pageIndex === syncedIndexRef.current &&
        syncedPagesRef.current
      ) {
        return null;
      }
      const delta: BoardDelta<CanvasElement> = {
        pageCount: Math.max(1, pages.length),
        currentPageIndex: pageIndex,
        changes,
      };
      const inkSeq = pushInkSeqRef.current;
      const clientId = clientIdRef.current;
      const body = JSON.stringify({
        type: 'delta',
        clientId,
        inkSeq,
        pageCount: delta.pageCount,
        currentPageIndex: delta.currentPageIndex,
        changes: delta.changes,
      });
      return { body, delta, inkSeq, clientId };
    },
    [pagesRef, currentPageIndexRef, clientIdRef, syncedPagesRef, syncedIndexRef, pushInkSeqRef],
  );

  // --- Full-board push (debounced, 200 ms) ---
  // After pointer-up each stroke schedules a push.  The 200 ms debounce
  // coalesces rapid undo/redo.  buildDelta is called lazily inside the timer
  // so it sees the most-recent local state.
  const schedulePush = useCallback(() => {
    if (!isHydratedRef.current || applyingRemoteRef.current) return;
    editEpochRef.current += 1;
    inkSeqRef.current += 1;
    inkSentCountRef.current = 0;
    liveStrokeRef.current = null;
    inkQueuedRef.current = false;
    if (inkTimerRef.current != null) {
      window.clearTimeout(inkTimerRef.current);
      inkTimerRef.current = null;
    }
    inkAbortRef.current?.abort();
    pushInkSeqRef.current = inkSeqRef.current;
    if (pushTimerRef.current != null) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      const send = () => {
        const built = buildDelta();
        if (!built) {
          pushQueuedRef.current = false;
          return;
        }
        if (pushSendingRef.current) {
          pushQueuedRef.current = true;
          return;
        }
        pushSendingRef.current = true;
        pushQueuedRef.current = false;
        const controller = new AbortController();
        const killer = window.setTimeout(() => controller.abort(), 20000);
        const { body: payload, delta: sentDelta, inkSeq: requestInkSeq, clientId } = built;
        const sentBaseLength = syncedPagesRef.current?.length ?? 0;
        const startedAt = performance.now();
        let outcome: 'ok' | 'non-ok' | 'error' | 'timeout' = 'error';
        console.log('[TB-DIAG-SEND]', {
          t: startedAt,
          inkSeq: requestInkSeq,
          clientId,
          payloadLength: payload.length,
        });
        const finish = (res: Response) => {
          outcome = 'ok';
          return res.json() as Promise<{ revision?: number }>;
        };
        void fetch('/api/teacher-board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        })
          .then(async (res) => {
            if (res.status === 400) {
              // Delta was rejected (cold start, schema mismatch): fall back to
              // a full-board POST so the server can rebuild from scratch.
              const pages = pagesRef.current;
              const full = `{"pages":${stringifyPages(pages)},"currentPageIndex":${currentPageIndexRef.current},"clientId":${JSON.stringify(clientId)},"inkSeq":${requestInkSeq}}`;
              const retry = await fetch('/api/teacher-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: full,
                signal: controller.signal,
              });
              if (!retry.ok) {
                outcome = 'non-ok';
                return;
              }
              return finish(retry);
            }
            if (!res.ok) {
              outcome = 'non-ok';
              return;
            }
            return finish(res);
          })
          .then((data) => {
            if (!data) return;
            if (typeof data.revision === 'number') {
              revisionRef.current = Math.max(revisionRef.current, data.revision);
              appliedRevisionsRef.current.add(data.revision);
            }
            // Update the synced baseline so the next buildDelta only includes
            // changes made *after* this send.  We do this regardless of whether
            // a newer SSE revision has already been recorded; the merge is
            // additive and correctness is maintained by element-id deduplication
            // inside applyBoardDelta.
            const base = syncedPagesRef.current ?? [];
            const pageCount =
              base.length > sentBaseLength
                ? Math.max(sentDelta.pageCount, base.length)
                : sentDelta.pageCount;
            syncedPagesRef.current = applyBoardDelta(base, { ...sentDelta, pageCount });
            syncedIndexRef.current = Math.min(
              sentDelta.currentPageIndex,
              Math.max(0, pageCount - 1),
            );
            scheduleLocalPagesSaveRef.current();
          })
          .catch(() => {
            outcome = controller.signal.aborted ? 'timeout' : 'error';
          })
          .finally(() => {
            const endedAt = performance.now();
            console.log('[TB-DIAG-SEND-END]', {
              t: endedAt,
              inkSeq: requestInkSeq,
              elapsedMs: endedAt - startedAt,
              outcome,
            });
            window.clearTimeout(killer);
            pushSendingRef.current = false;
            if (pushQueuedRef.current) send();
          });
      };
      send();
    }, 200);
  }, [
    buildDelta,
    applyingRemoteRef,
    currentPageIndexRef,
    editEpochRef,
    inkAbortRef,
    inkQueuedRef,
    inkSentCountRef,
    inkSeqRef,
    inkTimerRef,
    isHydratedRef,
    liveStrokeRef,
    pagesRef,
    pushInkSeqRef,
    pushQueuedRef,
    pushSendingRef,
    pushTimerRef,
    revisionRef,
    scheduleLocalPagesSaveRef,
    appliedRevisionsRef,
    syncedPagesRef,
    syncedIndexRef,
  ]);

  // Assign the stable ref after each render so history/commands always hold
  // the latest closure without needing to pass schedulePush as a prop.
  // useLayoutEffect keeps the assignment out of the render phase.
  useLayoutEffect(() => {
    schedulePushRef.current = schedulePush;
  }, [schedulePush, schedulePushRef]);

  // Flush any pending push on page unload.
  useEffect(() => {
    const flush = () => {
      if (!isHydratedRef.current) return;
      const pending = pushTimerRef.current != null || pushQueuedRef.current;
      if (!pending) return;
      if (pushTimerRef.current != null) {
        window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
      pushQueuedRef.current = false;
      const built = buildDelta();
      if (!built) return;
      void fetch('/api/teacher-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: built.body,
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [buildDelta, isHydratedRef, pushQueuedRef, pushTimerRef]);

  // --- Live-ink preview (during drawing, not committed) ---
  const handleLiveStroke = useCallback(
    (stroke: { points: number[]; color: string; width: number }) => {
      liveStrokeRef.current = stroke;
      if (inkTimerRef.current != null) return;
      inkTimerRef.current = window.setTimeout(() => {
        inkTimerRef.current = null;
        const send = () => {
          const current = liveStrokeRef.current;
          if (!current || current.points.length < 4) return;
          const base = Math.min(inkSentCountRef.current, current.points.length);
          if (current.points.length - base < 2) return;
          if (inkSendingRef.current) {
            inkQueuedRef.current = true;
            return;
          }
          const points = current.points.slice(base);
          const seq = inkSeqRef.current;
          inkSendingRef.current = true;
          inkQueuedRef.current = false;
          inkSentCountRef.current = base + points.length;
          const controller = new AbortController();
          inkAbortRef.current = controller;
          const killer = window.setTimeout(() => controller.abort(), 2500);
          const rewind = () => {
            if (inkSeqRef.current !== seq) return;
            if (inkSentCountRef.current > base) inkSentCountRef.current = base;
          };
          void fetch('/api/teacher-board', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              type: 'ink',
              points,
              base,
              stroke: current.color,
              strokeWidth: current.width,
              pageIndex: currentPageIndexRef.current,
              clientId: clientIdRef.current,
              inkSeq: seq,
            }),
          })
            .then((res) => {
              if (!res.ok) rewind();
            })
            .catch(() => {
              rewind();
            })
            .finally(() => {
              window.clearTimeout(killer);
              if (inkAbortRef.current !== controller) return;
              inkAbortRef.current = null;
              inkSendingRef.current = false;
              if (inkSeqRef.current !== seq) return;
              if (inkQueuedRef.current) {
                inkQueuedRef.current = false;
                send();
                return;
              }
              const pending = liveStrokeRef.current;
              if (
                pending &&
                pending.points.length - inkSentCountRef.current >= 2 &&
                inkTimerRef.current == null
              ) {
                inkTimerRef.current = window.setTimeout(() => {
                  inkTimerRef.current = null;
                  send();
                }, 30);
              }
            });
        };
        send();
      }, 30);
    },
    [
      liveStrokeRef,
      inkTimerRef,
      inkSentCountRef,
      inkSendingRef,
      inkQueuedRef,
      inkAbortRef,
      inkSeqRef,
      currentPageIndexRef,
      clientIdRef,
    ],
  );

  const handleLaserMove = useCallback(
    (pos: { x: number; y: number } | null) => {
      const now = Date.now();
      if (pos && now - lastLaserSentRef.current <= 35) return;
      lastLaserSentRef.current = now;
      void fetch('/api/teacher-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'laser',
          point: pos,
          pageIndex: currentPageIndexRef.current,
          clientId: clientIdRef.current,
        }),
      }).catch(() => {});
    },
    [lastLaserSentRef, currentPageIndexRef, clientIdRef],
  );

  // --- Remote delta apply ---
  // Merges a delta from another browser into the local pages and local history
  // so that undo/redo on this browser does not accidentally delete the remote
  // browser's strokes.
  const applyRemoteDelta = useCallback(
    (delta: BoardDelta<CanvasElement> & { revision: number }) => {
      // De-duplicate: skip if we already applied this revision (e.g. the SSE
      // echo arrived before the pg_notify on a different server process).
      if (appliedRevisionsRef.current.has(delta.revision)) {
        revisionRef.current = Math.max(revisionRef.current, delta.revision);
        return;
      }

      // Nothing to merge.
      if (delta.changes.length === 0) {
        appliedRevisionsRef.current.add(delta.revision);
        revisionRef.current = Math.max(revisionRef.current, delta.revision);
        if (
          typeof delta.currentPageIndex === 'number' &&
          delta.currentPageIndex !== currentPageIndexRef.current
        ) {
          const pageIndex = Math.min(
            Math.max(0, delta.currentPageIndex),
            pagesRef.current.length - 1,
          );
          setCurrentPageIndex(pageIndex);
          currentPageIndexRef.current = pageIndex;
          syncedIndexRef.current = pageIndex;
        }
        return;
      }

      const localPages = pagesRef.current;
      // Preserve local page count when a push is in-flight — another browser
      // may have a smaller pageCount if it hasn't seen our new page yet.
      const pageCount =
        (pushTimerRef.current != null || pushSendingRef.current || pushQueuedRef.current) &&
        delta.pageCount < localPages.length
          ? localPages.length
          : delta.pageCount;
      const guard = {
        revision: delta.revision,
        elementRevision: elementRevisionRef.current,
        structureRevision: structureRevisionRef.current,
      };

      applyingRemoteRef.current = true;
      const merged = applyBoardDelta(localPages, { ...delta, pageCount }, guard);

      // Find the changes that the guard actually accepted so we can propagate
      // them into the undo/redo history without doing a full diffBoard when
      // the guard is empty (the common case).
      const guardIsEmpty = elementRevisionRef.current.size === 0;
      const accepted = guardIsEmpty ? delta.changes : diffBoard(localPages, merged);

      appliedRevisionsRef.current.add(delta.revision);
      if (appliedRevisionsRef.current.size > 500) {
        const oldest = Math.min(...appliedRevisionsRef.current);
        appliedRevisionsRef.current.delete(oldest);
      }
      revisionRef.current = Math.max(revisionRef.current, delta.revision);
      canvasRef.current?.renderRemoteInk(null);
      remoteInkRef.current = null;

      // Keep syncedPagesRef consistent with what the server confirmed.
      if (syncedPagesRef.current) {
        const syncedCount =
          pageCount > delta.pageCount
            ? Math.max(pageCount, syncedPagesRef.current.length)
            : pageCount;
        syncedPagesRef.current = applyBoardDelta(syncedPagesRef.current, {
          ...delta,
          pageCount: syncedCount,
          changes: accepted,
        });
      }

      // Early exit: nothing actually changed locally (all changes were rejected
      // by the guard or the delta only affected pages we don't have yet).
      if (accepted.length === 0 && merged.length === localPages.length) {
        if (
          typeof delta.currentPageIndex === 'number' &&
          delta.currentPageIndex !== currentPageIndexRef.current
        ) {
          const pageIndex = Math.min(Math.max(0, delta.currentPageIndex), merged.length - 1);
          setCurrentPageIndex(pageIndex);
          currentPageIndexRef.current = pageIndex;
          syncedIndexRef.current = pageIndex;
        }
        applyingRemoteRef.current = false;
        return;
      }

      // Apply the accepted changes to every history state so that undoing a
      // local stroke on this browser does not accidentally remove elements that
      // the remote browser contributed.
      for (let index = 0; index < merged.length; index += 1) {
        const change = accepted.find((entry) => entry.pageIndex === index);
        const page = merged[index];
        const hist = historyMapRef.current.get(index);
        if (!change) {
          if (!hist) historyMapRef.current.set(index, { states: [page], index: 0 });
          continue;
        }
        if (!hist) {
          historyMapRef.current.set(index, { states: [page], index: 0 });
          continue;
        }
        const states = hist.states.map((state, stateIndex) => {
          if (stateIndex === hist.index) return page;
          return applyBoardDelta([state], {
            pageCount: 1,
            changes: [{ ...change, pageIndex: 0 }],
          })[0];
        });
        historyMapRef.current.set(index, capHistory(states, hist.index));
      }
      for (const key of [...historyMapRef.current.keys()]) {
        if (key >= merged.length) historyMapRef.current.delete(key);
      }

      setPages(merged);
      pagesRef.current = merged;
      const pageIndex = Math.min(Math.max(0, delta.currentPageIndex), merged.length - 1);
      setCurrentPageIndex(pageIndex);
      currentPageIndexRef.current = pageIndex;
      syncedIndexRef.current = pageIndex;
      updateUndoRedoState();
      applyingRemoteRef.current = false;

      if (remoteStoreTimerRef.current) window.clearTimeout(remoteStoreTimerRef.current);
      remoteStoreTimerRef.current = window.setTimeout(() => {
        remoteStoreTimerRef.current = null;
        scheduleLocalPagesSaveRef.current();
      }, 250);
    },
    [
      updateUndoRedoState,
      applyingRemoteRef,
      appliedRevisionsRef,
      canvasRef,
      currentPageIndexRef,
      elementRevisionRef,
      historyMapRef,
      pagesRef,
      pushQueuedRef,
      pushSendingRef,
      pushTimerRef,
      remoteInkRef,
      remoteStoreTimerRef,
      revisionRef,
      scheduleLocalPagesSaveRef,
      setCurrentPageIndex,
      setPages,
      structureRevisionRef,
      syncedIndexRef,
      syncedPagesRef,
    ],
  );

  // --- Full-board remote apply (initial load / poll / fallback) ---
  const applyRemoteBoard = useCallback(
    (board: { pages: CanvasElement[][]; currentPageIndex: number; revision: number }) => {
      if (!Array.isArray(board.pages) || board.pages.length === 0) return;
      applyingRemoteRef.current = true;
      revisionRef.current = board.revision;
      appliedRevisionsRef.current.add(board.revision);
      structureRevisionRef.current = board.revision;
      const elementRevision = new Map<string, number>();
      for (const page of board.pages) {
        for (const element of page) {
          if (element?.id) elementRevision.set(element.id, board.revision);
        }
      }
      elementRevisionRef.current = elementRevision;
      canvasRef.current?.renderRemoteInk(null);
      remoteInkRef.current = null;
      const nextPages = board.pages;
      const pageIndex = Math.min(Math.max(0, board.currentPageIndex || 0), nextPages.length - 1);
      syncedPagesRef.current = nextPages.map((page) => page.slice());
      syncedIndexRef.current = pageIndex;
      setPages(nextPages);
      console.log('[TB-DIAG-STATE]', { t: performance.now(), revision: board.revision });
      pagesRef.current = nextPages;
      setCurrentPageIndex(pageIndex);
      currentPageIndexRef.current = pageIndex;
      historyMapRef.current = new Map(
        nextPages.map((page, idx) => [idx, { states: [page || []], index: 0 }]),
      );
      updateUndoRedoState();
      applyingRemoteRef.current = false;
      if (remoteStoreTimerRef.current) window.clearTimeout(remoteStoreTimerRef.current);
      remoteStoreTimerRef.current = window.setTimeout(() => {
        remoteStoreTimerRef.current = null;
        scheduleLocalPagesSaveRef.current();
        try {
          const raw = localStorage.getItem(PREFS_KEY);
          const prefs = raw ? JSON.parse(raw) : {};
          prefs.currentPageIndex = currentPageIndexRef.current;
          localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch {}
      }, 250);
    },
    [
      updateUndoRedoState,
      applyingRemoteRef,
      appliedRevisionsRef,
      canvasRef,
      currentPageIndexRef,
      elementRevisionRef,
      historyMapRef,
      pagesRef,
      remoteInkRef,
      remoteStoreTimerRef,
      revisionRef,
      scheduleLocalPagesSaveRef,
      setCurrentPageIndex,
      setPages,
      structureRevisionRef,
      syncedIndexRef,
      syncedPagesRef,
    ],
  );

  // --- SSE stream + fallback poll ---
  useEffect(() => {
    let cancelled = false;

    let pullTask: Promise<void> | null = null;
    const pull = () => {
      if (pullTask) return pullTask;
      pullTask = (async () => {
        try {
          const epoch = editEpochRef.current;
          const res = await fetch('/api/teacher-board', { cache: 'no-store' });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as {
            board: {
              pages: CanvasElement[][];
              currentPageIndex: number;
              revision: number;
            } | null;
          };
          if (cancelled || editEpochRef.current !== epoch) return;
          if (!data.board) {
            schedulePushRef.current();
            return;
          }
          const pushing =
            pushTimerRef.current != null || pushSendingRef.current || pushQueuedRef.current;
          // On first load (syncedPagesRef still null), accept the server snapshot
          // if we don't have a pending push that would supersede it.
          if (!syncedPagesRef.current && data.board.revision >= revisionRef.current && !pushing) {
            applyRemoteBoard(data.board);
            return;
          }
          if (data.board.revision <= revisionRef.current || pushing) return;
          applyRemoteBoard(data.board);
        } catch {
          /* ignore a dropped pull */
        } finally {
          pullTask = null;
        }
      })();
      return pullTask;
    };

    let source: EventSource | null = null;
    let watchdog = 0;
    let errorPull = 0;
    let streamGeneration = 0;
    // Timestamp of the last SSE message (including server pings every 5 s).
    // Used to skip the fallback poll while the stream is healthy — avoids
    // hammering the DB connection pool unnecessarily, especially when multiple
    // dashboard tabs are open at the same time.
    let lastSseActivityAt = 0;

    const armWatchdog = () => {
      window.clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        if (cancelled) return;
        source?.close();
        void pull();
        open();
      }, 12000);
    };

    const open = () => {
      if (cancelled) return;
      window.clearTimeout(errorPull);
      errorPull = 0;
      const generation = ++streamGeneration;
      const next = new EventSource(
        `/api/teacher-board/stream?clientId=${encodeURIComponent(clientIdRef.current)}&revision=${revisionRef.current}`,
      );
      source = next;
      armWatchdog();
      next.onerror = () => {
        if (generation !== streamGeneration || errorPull || cancelled) return;
        errorPull = window.setTimeout(() => {
          errorPull = 0;
          if (!cancelled) void pull();
        }, 2000);
      };
      next.onmessage = (ev) => {
        armWatchdog();
        lastSseActivityAt = Date.now();
        if (ev.lastEventId.startsWith('r')) {
          const rev = Number(ev.lastEventId.slice(1));
          if (Number.isFinite(rev) && rev <= revisionRef.current) return;
        }
        try {
          const msg = JSON.parse(ev.data) as {
            revision?: number;
            clientId?: string;
            pages?: CanvasElement[][];
            currentPageIndex?: number;
            type?: 'laser' | 'ink' | 'delta' | 'ping';
            point?: { x: number; y: number } | null;
            pageIndex?: number;
            points?: number[];
            stroke?: string;
            strokeWidth?: number;
            inkSeq?: number;
            base?: number;
            pageCount?: number;
            changes?: BoardDelta<CanvasElement>['changes'];
          };
          if (typeof msg.inkSeq === 'number') {
            remoteInkFloorRef.current = Math.max(remoteInkFloorRef.current, msg.inkSeq);
          }
          if (msg.type === 'ping') return;
          if (msg.type === 'ink') {
            if (typeof msg.inkSeq === 'number' && msg.inkSeq < remoteInkFloorRef.current) return;
            if (msg.clientId && msg.clientId === clientIdRef.current) return;
            if (
              typeof msg.pageIndex === 'number' &&
              msg.pageIndex !== currentPageIndexRef.current
            ) {
              canvasRef.current?.renderRemoteInk(null);
              remoteInkRef.current = null;
              return;
            }
            const delta = Array.isArray(msg.points)
              ? msg.points.filter((n) => typeof n === 'number')
              : [];
            const base =
              typeof msg.base === 'number' && Number.isFinite(msg.base)
                ? Math.max(0, Math.floor(msg.base))
                : 0;
            const seq = typeof msg.inkSeq === 'number' ? msg.inkSeq : -1;
            const prev = remoteInkRef.current;
            const points =
              prev && prev.seq === seq && base > 0 && base <= prev.points.length
                ? prev.points.slice(0, base).concat(delta)
                : delta;
            if (seq >= 0) remoteInkRef.current = { seq, points };
            canvasRef.current?.renderRemoteInk(
              points.length >= 4
                ? { points, color: msg.stroke || '#111111', width: msg.strokeWidth || 2 }
                : null,
            );
            return;
          }
          if (msg.type === 'laser') {
            if (msg.clientId && msg.clientId === clientIdRef.current) return;
            if (
              typeof msg.pageIndex === 'number' &&
              msg.pageIndex !== currentPageIndexRef.current
            )
              return;
            const point =
              msg.point &&
              typeof msg.point.x === 'number' &&
              typeof msg.point.y === 'number'
                ? { x: msg.point.x, y: msg.point.y }
                : null;
            canvasRef.current?.renderRemoteLaser(point);
            return;
          }
          if (msg.type === 'delta') {
            if (typeof msg.revision !== 'number') return;
            if (msg.clientId && msg.clientId === clientIdRef.current) {
              // SSE echo for our own delta — mark revision so we don't
              // re-apply it if pg_notify delivers it on another instance.
              revisionRef.current = Math.max(revisionRef.current, msg.revision);
              appliedRevisionsRef.current.add(msg.revision);
              return;
            }
            const pageCount =
              typeof msg.pageCount === 'number' && Number.isFinite(msg.pageCount)
                ? Math.floor(msg.pageCount)
                : 0;
            if (pageCount < 1 || !Array.isArray(msg.changes)) {
              void pull();
              return;
            }
            applyRemoteDelta({
              revision: msg.revision,
              pageCount,
              currentPageIndex:
                typeof msg.currentPageIndex === 'number'
                  ? msg.currentPageIndex
                  : currentPageIndexRef.current,
              changes: msg.changes,
            });
            return;
          }
          if (typeof msg.revision !== 'number') return;
          if (msg.clientId && msg.clientId === clientIdRef.current) {
            // SSE echo for our own full-board post.
            revisionRef.current = Math.max(revisionRef.current, msg.revision);
            appliedRevisionsRef.current.add(msg.revision);
            return;
          }
          if (msg.revision <= revisionRef.current) return;
          if (pushTimerRef.current != null || pushSendingRef.current || pushQueuedRef.current)
            return;
          if (Array.isArray(msg.pages) && msg.pages.length > 0) {
            const pageIndex = typeof msg.currentPageIndex === 'number' ? msg.currentPageIndex : 0;
            const page = msg.pages[Math.min(Math.max(0, pageIndex), msg.pages.length - 1)];
            const ids = Array.isArray(page)
              ? page.flatMap((el) => (el && typeof el.id === 'string' ? [el.id] : []))
              : [];
            console.log('[TB-DIAG-RECV]', {
              t: performance.now(),
              revision: msg.revision,
              inkSeq: msg.inkSeq,
              clientId: msg.clientId,
              ids,
            });
            applyRemoteBoard({
              pages: msg.pages,
              currentPageIndex: pageIndex,
              revision: msg.revision,
            });
            return;
          }
          void pull();
        } catch {
          /* ignore malformed event */
        }
      };
    };

    open();
    const openedRevision = revisionRef.current;
    void pull().finally(() => {
      if (cancelled || revisionRef.current === openedRevision) return;
      source?.close();
      open();
    });
    const pollTimer = window.setInterval(() => {
      // Only poll when the SSE stream has been silent for more than 8 s.
      // The server heartbeats every 5 s, so a healthy connection keeps
      // lastSseActivityAt fresh and this branch never runs. This prevents
      // multiple open dashboard tabs from each firing a DB read every second
      // and saturating the connection pool.
      if (!cancelled && Date.now() - lastSseActivityAt > 8000) void pull();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(watchdog);
      window.clearTimeout(errorPull);
      source?.close();
    };
  }, [
    applyRemoteBoard,
    applyRemoteDelta,
    appliedRevisionsRef,
    canvasRef,
    clientIdRef,
    currentPageIndexRef,
    editEpochRef,
    pushQueuedRef,
    pushSendingRef,
    pushTimerRef,
    remoteInkFloorRef,
    remoteInkRef,
    revisionRef,
    schedulePushRef,
    syncedPagesRef,
  ]);

  return { schedulePush, handleLiveStroke, handleLaserMove, applyRemoteBoard };
}

export type WhiteboardSync = ReturnType<typeof useWhiteboardSync>;
