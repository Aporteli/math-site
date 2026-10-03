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
      className={`flex h-12 shrink-0 items-center justify-between gap-2 border-hairline bg-sectionHeader px-3 text-mainText ${
        isBoardFullscreen
          ? `absolute inset-x-0 top-0 z-[1100] border-b transition-transform duration-200 ${
              isChromeOpen ? 'translate-y-0' : '-translate-y-full'
            }`
          : 'relative z-40 mb-2 rounded-box border'
      }`}>
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="truncate text-sm font-bold text-mainText sm:text-base">{courseTitle} — გაკვეთილი</h2>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <div className="flex items-center overflow-hidden rounded-box border border-hairline bg-main shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={handleUndo}
              title="უკან დაბრუნება (Undo)"
              className="flex size-7 cursor-pointer items-center justify-center text-icons transition-all duration-200 hover:bg-sectionHeader hover:text-mainText active:scale-[0.98]">
              <Undo className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              title="წინ გადასვლა (Redo)"
              className="flex size-7 cursor-pointer items-center justify-center border-l border-hairline text-icons transition-all duration-200 hover:bg-sectionHeader hover:text-mainText active:scale-[0.98]">
              <Redo className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 bg-sectionHeader p-1">
          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`group relative inline-flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'split' ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
            }`}>
            <Layout className="relative z-10 size-3.5 shrink-0" />
            <span className="relative z-10 hidden sm:inline">ვიდეო + დაფა</span>
            <span
              className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                activeTab === 'split' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`group relative inline-flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'video' ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
            }`}>
            <Video className="relative z-10 size-3.5 shrink-0" />
            <span className="relative z-10 hidden sm:inline">ვიდეო</span>
            <span
              className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                activeTab === 'video' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`group relative inline-flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              activeTab === 'board' ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
            }`}>
            <PenTool className="relative z-10 size-3.5 shrink-0" />
            <span className="relative z-10 hidden sm:inline">დაფა</span>
            <span
              className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                activeTab === 'board' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isTeacher && (
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#465D73] px-3 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">AI ასისტენტი</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          title="გაკვეთილის დახურვა"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box bg-mainButton text-mainText transition-all duration-200 hover:bg-loss hover:text-white active:scale-[0.98]">
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
