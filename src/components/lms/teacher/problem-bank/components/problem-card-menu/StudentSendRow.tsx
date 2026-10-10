'use client';

import { SendStatusButton } from './SendStatusButton';
import type { CourseStudent } from './types';

interface StudentSendRowProps {
  student: CourseStudent;
  sent: boolean;
  sending: boolean;
  onSend: () => void;
}

export function StudentSendRow({ student, sent, sending, onSend }: StudentSendRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-main p-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs font-medium text-ink">{student.name}</span>
      </div>

      <SendStatusButton sent={sent} sending={sending} idleLabel="გაგზავნა" onClick={onSend} />
    </div>
  );
}
