import type { ProblemBankActionContext } from './problem-bank-action-context';

export function bindSelectionActions(ctx: ProblemBankActionContext) {
  function clearLongPressTimer() {
    if (ctx.longPressTimerRef.current) {
      clearTimeout(ctx.longPressTimerRef.current);
      ctx.longPressTimerRef.current = null;
    }
  }

  function exitBulkSelectMode() {
    clearLongPressTimer();
    ctx.setBulkSelectMode(false);
    ctx.setSelectedProblemIds([]);
    ctx.setConfirmBulkDelete(false);
  }

  function beginCardLongPress(problemId: string) {
    if (ctx.bulkSelectMode) return;
    clearLongPressTimer();
    ctx.longPressTriggeredRef.current = false;
    ctx.longPressTimerRef.current = setTimeout(() => {
      ctx.longPressTriggeredRef.current = true;
      ctx.longPressTimerRef.current = null;
      ctx.setBulkSelectMode(true);
      ctx.setConfirmBulkDelete(false);
      ctx.setSelectedProblemIds([problemId]);
      ctx.setSelectedId(problemId);
      ctx.setShowSolution(false);
    }, 1000);
  }

  function endCardLongPress() {
    clearLongPressTimer();
  }

  function toggleProblemSelected(id: string) {
    ctx.setConfirmBulkDelete(false);
    const next = ctx.selectedProblemIds.includes(id)
      ? ctx.selectedProblemIds.filter((item) => item !== id)
      : [...ctx.selectedProblemIds, id];
    ctx.setSelectedProblemIds(next);
    if (next.length === 0) {
      ctx.setBulkSelectMode(false);
    }
  }

  function toggleSelectAllVisible() {
    ctx.setConfirmBulkDelete(false);
    if (ctx.allVisibleSelected) {
      ctx.setSelectedProblemIds([]);
      ctx.setBulkSelectMode(false);
      return;
    }
    ctx.setSelectedProblemIds((current) => [...new Set([...current, ...ctx.visibleIds])]);
  }

  return {
    exitBulkSelectMode,
    beginCardLongPress,
    endCardLongPress,
    toggleProblemSelected,
    toggleSelectAllVisible,
  };
}
