'use client';

import { WhiteBoard } from './WhiteBoard';
import type { WhiteboardCopy } from './drawing';

export function TeacherWhiteboard({ copy }: { copy: WhiteboardCopy }) {
  return <WhiteBoard copy={copy} />;
}
