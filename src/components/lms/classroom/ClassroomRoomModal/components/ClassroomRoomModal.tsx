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
import { useClassroomFullscreen } from '../hooks/useClassroomFullscreen';
import { useHideAiWidget } from '../hooks/useHideAiWidget';
import { useTeacherKick } from '../hooks/useTeacherKick';
import { BreakoutContext } from '../breakout/BreakoutContext';
import { BoardDataRoom } from '../breakout/BoardDataRoom';
import { BreakoutDashboard } from '../breakout/BreakoutDashboard';
import { MonitorRoom } from '../breakout/MonitorRoom';
import { useClassroomConnection } from '../breakout/useClassroomConnection';
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
  const [activeTab, setActiveTab] = useState<'split' | 'board' | 'video'>('split');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const connection = useClassroomConnection(courseId, isTeacher);
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
      pageCount: boardControl.pageCount,
      setPageCount: boardControl.setPageCount,
      assignedPageByStudent: boardControl.assignedPageByStudent,
      assignStudentPage: boardControl.assignStudentPage,
      clearBoardAssignments: boardControl.clearBoardAssignments,
    }),
    [
      boardControl.presentStudents,
      boardControl.lockedStudentIds,
      boardControl.toggleStudentLock,
      boardControl.pageCount,
      boardControl.setPageCount,
      boardControl.assignedPageByStudent,
      boardControl.assignStudentPage,
      boardControl.clearBoardAssignments,
    ],
  );

  if (connection.loading) return <ClassroomLoading />;
  if (connection.error || !connection.mediaToken) return <ClassroomError error={connection.error} onClose={onClose} />;

  return (
    <BreakoutContext.Provider value={connection}>
      <BoardControlContextProvider value={boardControlValue}>
        <div
          ref={classroomRootRef}
          data-classroom-root
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
                expanded={activeTab === 'video'}
                token={connection.mediaToken}
                courseId={courseId}
                isTeacher={isTeacher}
                secondary={connection.secondary}
                onClose={onClose}
                onRoom={setActiveRoom}
              />

              {connection.boardToken && <BoardDataRoom token={connection.boardToken} onRoom={setActiveRoom} />}
              {isTeacher && connection.monitorTokens.main && (
                <MonitorRoom token={connection.monitorTokens.main} roomKey="main" />
              )}
              {isTeacher && connection.monitorTokens.a && (
                <MonitorRoom token={connection.monitorTokens.a} roomKey="a" />
              )}
              {isTeacher && connection.monitorTokens.b && (
                <MonitorRoom token={connection.monitorTokens.b} roomKey="b" />
              )}
              {isTeacher && <BreakoutDashboard students={students} />}

              <ClassroomWhiteboardPanel
                room={activeRoom}
                hidden={activeTab === 'video'}

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
    </BreakoutContext.Provider>
  );
}
