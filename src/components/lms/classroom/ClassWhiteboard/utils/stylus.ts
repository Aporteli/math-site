import type { StylusButtonAction } from '../constants/stylus';
import { STYLUS_BUTTON_ACTIONS } from '../constants/stylus';

export function isStylusButtonAction(value: unknown): value is StylusButtonAction {
  return typeof value === 'string' && (STYLUS_BUTTON_ACTIONS as string[]).includes(value);
}

export function getStylusButtonFromKeyboard(e: KeyboardEvent): 1 | 2 | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const key = e.key;
  const code = e.code;
  const keyCode = e.keyCode || 0;

  if (
    keyCode === 308 ||
    key === 'PageDown' ||
    code === 'PageDown' ||
    key === 'VolumeDown' ||
    code === 'AudioVolumeDown' ||
    key === 'F19' ||
    code === 'F19'
  ) {
    return 1;
  }
  if (
    keyCode === 309 ||
    key === 'PageUp' ||
    code === 'PageUp' ||
    key === 'VolumeUp' ||
    code === 'AudioVolumeUp' ||
    key === 'F20' ||
    code === 'F20'
  ) {
    return 2;
  }
  return null;
}
