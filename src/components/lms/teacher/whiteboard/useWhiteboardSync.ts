"use client";

import { useCallback, useEffect, useRef } from "react";
import { PREFS_KEY } from "./constants";
import { stringifyPages } from "./pageHistory";
import { reconcileBoard } from "@/components/lms/classroom/KonvaCanvas/utils/boardReconcile";
import type { CanvasElement } from "@/components/lms/classroom/KonvaCanvas/utils/types";
import type { WhiteboardState } from "./useWhiteboardState";
import type { WhiteboardPersistence } from "./useWhiteboardPersistence";

/** ლაზერის safety timeout — თუ ამ დროში ახალი point არ მოვიდა, ავტომატურად ქრება */
const LASER_SAFETY_TIMEOUT_MS = 2000;
/** ლაზერის null-ის retry რაოდენობა pointer up-ის დროს */
const LASER_NULL_RETRY_COUNT = 3;
/** retry-ებს შორის ინტერვალი */
const LASER_NULL_RETRY_INTERVAL_MS = 100;
/**
 * თუ დაფის ამ პროცენტზე მეტი გვერდი შეიცვალა — სჯობს სრული snapshot გაიგზავნოს.
 * დელტა მხოლოდ მაშინ არის მომგებიანი, როცა ცოტა გვერდი შეიცვალა.
 */
const DELTA_PAGE_THRESHOLD = 0.6;

type DeltaUpdate = { idx: number; elements: CanvasElement[] };

type DeltaPayload = {
  updates: DeltaUpdate[];
  totalPages: number;
};

