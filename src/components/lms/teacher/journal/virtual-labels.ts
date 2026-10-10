import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';

/* ─── Google Calendar სტილი: ღია ფონი + მარცხენა ფერადი ზოლი ─── */
export function virtualChipClass(source: VirtualScheduleEvent['source']) {
  return source === 'group' ? 'bg-sky-500 text-sky-950 border-l-[3px] border-sky-500' : 'bg-amber-400 text-amber-950';
}

export function virtualTitle(v: VirtualScheduleEvent) {
  if (v.source === 'home' && v.courseTitle) return `სახლში · ${v.courseTitle}`;
  if (v.source === 'group' && v.courseTitle) return v.courseTitle;
  return v.students.map((s) => s.name).join(', ') || 'გაკვეთილი';
}

export function virtualStudentsLabel(v: VirtualScheduleEvent) {
  return v.students.map((s) => s.name).join(', ');
}

export function virtualTooltip(v: VirtualScheduleEvent) {
  const names = virtualStudentsLabel(v);
  const course = v.courseTitle ? ` · ${v.courseTitle}` : '';
  return `${names} · ${v.startTime}–${v.endTime}${course}`;
}
