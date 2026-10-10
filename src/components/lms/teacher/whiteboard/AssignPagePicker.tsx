'use client';

import { AssignBoardThumbnail } from './AssignBoardThumbnail';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function AssignPagePicker({ model }: { model: TeacherWhiteboardModel }) {
  const {
    currentPageIndex,
    isDark,
    pages,
    selectedPagesForAssign,
    setSelectedPagesForAssign,
    togglePageSelection,
  } = model;
  return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-ink">
                    მონიშნული დაფები ({selectedPagesForAssign.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPagesForAssign.length === pages.length) {
                        setSelectedPagesForAssign([currentPageIndex]);
                      } else {
                        setSelectedPagesForAssign(pages.map((_, i) => i));
                      }
                    }}
                    className="text-xs font-bold text-navy hover:underline">
                    {selectedPagesForAssign.length === pages.length ? 'მხოლოდ მიმდინარე' : 'ყველა დაფა'}
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto px-2 py-2 custom-scrollbar border border-hairline rounded-box bg-paper/20">
                  {pages.map((pageElems, idx) => (
                    <AssignBoardThumbnail
                      key={idx}
                      pageIndex={idx}
                      elements={pageElems}
                      isSelected={selectedPagesForAssign.includes(idx)}
                      isDark={isDark}
                      onToggle={() => togglePageSelection(idx)}
                    />
                  ))}
                </div>
              </div>
  );
}
