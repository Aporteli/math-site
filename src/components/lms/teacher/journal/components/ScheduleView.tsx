'use client';

import { Clock, List, MapPin, Repeat, Users } from 'lucide-react';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { COLOR_DOT, WEEKDAY_LABELS } from '../constants';
import { isSameDay } from '../journal-time';
import type { EventClickHandler, JournalEvent, OpenVirtualHandler } from '../types';
import { virtualChipClass, virtualStudentsLabel, virtualTitle } from '../virtual-labels';

interface ScheduleViewProps {
  eventsByDate: Record<string, JournalEvent[]>;
  virtualByDate: Record<string, VirtualScheduleEvent[]>;
  today: Date;
  onEventClick: EventClickHandler;
  onOpenVirtual: OpenVirtualHandler;
}

export function ScheduleView({
  eventsByDate,
  virtualByDate,
  today,
  onEventClick,
  onOpenVirtual,
}: ScheduleViewProps) {
  return (
    <div className="thin-scrollbar h-full min-h-0 flex-1 overflow-y-auto bg-sectionHeader p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {Object.keys(eventsByDate)
          .sort()
          .map((dateKey) => {
            const dateObj = new Date(dateKey);
            return (
              <div key={dateKey} className="flex gap-6 relative">
                <div className="w-16 shrink-0 text-center flex flex-col items-center">
                  <span className="text-xs font-bold text-muted uppercase">
                    {WEEKDAY_LABELS[(dateObj.getDay() + 6) % 7]}
                  </span>
                  <span
                    className={`mt-1 text-2xl font-black ${isSameDay(dateObj, today) ? 'text-[#465D73]' : 'text-ink'}`}>
                    {dateObj.getDate()}
                  </span>
                </div>
                <div className="flex-1 space-y-2 pt-1">
                  {eventsByDate[dateKey].map((ev) => (
                    <div
                      key={`${ev.id}-${dateKey}`}
                      onClick={(e) => onEventClick(e as any, ev)}
                      className="flex cursor-pointer items-center gap-4 rounded-box border border-hairline bg-main p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md">
                      <div className={`size-2.5 rounded-box ${COLOR_DOT[ev.color]}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-ink">{ev.title || '(უსათაურო)'}</h4>
                          {ev.repeat !== 'none' && <Repeat className=" text-brass-strong size-3 " />}
                          {(ev.participants?.length ?? 0) > 0 && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-navy font-bold">
                              <Users className="size-3" />
                              {ev.participants!.length}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-[11px] text-muted font-medium">
                          {ev.allDay ? (
                            <span>მთელი დღე</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-brass-strong " /> {ev.startTime} - {ev.endTime}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" /> {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* ─── Virtual schedule lessons (Google Calendar style) ─── */}
                  {(virtualByDate[dateKey] ?? []).map((v) => (
                    <div
                      key={v.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVirtual(e.currentTarget, v, dateKey);
                      }}
                      className={`flex items-center gap-4 p-3 rounded-box cursor-pointer transition-colors hover:brightness-105 ${virtualChipClass(v.source)}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold truncate">{virtualTitle(v)}</h4>
                          {v.students.length > 1 ? (
                            <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-80 shrink-0">
                              <Users className="size-3" />
                              {v.students.length}
                            </span>
                          ) : null}
                        </div>
                        {v.source !== 'individual' ? (
                          <p className="mt-1 truncate text-[11px] opacity-80 font-medium">{virtualStudentsLabel(v)}</p>
                        ) : null}
                        <div className="flex gap-3 mt-1 text-[11px] opacity-75 font-medium">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="size-3" /> {v.startTime} - {v.endTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        {Object.keys(eventsByDate).length === 0 && Object.keys(virtualByDate).length === 0 && (
          <div className="text-center py-20 text-muted font-medium flex flex-col items-center gap-3">
            <List className="size-8 opacity-20" />
            მომავალი ღონისძიებები არ მოიძებნა
          </div>
        )}
      </div>
    </div>
  );
}
