import { attachTransport } from './attach-transport';
import type { DiagnosticsSession } from './session';
import { readTransportState, transportOf } from './transport';

export function bindRebind(session: DiagnosticsSession): void {
  session.rebind = () => {
    const publisher = transportOf(session.room, 'publisher');
    const subscriber = transportOf(session.room, 'subscriber');
    if (publisher !== session.boundPublisher) {
      session.detachPublisher();
      session.boundPublisher = publisher;
      session.detachPublisher = publisher ? attachTransport(session, publisher, 'publisher') : () => {};
    }
    if (subscriber !== session.boundSubscriber) {
      session.detachSubscriber();
      session.boundSubscriber = subscriber;
      session.detachSubscriber = subscriber ? attachTransport(session, subscriber, 'subscriber') : () => {};
    }
    session.observePc('publisher', readTransportState(publisher, (value) => value.getConnectionState()));
    session.observePc('subscriber', readTransportState(subscriber, (value) => value.getConnectionState()));
    session.observeIce('publisher', readTransportState(publisher, (value) => value.getICEConnectionState()));
    session.observeIce('subscriber', readTransportState(subscriber, (value) => value.getICEConnectionState()));
  };
}
