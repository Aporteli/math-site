import { parseConnectionMetrics } from '@/lib/livekit/diagnostics/metrics';
import { whiteboardRooms } from '@/lib/livekit/diagnostics/whiteboard-trace';
import type { DiagnosticsSession } from './session';
import { readStats } from './stats';
import type { BoardLink } from './types';

export function bindReadBoardLink(session: DiagnosticsSession): void {
  session.readBoardLink = async (): Promise<BoardLink | null> => {
    const board = whiteboardRooms().find((candidate) => candidate !== session.room) ?? null;
    if (!board) {
      session.boardRoomSeen = null;
      session.boardCounters = null;
      return null;
    }
    if (board !== session.boardRoomSeen) {
      session.boardRoomSeen = board;
      session.boardCounters = null;
      session.previousBoard = null;
    }
    let ice: string | null = null;
    let pc: string | null = null;
    try {
      ice = board.engine.pcManager?.publisher?.getICEConnectionState() ?? null;
      pc = board.engine.pcManager?.publisher?.getConnectionState() ?? null;
    } catch {
      ice = null;
      pc = null;
    }
    const reports = await readStats(board);
    const parsed = parseConnectionMetrics(reports, session.boardCounters, Date.now());
    session.boardCounters = parsed.counters;
    return {
      state: board.state,
      ice,
      pc,
      dataChannelState: parsed.metrics.dataChannelState,
      dataMessagesSent: parsed.metrics.dataMessagesSentDelta,
      dataMessagesReceived: parsed.metrics.dataMessagesReceivedDelta,
    };
  };
}
