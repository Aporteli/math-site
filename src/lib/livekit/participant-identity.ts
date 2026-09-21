/**
 * LiveKit participant helpers.
 *
 * A participant's room identity is unique per connection (`<userId>:<random>`),
 * so the same account can be connected from several devices without the server
 * kicking the older session (`DisconnectReason.DUPLICATE_IDENTITY`).
 *
 * The account id and role travel in the token attributes. Tokens without
 * attributes (older sessions) fall back to the legacy `identity = userId`.
 */
export const PARTICIPANT_USER_ID = 'userId';
export const PARTICIPANT_ROLE = 'role';

export interface ParticipantAttributes {
  identity: string;
  attributes?: Readonly<Record<string, string>>;
}

/** Account id behind a connection. */
export function participantUserId(participant: ParticipantAttributes): string {
  return participant.attributes?.[PARTICIPANT_USER_ID] || participant.identity;
}

export function participantRole(participant: ParticipantAttributes): string {
  return (participant.attributes?.[PARTICIPANT_ROLE] || '').toLowerCase();
}

/** Teacher/admin connections are staff, never students. */
export function isStaffParticipant(participant: ParticipantAttributes): boolean {
  const role = participantRole(participant);
  return role === 'teacher' || role === 'admin';
}

/** Every live connection identity that belongs to the given account id. */
export function liveIdentitiesFor(
  participants: Iterable<ParticipantAttributes>,
  userId: string,
): string[] {
  const identities: string[] = [];
  for (const participant of participants) {
    if (participantUserId(participant) === userId) identities.push(participant.identity);
  }
  return identities;
}
