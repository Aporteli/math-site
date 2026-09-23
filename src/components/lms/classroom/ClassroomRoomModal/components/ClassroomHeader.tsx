//CUT შეიძლება

'use client';

import { X, Layout, PenTool, Sparkles, Undo, Redo, Video } from 'lucide-react';

interface ClassroomHeaderProps {
  courseTitle: string;
  activeTab: 'split' | 'board' | 'video';
  setActiveTab: (tab: 'split' | 'board' | 'video') => void;
  isBoardFullscreen: boolean;
  isChromeOpen: boolean;
  setIsChromeOpen: (open: boolean) => void;
  isTeacher: boolean;
  onClose: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  setIsAiModalOpen: (open: boolean) => void;
}

export function ClassroomHeader({
  courseTitle,
  activeTab,
  setActiveTab,
  isBoardFullscreen,
  isChromeOpen,
  setIsChromeOpen,
  isTeacher,
  onClose,
  handleUndo,
  handleRedo,
  setIsAiModalOpen,
}: ClassroomHeaderProps) {
  return (
    <header
      onMouseEnter={() => isBoardFullscreen && setIsChromeOpen(true)}
      onMouseLeave={() => isBoardFullscreen && setIsChromeOpen(false)}
      className={`flex h-12 shrink-0 items-center justify-between px-3 text-white bg-slate-900 border-white/10 gap-2 ${
        isBoardFullscreen
          ? `absolute inset-x-0 top-0 z-[1100] rounded-none border-b transition-transform duration-200 ${
              isChromeOpen ? 'translate-y-0' : '-translate-y-full'
            }`
          : 'relative z-40 rounded-xl border mb-2'
      }`}>
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm sm:text-base font-bold truncate">{courseTitle} — გაკვეთილი</h2>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={handleUndo}
              title="უკან დაბრუნება (Undo)"
              className="flex size-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-95">
              <Undo className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              title="წინ გადასვლა (Redo)"
              className="flex size-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-95">
              <Redo className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
            }`}>
            <Layout className="size-3.5" />
            <span className="hidden sm:inline">ვიდეო + დაფა</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'video' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
            }`}>
            <Video className="size-3.5" />
            <span className="hidden sm:inline">ვიდეო</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
            }`}>
            <PenTool className="size-3.5" />
            <span className="hidden sm:inline">დაფა</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-xs">
            <Sparkles className="size-3.5 text-indigo-200" />
            <span className="hidden sm:inline">AI ასისტენტი</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          title="გაკვეთილის დახურვა"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors">
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
