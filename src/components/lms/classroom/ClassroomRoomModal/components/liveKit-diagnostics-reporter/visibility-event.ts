import { browserVisibility } from './browser';
import type { DiagnosticsSession } from './session';

export function createVisibilityHandler(session: DiagnosticsSession): () => void {
  return () => {
    const visibility = browserVisibility();
    session.push('browser_visibility_changed', {
      visibility,
      message: visibility === 'visible' ? 'Page became visible' : 'Page was hidden',
    });
  };
}