export function useWhiteboardSync(
  boardState: WhiteboardState,
  persistence: WhiteboardPersistence,
) {
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
    pagesJsonRef,
    lastLaserSentRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    updateUndoRedoState,
  } = { ...boardState, ...persistence };

  const pushBodyRef = useRef("");

  /** ✅ ბოლოს წარმატებით გაგზავნილი გვერდების snapshot (reference-ით) */
  const lastSentPagesRef = useRef<CanvasElement[][] | null>(null);
  /** ✅ ბოლოს წარმატებით გაგზავნილი currentPageIndex */
  const lastSentPageIndexRef = useRef<number>(-1);

  const laserNullTimersRef = useRef<number[]>([]);
  const laserSafetyTimerRef = useRef<number | null>(null);

  const clearLaserNullTimers = useCallback(() => {
    for (const id of laserNullTimersRef.current) window.clearTimeout(id);
    laserNullTimersRef.current = [];
  }, []);

  const clearLaserSafetyTimer = useCallback(() => {
    if (laserSafetyTimerRef.current != null) {
      window.clearTimeout(laserSafetyTimerRef.current);
      laserSafetyTimerRef.current = null;
    }
  }, []);

  // ============================================================
  // dirty pages-ის გამოთვლა (reference-ით)
  // ============================================================
  const computeDelta = useCallback((): DeltaPayload | null => {
    const pages = pagesRef.current;
    const lastSent = lastSentPagesRef.current;
    if (!lastSent || lastSent.length !== pages.length || pages.length <= 1) {
      return null;
    }
    const updates: DeltaUpdate[] = [];
    for (let i = 0; i < pages.length; i += 1) {
      if (pages[i] !== lastSent[i]) updates.push({ idx: i, elements: pages[i] });
    }
    const dirtyRatio = updates.length / pages.length;
    if (updates.length === 0) return null;
    if (dirtyRatio >= DELTA_PAGE_THRESHOLD) return null;
    return { updates, totalPages: pages.length };
  }, []);

  // ============================================================
  // PUSH — delta ან full body-ის აწყობა
  // ============================================================
  const buildBody = useCallback((): string => {
    const pages = pagesRef.current;
    const pageIndex = currentPageIndexRef.current;
    const clientId = clientIdRef.current;
    const inkSeq = inkSeqRef.current;

    const delta = computeDelta();

    if (delta) {
      return (
        '{"delta":{"updates":' +
        JSON.stringify(delta.updates) +
        ',"totalPages":' +
        delta.totalPages +
        '},"currentPageIndex":' +
        pageIndex +
        ',"clientId":' +
        JSON.stringify(clientId) +
        ',"inkSeq":' +
        inkSeq +
        "}"
      );
    }

    const pagesJson = stringifyPages(pages);
    pagesJsonRef.current = { pages, json: pagesJson };
    return (
      '{"pages":' +
      pagesJson +
      ',"currentPageIndex":' +
      pageIndex +
      ',"clientId":' +
      JSON.stringify(clientId) +
      ',"inkSeq":' +
      inkSeq +
      "}"
    );
  }, [computeDelta]);

  const doSend = useCallback(() => {
    if (!isHydratedRef.current || applyingRemoteRef.current) return;
    if (pushSendingRef.current) {
      pushQueuedRef.current = true;
      return;
    }

    const body = buildBody();
    pushBodyRef.current = body;
    pushSendingRef.current = true;
    pushQueuedRef.current = false;

    const pagesAtSend = pagesRef.current;
    const pageIndexAtSend = currentPageIndexRef.current;

    const controller = new AbortController();
    const killer = window.setTimeout(() => controller.abort(), 20000);

    void fetch("/api/teacher-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status >= 500 && !pushQueuedRef.current) {
            pushQueuedRef.current = true;
          }
          return;
        }
        const data = (await res.json()) as { revision?: number };
        if (typeof data.revision === "number") {
          revisionRef.current = Math.max(revisionRef.current, data.revision);
        }
        // ✅ baseline-ის განახლება მხოლოდ წარმატებული გაგზავნის შემდეგ
        lastSentPagesRef.current = pagesAtSend;
        lastSentPageIndexRef.current = pageIndexAtSend;
        scheduleLocalPagesSaveRef.current();
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(killer);
        pushSendingRef.current = false;
        if (pushQueuedRef.current) doSend();
      });
  }, [buildBody]);

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

    if (pushTimerRef.current != null) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      doSend();
    }, 250);
  }, [doSend]);
  schedulePushRef.current = schedulePush;

  // ============================================================
  // pagehide — ბოლო ცვლილების flush
  // ============================================================
  useEffect(() => {
    const flush = () => {
      if (!isHydratedRef.current) return;
      const pending =
        pushTimerRef.current != null ||
        pushQueuedRef.current ||
        pushSendingRef.current;
      if (!pending) return;
      if (pushTimerRef.current != null) {
        window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
      pushQueuedRef.current = false;

      const body = buildBody();
      void fetch("/api/teacher-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [buildBody]);

  // ============================================================
  // LIVE INK (უცვლელი)
  // ============================================================
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
          void fetch("/api/teacher-board", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              type: "ink",
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
            .catch(() => rewind())
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
                }, 20);
              }
            });
        };
        send();
      }, 20);
    },
    [],
  );

  // ============================================================
  // LASER (უცვლელი)
  // ============================================================
  const sendLaserOnce = useCallback(
    (point: { x: number; y: number } | null) => {
      void fetch("/api/teacher-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "laser",
          point,
          pageIndex: currentPageIndexRef.current,
          clientId: clientIdRef.current,
        }),
      }).catch(() => {});
    },
    [],
  );

  const handleLaserMove = useCallback(
    (pos: { x: number; y: number } | null) => {
      const now = Date.now();
      if (pos && now - lastLaserSentRef.current <= 35) return;
      lastLaserSentRef.current = now;
      sendLaserOnce(pos);
      if (pos === null) {
        clearLaserNullTimers();
        for (let i = 1; i < LASER_NULL_RETRY_COUNT; i++) {
          const timerId = window.setTimeout(() => {
            laserNullTimersRef.current = laserNullTimersRef.current.filter(
              (id) => id !== timerId,
            );
            sendLaserOnce(null);
          }, LASER_NULL_RETRY_INTERVAL_MS * i);
          laserNullTimersRef.current.push(timerId);
        }
      }
    },
    [sendLaserOnce, clearLaserNullTimers],
  );

  useEffect(() => {
    return () => {
      clearLaserNullTimers();
      clearLaserSafetyTimer();
    };
  }, [clearLaserNullTimers, clearLaserSafetyTimer]);

  // ============================================================
  // APPLY REMOTE BOARD
  // ============================================================
  const applyRemoteBoard = useCallback(
    (board: {
      pages: CanvasElement[][];
      currentPageIndex: number;
      revision: number;
    }) => {
      if (!Array.isArray(board.pages) || board.pages.length === 0) return;
      applyingRemoteRef.current = true;
      try {
        revisionRef.current = board.revision;
        canvasRef.current?.renderRemoteInk(null);
        remoteInkRef.current = null;

        const prevPages = pagesRef.current;
        const nextPages = reconcileBoard(prevPages, board.pages);
        const pageIndex = Math.min(
          Math.max(0, board.currentPageIndex || 0),
          nextPages.length - 1,
        );

        if (
          nextPages !== prevPages ||
          currentPageIndexRef.current !== pageIndex
        ) {
          setPages(nextPages);
          pagesRef.current = nextPages;
          if (currentPageIndexRef.current !== pageIndex) {
            setCurrentPageIndex(pageIndex);
            currentPageIndexRef.current = pageIndex;
          }
          for (let idx = 0; idx < nextPages.length; idx += 1) {
            if (prevPages[idx] !== nextPages[idx]) {
              historyMapRef.current.set(idx, {
                states: [nextPages[idx] || []],
                index: 0,
              });
            }
          }
          for (const key of Array.from(historyMapRef.current.keys())) {
            if (key >= nextPages.length) historyMapRef.current.delete(key);
          }
          updateUndoRedoState();
        }
      } finally {
        applyingRemoteRef.current = false;
      }
      if (remoteStoreTimerRef.current)
        window.clearTimeout(remoteStoreTimerRef.current);
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
    [updateUndoRedoState],
  );

  // ============================================================
  // SSE + polling
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    let pullTask: Promise<void> | null = null;
    const pull = () => {
      if (pullTask) return pullTask;
      pullTask = (async () => {
        try {
          const epoch = editEpochRef.current;
          const res = await fetch("/api/teacher-board", { cache: "no-store" });
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
          if (data.board.revision <= revisionRef.current) return;
          if (
            pushTimerRef.current != null ||
            pushSendingRef.current ||
            pushQueuedRef.current
          )
            return;
          applyRemoteBoard(data.board);
        } catch {
          /* ignore */
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
        if (ev.lastEventId.startsWith("r")) {
          const rev = Number(ev.lastEventId.slice(1));
          if (Number.isFinite(rev) && rev <= revisionRef.current) return;
        }
        try {
          const msg = JSON.parse(ev.data) as {
            revision?: number;
            clientId?: string;
            pages?: CanvasElement[][];
            currentPageIndex?: number;
            type?: "laser" | "ink" | "ping";
            point?: { x: number; y: number } | null;
            pageIndex?: number;
            points?: number[];
            stroke?: string;
            strokeWidth?: number;
            inkSeq?: number;
            base?: number;
          };
          if (typeof msg.inkSeq === "number") {
            remoteInkFloorRef.current = Math.max(
              remoteInkFloorRef.current,
              msg.inkSeq,
            );
          }
          if (msg.type === "ping") return;

          if (msg.type === "ink") {
            if (
              typeof msg.inkSeq === "number" &&
              msg.inkSeq < remoteInkFloorRef.current
            )
              return;
            if (msg.clientId && msg.clientId === clientIdRef.current) return;
            if (
              typeof msg.pageIndex === "number" &&
              msg.pageIndex !== currentPageIndexRef.current
            ) {
              canvasRef.current?.renderRemoteInk(null);
              remoteInkRef.current = null;
              return;
            }
            const delta = Array.isArray(msg.points)
              ? msg.points.filter((n) => typeof n === "number")
              : [];
            const base =
              typeof msg.base === "number" && Number.isFinite(msg.base)
                ? Math.max(0, Math.floor(msg.base))
                : 0;
            const seq = typeof msg.inkSeq === "number" ? msg.inkSeq : -1;
            const prev = remoteInkRef.current;
            const points =
              prev && prev.seq === seq && base > 0 && base <= prev.points.length
                ? prev.points.slice(0, base).concat(delta)
                : delta;
            if (seq >= 0) remoteInkRef.current = { seq, points };
            canvasRef.current?.renderRemoteInk(
              points.length >= 4
                ? {
                    points,
                    color: msg.stroke || "#111111",
                    width: msg.strokeWidth || 2,
                  }
                : null,
            );
            return;
          }

          if (msg.type === "laser") {
            if (msg.clientId && msg.clientId === clientIdRef.current) return;
            if (
              typeof msg.pageIndex === "number" &&
              msg.pageIndex !== currentPageIndexRef.current
            )
              return;
            const point =
              msg.point &&
              typeof msg.point.x === "number" &&
              typeof msg.point.y === "number"
                ? { x: msg.point.x, y: msg.point.y }
                : null;
            canvasRef.current?.renderRemoteLaser(point);
            if (point) {
              clearLaserSafetyTimer();
              laserSafetyTimerRef.current = window.setTimeout(() => {
                laserSafetyTimerRef.current = null;
                canvasRef.current?.renderRemoteLaser(null);
              }, LASER_SAFETY_TIMEOUT_MS);
            } else {
              clearLaserSafetyTimer();
            }
            return;
          }

          if (typeof msg.revision !== "number") return;
          if (msg.clientId && msg.clientId === clientIdRef.current) {
            revisionRef.current = Math.max(revisionRef.current, msg.revision);
            return;
          }
          if (msg.revision <= revisionRef.current) return;
          if (
            pushTimerRef.current != null ||
            pushSendingRef.current ||
            pushQueuedRef.current
          )
            return;
          if (Array.isArray(msg.pages) && msg.pages.length > 0) {
            applyRemoteBoard({
              pages: msg.pages,
              currentPageIndex:
                typeof msg.currentPageIndex === "number"
                  ? msg.currentPageIndex
                  : 0,
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
      if (!cancelled) void pull();
    }, 30000);

    const onVisibility = () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(watchdog);
      window.clearTimeout(errorPull);
      document.removeEventListener("visibilitychange", onVisibility);
      source?.close();
      canvasRef.current?.renderRemoteInk(null);
      canvasRef.current?.renderRemoteLaser(null);
      remoteInkRef.current = null;
    };
  }, [applyRemoteBoard]);

  return { schedulePush, handleLiveStroke, handleLaserMove, applyRemoteBoard };
}

export type WhiteboardSync = ReturnType<typeof useWhiteboardSync>;