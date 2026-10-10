import type { EventColor, ReminderOption, RepeatOption } from './types';

export const WEEKDAY_LABELS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
export const MONTH_LABELS = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

export const COLOR_OPTIONS: EventColor[] = ['navy', 'sky', 'emerald', 'amber', 'rose', 'violet'];

export const COLOR_DOT: Record<EventColor, string> = {
  navy: 'bg-navy',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};

export const COLOR_CHIP: Record<EventColor, string> = {
  navy: 'bg-navy text-white border-navy',
  sky: 'bg-sky-500 text-white border-sky-600',
  emerald: 'bg-emerald-500 text-white border-emerald-600',
  amber: 'bg-amber-500 text-white border-amber-600',
  rose: 'bg-rose-500 text-white border-rose-600',
  violet: 'bg-violet-500 text-white border-violet-600',
};

export const REMINDER_LABELS: Record<ReminderOption, string> = {
  none: 'შეხსენების გარეშე',
  '0': 'ღონისძიების დაწყებისას',
  '10': '10 წუთით ადრე',
  '30': '30 წუთით ადრე',
  '60': '1 საათით ადრე',
  '1440': '1 დღით ადრე',
};

export const REPEAT_LABELS: Record<RepeatOption, string> = {
  none: 'არ მეორდება',
  daily: 'ყოველდღიურად',
  weekly: 'ყოველკვირეულად',
  monthly: 'ყოველთვიურად',
};

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const HOUR_HEIGHT = 60;

export const POPOVER_QUICK_WIDTH = 320;
export const POPOVER_FULL_WIDTH = 400;
export const POPOVER_QUICK_HEIGHT = 280;
export const POPOVER_EXPANDED_HEIGHT = 540;
export const VIRTUAL_POPUP_WIDTH = 320;
