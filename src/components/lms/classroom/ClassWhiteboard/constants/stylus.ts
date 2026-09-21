export type StylusButtonAction =
  | 'temporary-eraser'
  | 'toggle-eraser'
  | 'cycle-colors'
  | 'toggle-laser'
  | 'undo'
  | 'none';

export const STYLUS_BUTTON_ACTIONS: StylusButtonAction[] = [
  'temporary-eraser',
  'toggle-eraser',
  'cycle-colors',
  'toggle-laser',
  'undo',
  'none',
];

export const STYLUS_ACTION_LABELS: Record<StylusButtonAction, string> = {
  'temporary-eraser': 'დროებითი საშლელი',
  'toggle-eraser': 'საშლელის გადართვა',
  'cycle-colors': 'ფერების ციკლი',
  'toggle-laser': 'ლაზერის გადართვა',
  undo: 'უკან დაბრუნება',
  none: 'გამორთული',
};
