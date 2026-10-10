import type { DiagnosticsSession } from './session';
import { badTransport } from './transport';
import type { BoardLink } from './types';

export function bindObserveBoard(session: DiagnosticsSession): void {
  session.observeBoard = (link: BoardLink) => {
    const previous = session.previousBoard;
    session.previousBoard = link;
    const unhealthy =
      badTransport(link.ice ?? '') ||
      badTransport(link.pc ?? '') ||
      badTransport(link.dataChannelState ?? '') ||
      link.state === 'disconnected' ||
      link.state === 'reconnecting';
    const changed = previous
      ? previous.state !== link.state ||
        previous.ice !== link.ice ||
        previous.pc !== link.pc ||
        previous.dataChannelState !== link.dataChannelState
      : unhealthy;
    if (!changed) return;
    session.push('board_link_changed', {
      message: 'Whiteboard connection changed while media was on another room',
      side: 'board',
      boardState: link.state,
      previousBoardState: previous?.state ?? null,
      boardIce: link.ice,
      previousBoardIce: previous?.ice ?? null,
      boardPc: link.pc,
      previousBoardPc: previous?.pc ?? null,
      dataChannelState: link.dataChannelState,
      previousDataChannelState: previous?.dataChannelState ?? null,
    });
  };
}
