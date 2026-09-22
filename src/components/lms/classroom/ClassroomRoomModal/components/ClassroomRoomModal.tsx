'use client';

import { useMemo, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { ClassroomAiModal } from '../../ClassroomAiModal';
import { ClassroomHeader } from './ClassroomHeader';
import { ClassroomWhiteboardPanel } from './ClassroomWhiteboardPanel';
import { ClassroomLoading } from './ClassroomLoading';
import { ClassroomError } from './ClassroomError';
import { BoardFullscreenSensor } from './classroom-video-panel/BoardFullscreenSensor';
import { CollapsibleVideoPanel } from './classroom-video-panel/CollapsibleVideoPanel';
import { BoardControlContextProvider } from './BoardControlContext';
import { useLiveKitToken } from '../hooks/useLiveKitToken';
import { useClassroomFullscreen } from '../hooks/useClassroomFullscreen';
import { useHideAiWidget } from '../hooks/useHideAiWidget';
import { useTeacherKick } from '../hooks/useTeacherKick';
import { useWhiteboardHistory } from './classroom-video-panel/hooks/use-white-board-history';
import { useBoardControlState } from '../../ClassWhiteboard/hooks/useBoardControlState';
import { useEnrolledStudents } from '../../ClassWhiteboard/hooks/useEnrolledStudents';
import { usePublishDataSafe } from '../../ClassWhiteboard/hooks/usePublishDataSafe';

interface ClassroomRoomModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  isTeacher?: boolean;
  onTeacherLeft?: () => void;
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
}

export function ClassroomRoomModal({
  courseId,
  courseTitle,
  onClose,
  isTeacher = false,
  onTeacherLeft,
  enableSlashPrompts = false,
  slashPromptsUserId = '',
}: ClassroomRoomModalProps) {
  const classroomRootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'board'>('split');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const { token, loading, error, secondary } = useLiveKitToken(courseId);
  const { isBoardFullscreen, isChromeOpen, setIsChromeOpen, toggleClassroomFullscreen } =
    useClassroomFullscreen(classroomRootRef);
  const { undo, redo } = useWhiteboardHistory();

  useHideAiWidget();
  useTeacherKick(courseId, activeRoom, isTeacher, onTeacherLeft);

  const { students } = useEnrolledStudents(courseId, isTeacher);
  const publishDataSafe = usePublishDataSafe(activeRoom);
  const boardControl = useBoardControlState({
    room: activeRoom,
    isTeacher,
    students,
    publishDataSafe,
  });

  const boardControlValue = useMemo(
    () => ({
      presentStudents: boardControl.presentStudents,
      lockedStudentIds: boardControl.lockedStudentIds,
      toggleStudentLock: boardControl.toggleStudentLock,
    }),
    [boardControl.presentStudents, boardControl.lockedStudentIds, boardControl.toggleStudentLock],
  );

  if (loading) return <ClassroomLoading />;
  if (error || !token) return <ClassroomError error={error} onClose={onClose} />;

  return (
    <BoardControlContextProvider value={boardControlValue}>
      <div
        ref={classroomRootRef}
        className={`fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 ${
          isBoardFullscreen
            ? 'p-0'
            : 'pt-2 pr-2 pl-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pt-3 sm:pr-3 sm:pl-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
        }`}>
        {isTeacher && <ClassroomAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />}

        {isBoardFullscreen && <BoardFullscreenSensor onEnter={() => setIsChromeOpen(true)} />}

        <ClassroomHeader
          courseTitle={courseTitle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isBoardFullscreen={isBoardFullscreen}
          isChromeOpen={isChromeOpen}
          setIsChromeOpen={setIsChromeOpen}
          isTeacher={isTeacher}
          onClose={onClose}
          handleUndo={undo}
          handleRedo={redo}
          setIsAiModalOpen={setIsAiModalOpen}
        />

        <main
          className={`relative flex flex-1 min-h-0 w-full overflow-hidden bg-slate-900 ${
            isBoardFullscreen ? '' : 'rounded-2xl border border-white/10'
          }`}>
          <div
            className={`flex h-full w-full min-h-0 min-w-0 flex-col lg:flex-row ${
              isBoardFullscreen ? 'gap-0 p-0' : 'gap-2.5 p-2'
            }`}>
            <CollapsibleVideoPanel
              hidden={activeTab === 'board'}
              token={token}
              courseId={courseId}
              isTeacher={isTeacher}
              secondary={secondary}
              onClose={onClose}
              onRoom={setActiveRoom}
            />

            <ClassroomWhiteboardPanel
              room={activeRoom}
              courseId={courseId}
              courseTitle={courseTitle}
              isFullscreen={isBoardFullscreen}
              onToggleFullscreen={toggleClassroomFullscreen}
              isTeacher={isTeacher}
              students={students}
              enableSlashPrompts={enableSlashPrompts}
              slashPromptsUserId={slashPromptsUserId}
            />
          </div>
        </main>
      </div>
    </BoardControlContextProvider>
  );
}