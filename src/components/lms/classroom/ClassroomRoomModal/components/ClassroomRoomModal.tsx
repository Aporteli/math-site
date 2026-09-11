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

interface ClassroomRoomModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  isTeacher?: boolean;
}

export function ClassroomRoomModal({ courseId, courseTitle, onClose, isTeacher = false }: ClassroomRoomModalProps) {
  const classroomRootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'board'>('split');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const { token, loading, error } = useLiveKitToken(courseId);
  const { isBoardFullscreen, isChromeOpen, setIsChromeOpen, toggleClassroomFullscreen } =
    useClassroomFullscreen(classroomRootRef);
  useHideAiWidget();

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
          <div
            className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-slate-950/80 border border-white/5 transition-all ${
              activeTab === 'board' ? 'hidden' : 'w-full lg:w-[340px] xl:w-[400px] shrink-0'
            }`}>
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
