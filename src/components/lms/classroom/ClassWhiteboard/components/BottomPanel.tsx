'use client';

import type { RefObject } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ZoomControls } from './bottom/ZoomControls';
import { PageNavigation } from './bottom/PageNavigation';
import { TeacherActions } from './bottom/TeacherActions';

interface Props {
  isFullscreen: boolean;
  isTeacher: boolean;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
  onToggleFullscreen: () => void;

  currentPageIndex: number;
  pagesLength: number;
  selectedPagesCount: number;
  isPagesTrayOpen: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleTray: () => void;
  onAddNewPage: () => void;

  onAskAI: () => void;
  onOpenSend: () => void;
}

export function BottomPanel(props: Props) {
  return (
    <div className={`relative z-[100] flex w-full min-w-0 flex-col items-center justify-center pt-1 px-1 sm:px-2 pointer-events-auto shrink-0 select-none ${
      props.isFullscreen ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]' : 'pb-3'
    }`}>
      <div className="w-max max-w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x thin-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl">
        <div className="flex w-max items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5">
          <ZoomControls
            zoomPercent={props.zoomPercent}
            onZoomIn={props.onZoomIn}
            onZoomOut={props.onZoomOut}
            onZoomReset={props.onZoomReset}
            onFit={props.onFit}
          />
          <div className="flex shrink-0 items-center border-r border-slate-200 pr-1.5 dark:border-slate-800">
            <button
              type="button"
              onClick={props.onToggleFullscreen}
              aria-label={props.isFullscreen ? 'სრული ეკრანიდან გამოსვლა' : 'სრული ეკრანი'}
              title={props.isFullscreen ? 'სრული ეკრანიდან გამოსვლა' : 'სრული ეკრანი'}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95"
            >
              {props.isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
          <PageNavigation
            isTeacher={props.isTeacher}
            currentPageIndex={props.currentPageIndex}
            pagesLength={props.pagesLength}
            selectedPagesCount={props.selectedPagesCount}
            isPagesTrayOpen={props.isPagesTrayOpen}
            onPrev={props.onPrevPage}
            onNext={props.onNextPage}
            onToggleTray={props.onToggleTray}
            onAddNewPage={props.onAddNewPage}
          />
          {props.isTeacher && (
            <TeacherActions
              selectedPagesCount={props.selectedPagesCount}
              onAskAI={props.onAskAI}
              onOpenSend={props.onOpenSend}
            />
          )}
        </div>
      </div>
    </div>
  );
}