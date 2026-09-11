//CUT

'use client';

import { useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { ClassroomAiModal } from '../../ClassroomAiModal';
import { ClassroomHeader } from './ClassroomHeader';
import { ClassroomVideoPanel } from './ClassroomVideoPanel';
import { ClassroomWhiteboardPanel } from './ClassroomWhiteboardPanel';
import { ClassroomLoading } from './ClassroomLoading';
import { ClassroomError } from './ClassroomError';
import { useLiveKitToken } from '../hooks/useLiveKitToken';
import { useClassroomFullscreen } from '../hooks/useClassroomFullscreen';
import { useHideAiWidget } from '../hooks/useHideAiWidget';
import { useTeacherKick } from '../hooks/useTeacherKick';

interface ClassroomRoomModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  isTeacher?: boolean;
  onTeacherLeft?: () => void;
}

export function ClassroomRoomModal({
  courseId,
  courseTitle,
  onClose,
  isTeacher = false,
  onTeacherLeft,
}: ClassroomRoomModalProps) {
  const classroomRootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'board'>('split');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  // ვიდეო პანელის ჩაკეცვის/გაშლის სტატუსი
  const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);

  const { token, loading, error } = useLiveKitToken(courseId);
  const { isBoardFullscreen, isChromeOpen, setIsChromeOpen, toggleClassroomFullscreen } =
    useClassroomFullscreen(classroomRootRef);

  useHideAiWidget();
  useTeacherKick(courseId, activeRoom, isTeacher, onTeacherLeft);

  const handleUndo = () => {
    window.dispatchEvent(new CustomEvent('whiteboard-undo'));
  };

  const handleRedo = () => {
    window.dispatchEvent(new CustomEvent('whiteboard-redo'));
  };

  if (loading) {
    return <ClassroomLoading />;
  }

  if (error || !token) {
    return <ClassroomError error={error} onClose={onClose} />;
  }

  return (
    <div
      ref={classroomRootRef}
      className={`fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 ${
        isBoardFullscreen
          ? 'p-0'
          : 'pt-2 pr-2 pl-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pt-3 sm:pr-3 sm:pl-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
      }`}>
      {isTeacher && <ClassroomAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />}

      {isBoardFullscreen && (
        <div className="absolute inset-x-0 top-0 z-[1100] h-3" onMouseEnter={() => setIsChromeOpen(true)} />
      )}

      <ClassroomHeader
        courseTitle={courseTitle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBoardFullscreen={isBoardFullscreen}
        isChromeOpen={isChromeOpen}
        setIsChromeOpen={setIsChromeOpen}
        isTeacher={isTeacher}
        onClose={onClose}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
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
          {/* ვიდეო პანელის კონტეინერი დინამიური ზომით */}
          <div
            className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-slate-950/80 border border-white/5 transition-all duration-300 ease-in-out ${
              activeTab === 'board'
                ? 'hidden'
                : isVideoCollapsed
                  ? 'w-full lg:w-[140px] shrink-0' // ჩაკეცილი მდგომარეობა (ვიწრო ზოლი)
                  : 'w-full lg:w-[260px] xl:w-[300px] shrink-0' // დავიწროებული სტანდარტული ზომა
            }`}>
            {/* ჩაკეცვის / გაშლის დინამიური ღილაკი */}
            <button
              onClick={() => setIsVideoCollapsed(!isVideoCollapsed)}
              title={isVideoCollapsed ? 'პანელის გაშლა' : 'პანელის ჩაკეცვა'}
              className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white">
              {isVideoCollapsed ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7M19 19l-7-7 7-7"
                  />
                </svg>
              )}
            </button>

            <ClassroomVideoPanel
              token={token}
              courseId={courseId}
              isTeacher={isTeacher}
              onClose={onClose}
              onRoom={setActiveRoom}
            />
          </div>

          <ClassroomWhiteboardPanel
            room={activeRoom}
            courseId={courseId}
            courseTitle={courseTitle}
            isFullscreen={isBoardFullscreen}
            onToggleFullscreen={toggleClassroomFullscreen}
            isTeacher={isTeacher}
          />
        </div>
      </main>
    </div>
  );
}
