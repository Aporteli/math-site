import { bindGenerateActions } from './generate-actions';
import type { ProblemBankActionContext } from './problem-bank-action-context';
import { bindPersistActions } from './persist-actions';
import { bindSelectionActions } from './selection-actions';
import { bindUiActions } from './ui-actions';

export function createProblemBankActions(ctx: ProblemBankActionContext) {
  return {
    ...bindGenerateActions(ctx),
    ...bindPersistActions(ctx),
    ...bindSelectionActions(ctx),
    ...bindUiActions(ctx),
  };
}
