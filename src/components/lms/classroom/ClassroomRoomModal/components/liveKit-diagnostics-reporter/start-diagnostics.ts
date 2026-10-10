import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import { noteMainThreadGap } from '@/lib/livekit/diagnostics/whiteboard-message';
import { subscribeWhiteboard } from '@/lib/livekit/diagnostics/whiteboard-trace';
import { localMicrophone } from './audio-tracks';
import { browserConnection } from './browser';
import { bindBuildReport } from './build-report';
import { createDevicesErrorHandler } from './devices-error-event';
import { createDisconnectedHandler } from './disconnected-event';
import { bindFlush } from './flush-report';
import { createLocalAudioHandlers } from './local-audio-events';
import { createMuteHandlers } from './mute-events';
import { createNetworkHandler } from './network-event';
import { bindObserveBoard } from './observe-board';
import { bindObserveData } from './observe-data-channel';
import { bindObserveDtls } from './observe-dtls';
import { bindObserveIce } from './observe-ice';
import { bindObservePc } from './observe-pc';
import { createOfflineHandler } from './offline-event';
import { createOnlineHandler } from './online-event';
import { bindPush } from './push-event';
import { createQualityHandler } from './quality-event';
import { bindReadBoardLink } from './read-board-link';
import { bindRebind } from './rebind-transports';
import { createReconnectedHandler } from './reconnected-event';
import { createReconnectingHandler } from './reconnecting-event';
import { createRemoteSubscriptionHandlers } from './remote-subscription-events';
import { bindRequestFlush } from './request-flush';
import { bindRestore } from './restore-events';
import { bindSend } from './send-report';
import { createDiagnosticsSession } from './session';
import { createSignalHandler } from './signal-event';
import { createStreamHandler } from './stream-event';
import { createSubscribeFailedHandler } from './subscribe-failed-event';
import { createVisibilityHandler } from './visibility-event';
import { createWhiteboardHandler } from './whiteboard-events';

export function startLiveKitDiagnostics(input: {
  room: Room;
  courseId: string;
  roomKey: BreakoutRoomKey;
  secondary: boolean;
}): () => void {
  const session = createDiagnosticsSession(input);
  bindPush(session);
  bindRequestFlush(session);
  bindObservePc(session);
  bindObserveIce(session);
  bindObserveDtls(session);
  bindObserveData(session);
  bindObserveBoard(session);
  bindRebind(session);
  bindBuildReport(session);
  bindRestore(session);
  bindSend(session);
  bindReadBoardLink(session);
  bindFlush(session);

  const onWhiteboard = createWhiteboardHandler(session);
  const onReconnecting = createReconnectingHandler(session);
  const onReconnected = createReconnectedHandler(session);
  const onSignal = createSignalHandler(session);
  const onDisconnected = createDisconnectedHandler(session);
  const onQuality = createQualityHandler(session);
  const { onLocalPublished, onLocalUnpublished } = createLocalAudioHandlers(session);
  const { onMuted, onUnmuted } = createMuteHandlers(session);
  const { onSubscribed, onUnsubscribed } = createRemoteSubscriptionHandlers(session);
  const onStream = createStreamHandler(session);
  const onDevices = createDevicesErrorHandler(session);
  const onSubscribeFailed = createSubscribeFailedHandler(session);
  const onOffline = createOfflineHandler(session);
  const onOnline = createOnlineHandler(session);
  const onVisibility = createVisibilityHandler(session);
  const onNetwork = createNetworkHandler(session);

  const unsubscribeWhiteboard = subscribeWhiteboard(onWhiteboard);
  const { room } = session;
  room
    .on(RoomEvent.Reconnecting, onReconnecting)
    .on(RoomEvent.Reconnected, onReconnected)
    .on(RoomEvent.SignalReconnecting, onSignal)
    .on(RoomEvent.Disconnected, onDisconnected)
    .on(RoomEvent.ConnectionQualityChanged, onQuality)
    .on(RoomEvent.LocalTrackPublished, onLocalPublished)
    .on(RoomEvent.LocalTrackUnpublished, onLocalUnpublished)
    .on(RoomEvent.TrackMuted, onMuted)
    .on(RoomEvent.TrackUnmuted, onUnmuted)
    .on(RoomEvent.TrackSubscribed, onSubscribed)
    .on(RoomEvent.TrackUnsubscribed, onUnsubscribed)
    .on(RoomEvent.TrackStreamStateChanged, onStream)
    .on(RoomEvent.MediaDevicesError, onDevices)
    .on(RoomEvent.TrackSubscriptionFailed, onSubscribeFailed);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  const connection = browserConnection();
  connection?.addEventListener('change', onNetwork);

  session.push('participant_joined', { message: 'Participant joined' });
  if (room.state === 'connected') session.push('connected', { message: 'Connected' });
  const microphone = localMicrophone(room);
  if (microphone.publishing) session.push('audio_published', { audioTrackState: microphone.state });
  session.rebind();

  const started = window.setTimeout(() => void session.flush(false), 1000 + Math.floor(Math.random() * 4000));
  session.timer = window.setInterval(() => void session.flush(false), 12000);
  let lastWatch = Date.now();
  session.watchTimer = window.setInterval(() => {
    const now = Date.now();
    const gap = now - lastWatch - 2000;
    lastWatch = now;
    if (gap >= 400) noteMainThreadGap(gap);
    session.rebind();
  }, 2000);
  const onHide = () => void session.flush(true);
  window.addEventListener('pagehide', onHide);

  return () => {
    session.stopped = true;
    window.clearTimeout(started);
    window.clearTimeout(session.flushSoon);
    window.clearInterval(session.timer);
    window.clearInterval(session.watchTimer);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibility);
    connection?.removeEventListener('change', onNetwork);
    unsubscribeWhiteboard();
    session.detachPublisher();
    session.detachSubscriber();
    room
      .off(RoomEvent.Reconnecting, onReconnecting)
      .off(RoomEvent.Reconnected, onReconnected)
      .off(RoomEvent.SignalReconnecting, onSignal)
      .off(RoomEvent.Disconnected, onDisconnected)
      .off(RoomEvent.ConnectionQualityChanged, onQuality)
      .off(RoomEvent.LocalTrackPublished, onLocalPublished)
      .off(RoomEvent.LocalTrackUnpublished, onLocalUnpublished)
      .off(RoomEvent.TrackMuted, onMuted)
      .off(RoomEvent.TrackUnmuted, onUnmuted)
      .off(RoomEvent.TrackSubscribed, onSubscribed)
      .off(RoomEvent.TrackUnsubscribed, onUnsubscribed)
      .off(RoomEvent.TrackStreamStateChanged, onStream)
      .off(RoomEvent.MediaDevicesError, onDevices)
      .off(RoomEvent.TrackSubscriptionFailed, onSubscribeFailed);
    void session.flush(true);
  };
}
