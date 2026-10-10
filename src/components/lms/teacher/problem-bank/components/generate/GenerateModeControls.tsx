'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import { locales, type Locale } from '@/i18n/config';
import { parseFamilyKind, type AiCheckMode, type ProblemBankCopy } from '@/lib/math/problems';
import type { ProblemGenMode } from '../../problem-bank-workspace.types';

type GenerateModeControlsProps = {
  copy: ProblemBankCopy;
  genId: string;
  genMode: ProblemGenMode;
  setGenMode: (mode: ProblemGenMode) => void;
  genKind: string;
  setGenKind: (kind: string) => void;
  genCheck: AiCheckMode;
  setGenCheck: (check: AiCheckMode) => void;
  genReplyLocale: Locale;
  setGenReplyLocale: (locale: Locale) => void;
};

export function GenerateModeControls({
  copy,
  genId,
  genMode,
  setGenMode,
  genKind,
  setGenKind,
  genCheck,
  setGenCheck,
  genReplyLocale,
  setGenReplyLocale,
}: GenerateModeControlsProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div
        className="flex w-full flex-col gap-1 rounded-box border border-hairline bg-sectionHeader p-1 sm:inline-flex sm:w-auto sm:flex-row"
        role="group"
        aria-label={copy.generate.mode}>
        <button
          type="button"
          className={[
            'w-full rounded-box px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
            genMode === 'diverse'
              ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'text-body hover:bg-mainButtonHover hover:text-mainText',
          ].join(' ')}
          aria-pressed={genMode === 'diverse'}
          onClick={() => setGenMode('diverse')}>
          {copy.generate.modeDiverse}
        </button>
        <button
          type="button"
          className={[
            'w-full rounded-box px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
            genMode === 'algorithms'
              ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'text-body hover:bg-mainButtonHover hover:text-mainText',
          ].join(' ')}
          aria-pressed={genMode === 'algorithms'}
          onClick={() => {
            if (parseFamilyKind(genKind)) {
              setGenKind('any');
            }
            setGenMode('algorithms');
          }}>
          {copy.generate.modeAlgorithms}
        </button>
        <button
          type="button"
          className={[
            'w-full rounded-box px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
            genMode === 'families'
              ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'text-body hover:bg-mainButtonHover hover:text-mainText',
          ].join(' ')}
          aria-pressed={genMode === 'families'}
          onClick={() => {
            if (!parseFamilyKind(genKind) && genKind !== 'any') {
              setGenKind('any');
            }
            setGenMode('families');
          }}>
          {copy.generate.modeFamilies}
        </button>
      </div>
      {genMode === 'diverse' ? (
        <>
          <div
            className="flex w-full flex-col gap-1 rounded-box border border-hairline bg-sectionHeader p-1 sm:inline-flex sm:w-auto sm:flex-row"
            role="group"
            aria-label={copy.generate.checkMode}>
            <button
              type="button"
              className={[
                'w-full rounded-box px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                genCheck === 'verified'
                  ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-body hover:bg-mainButtonHover hover:text-mainText',
              ].join(' ')}
              aria-pressed={genCheck === 'verified'}
              onClick={() => setGenCheck('verified')}>
              {copy.generate.modeVerified}
            </button>
            <button
              type="button"
              className={[
                'w-full rounded-box px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                genCheck === 'plain'
                  ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-body hover:bg-mainButtonHover hover:text-mainText',
              ].join(' ')}
              aria-pressed={genCheck === 'plain'}
              onClick={() => setGenCheck('plain')}>
              {copy.generate.modePlain}
            </button>
          </div>
          <div className="flex min-w-0 w-full rounded-box border border-hairline bg-sectionHeader p-1 sm:w-auto sm:min-w-[10.5rem]">
            <SelectMenu
              id={`${genId}-reply-language`}
              className="w-full"
              triggerClassName="border-0 py-1.5 font-semibold shadow-none hover:border-0 focus-visible:ring-0"
              value={genReplyLocale}
              onChange={(value) => setGenReplyLocale(value as Locale)}
              options={locales.map((id) => ({
                value: id,
                label: copy.chat.languages[id],
              }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
