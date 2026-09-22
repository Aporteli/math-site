/**
 * LiveKit participant helpers.
 *
 * A participant's room identity is unique per connection (`<userId>:<random>`),
 * so the same account can be connected from several devices without the server
 * kicking the older session (`DisconnectReason.DUPLICATE_IDENTITY`).
 *
 * The account id and role travel in the token attributes. If attributes are
 * missing, `<userId>:<8 chars>` is parsed back to the account id. Older
 * sessions used `identity = userId`.
 */
export const PARTICIPANT_USER_ID = 'userId';
export const PARTICIPANT_ROLE = 'role';

/** Random tail appended so each device gets its own LiveKit identity. */
export const CONNECTION_ID_SUFFIX_LENGTH = 8;

export interface ParticipantAttributes {
  identity: string;
  attributes?: Readonly<Record<string, string>>;
}

/**
 * Account id behind a connection.
 * Token attributes are preferred. If they are missing, a per-device identity
 * `<userId>:<8 chars>` still resolves to the account, so two devices of the
 * same person are not treated as strangers.
 */
export function participantUserId(participant: ParticipantAttributes): string {
  const fromAttributes = participant.attributes?.[PARTICIPANT_USER_ID];
  if (fromAttributes) return fromAttributes;

  const identity = participant.identity;
  const separator = identity.lastIndexOf(':');
  const suffixLength = identity.length - separator - 1;
  if (separator > 0 && suffixLength === CONNECTION_ID_SUFFIX_LENGTH) {
    return identity.slice(0, separator);
  }
  return identity;
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
