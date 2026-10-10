'use client';

import { buildMenuItems } from './buildMenuItems';
import { ProblemCardDropdown } from './ProblemCardDropdown';
import { ProblemCardMenuTrigger } from './ProblemCardMenuTrigger';
import { SendProblemModal } from './SendProblemModal';
import type { ProblemCardMenuProps } from './types';
import { useClassSendModal } from './useClassSendModal';
import { useProblemCardMenu } from './useProblemCardMenu';

export function ProblemCardMenu({
  problem,
  copy,
  onEdit,
  onAskAi,
  onCopyPrompt,
  onDiscard,
}: ProblemCardMenuProps) {
  const classSend = useClassSendModal(problem);
  const menu = useProblemCardMenu();

  const items = buildMenuItems({
    problem,
    copy,
    onEdit,
    onAskAi,
    onCopyPrompt,
    onDiscard,
    run: menu.run,
    setOpen: menu.setOpen,
    setIsClassModalOpen: classSend.setIsClassModalOpen,
  });

  return (
    <div ref={menu.rootRef} className="absolute top-2 right-2 z-10">
      <ProblemCardMenuTrigger
        triggerRef={menu.triggerRef}
        open={menu.open}
        menuId={menu.menuId}
        label={copy.cardMenu.open}
        onClick={(event) => {
          event.stopPropagation();
          menu.setOpen((value) => !value);
        }}
      />

      {menu.open && typeof document !== 'undefined' ? (
        <ProblemCardDropdown menuRef={menu.menuRef} menuId={menu.menuId} coords={menu.coords} items={items} />
      ) : null}

      {classSend.isClassModalOpen && typeof document !== 'undefined' ? (
        <SendProblemModal
          searchQuery={classSend.searchQuery}
          onSearchQueryChange={classSend.setSearchQuery}
          assignComment={classSend.assignComment}
          onAssignCommentChange={classSend.setAssignComment}
          groups={classSend.filteredCourseGroups}
          isLoading={classSend.isLoadingClasses}
          expandedCourseIds={classSend.expandedCourseIds}
          sentClassIds={classSend.sentClassIds}
          sendingClassId={classSend.sendingClassId}
          sentStudentIds={classSend.sentStudentIds}
          sendingStudentId={classSend.sendingStudentId}
          onToggleExpand={classSend.toggleCourseExpand}
          onSendToClass={classSend.handleSendToClass}
          onSendToStudent={classSend.handleSendToStudent}
          onClose={() => classSend.setIsClassModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
