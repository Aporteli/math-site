'use client';

import { useDashboardFrame } from '@/components/layout/DashboardFrame';
import { DayView } from './components/DayView';
import { EventPopover } from './components/EventPopover';
import { JournalLegend } from './components/JournalLegend';
import { JournalToolbar } from './components/JournalToolbar';
import { MonthView } from './components/MonthView';
import { ScheduleView } from './components/ScheduleView';
import { VirtualLessonPopup } from './components/VirtualLessonPopup';
import { WeekView } from './components/WeekView';
import { useJournalCalendar } from './hooks/useJournalCalendar';
import { useJournalData } from './hooks/useJournalData';
import { useJournalDrag } from './hooks/useJournalDrag';
import { useJournalPopover } from './hooks/useJournalPopover';

export function TeacherJournalWorkspace() {
  const { toggleSidebarDrawer } = useDashboardFrame();
  const { events, setEvents, virtualEvents, participantGroups, participantsLoading } = useJournalData();
  const {
    currentDate,
    view,
    setView,
    viewMenuOpen,
    setViewMenuOpen,
    today,
    monthGrid,
    weekGrid,
    eventsByDate,
    virtualByDate,
    goToPrev,
    goToNext,
    goToToday,
    headerTitle,
  } = useJournalCalendar(events, virtualEvents);
  const { dragPreview, didDragRef, handleEventPointerDown, handleEventPointerMove, handleEventPointerUp } =
    useJournalDrag(events, setEvents);
  const {
    isSaving,
    popover,
    expanded,
    guestDraft,
    setGuestDraft,
    virtualPopup,
    setVirtualPopup,
    participantsOpen,
    setParticipantsOpen,
    participantSearch,
    setParticipantSearch,
    closePopover,
    openCreateFromElement,
    openVirtualPopup,
    handleEventClick,
    handleAddClick,
    toggleExpandMore,
    updateDraft,
    handleSave,
    handleDelete,
    addGuest,
    removeGuest,
    isParticipantSelected,
    toggleParticipant,
    removeParticipant,
    draft,
  } = useJournalPopover(setEvents, today, didDragRef);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <JournalToolbar
        onToggleSidebar={toggleSidebarDrawer}
        headerTitle={headerTitle}
        onToday={goToToday}
        onPrev={goToPrev}
        onNext={goToNext}
        view={view}
        viewMenuOpen={viewMenuOpen}
        setView={setView}
        setViewMenuOpen={setViewMenuOpen}
        onAdd={handleAddClick}
      />
      <JournalLegend />

      {view === 'month' && (
        <MonthView
          monthGrid={monthGrid}
          eventsByDate={eventsByDate}
          virtualByDate={virtualByDate}
          today={today}
          onOpenCreate={openCreateFromElement}
          onEventClick={handleEventClick}
          onOpenVirtual={openVirtualPopup}
        />
      )}

      {view === 'week' && (
        <WeekView
          weekGrid={weekGrid}
          eventsByDate={eventsByDate}
          virtualByDate={virtualByDate}
          today={today}
          dragPreview={dragPreview}
          onOpenCreate={openCreateFromElement}
          onOpenVirtual={openVirtualPopup}
          onEventPointerDown={handleEventPointerDown}
          onEventPointerMove={handleEventPointerMove}
          onEventPointerUp={handleEventPointerUp}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          virtualByDate={virtualByDate}
          today={today}
          dragPreview={dragPreview}
          onOpenCreate={openCreateFromElement}
          onOpenVirtual={openVirtualPopup}
          onEventPointerDown={handleEventPointerDown}
          onEventPointerMove={handleEventPointerMove}
          onEventPointerUp={handleEventPointerUp}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'schedule' && (
        <ScheduleView
          eventsByDate={eventsByDate}
          virtualByDate={virtualByDate}
          today={today}
          onEventClick={handleEventClick}
          onOpenVirtual={openVirtualPopup}
        />
      )}

      <VirtualLessonPopup virtualPopup={virtualPopup} setVirtualPopup={setVirtualPopup} />
      <EventPopover
        popover={popover}
        draft={draft}
        expanded={expanded}
        isSaving={isSaving}
        guestDraft={guestDraft}
        setGuestDraft={setGuestDraft}
        participantsOpen={participantsOpen}
        setParticipantsOpen={setParticipantsOpen}
        participantSearch={participantSearch}
        setParticipantSearch={setParticipantSearch}
        participantGroups={participantGroups}
        participantsLoading={participantsLoading}
        onClose={closePopover}
        onUpdateDraft={updateDraft}
        onSave={handleSave}
        onDelete={handleDelete}
        onExpand={toggleExpandMore}
        onAddGuest={addGuest}
        onRemoveGuest={removeGuest}
        onRemoveParticipant={removeParticipant}
        onToggleParticipant={toggleParticipant}
        isParticipantSelected={isParticipantSelected}
      />
    </div>
  );
}
