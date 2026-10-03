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

  /** When true, zoom + board navigation are disabled — lock/sync feature. */
  disabled?: boolean;
}

export function BottomPanel(props: Props) {
  return (
    <div className={`relative z-[100] flex w-full min-w-0 flex-col items-center justify-center pt-1 px-1 sm:px-2 pointer-events-auto shrink-0 select-none ${
      props.isFullscreen ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]' : 'pb-3'
    }`}>
      <div className="thin-scrollbar w-max max-w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain rounded-box border border-hairline bg-sectionHeader shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
        <div className="flex w-max items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5">
          <ZoomControls
            zoomPercent={props.zoomPercent}
            onZoomIn={props.onZoomIn}
            onZoomOut={props.onZoomOut}
            onZoomReset={props.onZoomReset}
            onFit={props.onFit}
            disabled={props.disabled}
          />
          <div className="flex shrink-0 items-center border-r border-hairline pr-1.5">
            <button
              type="button"
              onClick={props.onToggleFullscreen}
              aria-label={props.isFullscreen ? 'სრული ეკრანიდან გამოსვლა' : 'სრული ეკრანი'}
              title={props.isFullscreen ? 'სრული ეკრანიდან გამოსვლა' : 'სრული ეკრანი'}
              className="flex size-7 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] sm:size-8"
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
            disabled={props.disabled}
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