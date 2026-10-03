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
      className={`flex h-12 shrink-0 items-center justify-between px-3 text-mainText bg-main border-border/20 gap-2 ${
        isBoardFullscreen
          ? `absolute inset-x-0 top-0 z-[1100] rounded-box border-b transition-transform duration-200 ${
              isChromeOpen ? 'translate-y-0' : '-translate-y-full'
            }`
          : 'relative z-40 rounded-box border mb-2'
      }`}>
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm sm:text-base font-bold truncate">{courseTitle} — გაკვეთილი</h2>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <div className="flex items-center gap-1 bg-mainButton rounded-box border border-border/20">
            <button
              type="button"
              onClick={handleUndo}
              title="უკან დაბრუნება (Undo)"
              className="flex size-7 items-center justify-center rounded-box text-mainText hover:bg-mainButtonHover hover:text-mainText transition-all active:scale-95">
              <Undo className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              title="წინ გადასვლა (Redo)"
              className="flex size-7 items-center justify-center rounded-box text-mainText hover:bg-mainButtonHover hover:text-mainText transition-all active:scale-95">
              <Redo className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1  bg-main p-1 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`group relative flex items-center gap-1.5 rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'split'
                ? 'border border-black/15 bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.1)] dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.2)]'
                : 'border border-transparent text-mainText/70 hover:bg-mainButton/50 hover:text-mainText'
            }`}>
            <Layout className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">ვიდეო + დაფა</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`group relative flex items-center gap-1.5 rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'video'
                ? 'border border-black/15 bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.1)] dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.2)]'
                : 'border border-transparent text-mainText/70 hover:bg-mainButton/50 hover:text-mainText'
            }`}>
            <Video className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">ვიდეო</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`group relative flex items-center gap-1.5 rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'board'
                ? 'border border-black/15 bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.1)] dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.2)]'
                : 'border border-transparent text-mainText/70 hover:bg-mainButton/50 hover:text-mainText'
            }`}>
            <PenTool className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">დაფა</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-box bg-navy hover:bg-navy/80 text-white text-xs font-bold transition-colors shadow-xs">
            <Sparkles className="size-3.5 text-indigo-200" />
            <span className="hidden sm:inline">AI ასისტენტი</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          title="გაკვეთილის დახურვა"
          className="flex size-8 shrink-0 items-center justify-center rounded-box bg-mainButton hover:bg-loss text-mainText transition-colors">
          <X className="size-4 text-border" />
        </button>
      </div>
    </header>
  );
}
