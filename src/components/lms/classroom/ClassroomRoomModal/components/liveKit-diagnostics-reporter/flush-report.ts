import { degradationTransition } from '@/lib/livekit/diagnostics/model';
import { parseConnectionMetrics } from '@/lib/livekit/diagnostics/metrics';
import {
  restoreMainThreadGap,
  restoreWhiteboardMessages,
  sanitizeWhiteboardMessages,
  takeMainThreadGap,
  takeWhiteboardMessages,
  type WhiteboardMessageTrace,
} from '@/lib/livekit/diagnostics/whiteboard-message';
import { restoreWhiteboardCounts, takeWhiteboardCounts, type WhiteboardCounts } from '@/lib/livekit/diagnostics/whiteboard-trace';
import { subscribedMicrophones } from './audio-tracks';
import type { DiagnosticsSession } from './session';
import { readStats } from './stats';

export function bindFlush(session: DiagnosticsSession): void {
  session.flush = async (leaving: boolean) => {
    if (leaving) {
      session.leaveRequested = true;
      window.clearInterval(session.timer);
      window.clearInterval(session.watchTimer);
      window.clearTimeout(session.flushSoon);
    }
    if (session.flushing || (session.stopped && !leaving) || (session.leaveRequested && !leaving)) return;
    session.flushing = true;
    session.inFlush = true;
    const isLeave = leaving;
    let whiteboard: WhiteboardCounts | null = null;
    let messages: WhiteboardMessageTrace[] | null = null;
    let mainThread: number | null = null;
    const restoreDiagnostics = () => {
      if (whiteboard) restoreWhiteboardCounts(whiteboard);
      if (messages) restoreWhiteboardMessages(messages);
      if (mainThread !== null) restoreMainThreadGap(mainThread);
    };
    try {
      session.rebind();
      const reports = await readStats(session.room);
      const parsed = parseConnectionMetrics(reports, session.counters, Date.now());
      session.counters = parsed.counters;
      session.latest = parsed.metrics;
      const transition = degradationTransition(session.degraded, {
        quality: session.room.localParticipant.connectionQuality,
        rttMs: parsed.metrics.rttMs,
        sendLossPct: parsed.metrics.sendLossPct,
        receiveLossPct: parsed.metrics.receiveLossPct,
        jitterMs: parsed.metrics.jitterMs,
      });
      if (transition === 'degraded') {
        session.degraded = true;
        session.push('network_degraded', { message: 'Connection metrics crossed a degradation threshold' });
      } else if (transition === 'recovered') {
        session.degraded = false;
        session.push('network_recovered', { message: 'Connection metrics returned below the degradation threshold' });
      }
      session.observeDtls(parsed.metrics.dtlsState);
      session.observeData(parsed.metrics.dataChannelState);
      const board = await session.readBoardLink();
      session.latestBoard = board;
      if (board) session.observeBoard(board);
      else session.previousBoard = null;
      if (!session.subscriptions) session.subscriptions = subscribedMicrophones(session.room);
      whiteboard = takeWhiteboardCounts();
      messages = takeWhiteboardMessages();
      mainThread = takeMainThreadGap();

      const report = session.buildReport(
        isLeave,
        whiteboard,
        session.latestBoard,
        sanitizeWhiteboardMessages(messages),
        mainThread,
      );
      if (!report) {
        restoreDiagnostics();
        return;
      }
      const sent = await session.send(report, isLeave);
      if (!sent) {
        session.restore(report.events);
        restoreDiagnostics();
        if (Date.now() - session.loggedFailureAt > 30_000) {
          session.loggedFailureAt = Date.now();
          console.error('LiveKit diagnostics report failed');
        }
      }
    } catch (error) {
      restoreDiagnostics();
      if (Date.now() - session.loggedFailureAt > 30_000) {
        session.loggedFailureAt = Date.now();
        console.error('LiveKit diagnostics report failed', error instanceof Error ? error.message : 'unknown');
      }
    } finally {
      session.inFlush = false;
      session.flushing = false;
      if (session.leaveRequested && session.leaveAttempts < 2 && session.pending.length > 0) {
        session.leaveAttempts += 1;
        void session.flush(true);
      }
    }
  };
}
