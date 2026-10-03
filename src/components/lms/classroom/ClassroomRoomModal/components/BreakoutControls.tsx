//CUT


'use client';

import { useCallback, useState } from 'react';
import { useRemoteParticipants } from '@livekit/components-react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useAudioIsolation } from '../hooks/useAudioIsolation';

interface BreakoutControlsProps {
  courseId: string;
  isolatedIdentities: string[];
  onIsolationChange: (isolatedIdentities: string[]) => void;
}

export function BreakoutControls({
  courseId,
  isolatedIdentities,
  onIsolationChange,
}: BreakoutControlsProps) {
  const participants = useRemoteParticipants();
  const { applyIsolation } = useAudioIsolation(courseId);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingIdentity, setPendingIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleIsolation = useCallback(
    async (identity: string) => {
      const nextSet = new Set(isolatedIdentities);
      if (nextSet.has(identity)) {
        nextSet.delete(identity);
      } else {
        nextSet.add(identity);
      }
      const next = Array.from(nextSet);

      setPendingIdentity(identity);
      setError(null);
      try {
        await applyIsolation(next);
        onIsolationChange(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'აუდიო იზოლაცია ვერ შესრულდა');
      } finally {
        setPendingIdentity(null);
      }
    },
    [applyIsolation, isolatedIdentities, onIsolationChange],
  );

  const hasIsolated = isolatedIdentities.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="აუდიო იზოლაცია (Breakout mode)"
        className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-box border px-2.5 text-xs font-bold transition-all duration-200 ${
          isOpen || hasIsolated
            ? 'border-transparent bg-[#A66A32] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
            : 'border-hairline bg-main text-mainText hover:bg-mainButtonHover'
        }`}>
        {hasIsolated ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        <span className="hidden sm:inline">Breakout</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="დახურვა"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
              <span className="text-xs font-bold text-mainText">მოსწავლეების იზოლაცია</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer text-muted transition-colors hover:text-mainText"
                aria-label="დახურვა">
                <span className="text-sm leading-none">×</span>
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs font-medium text-muted">ოთახში სხვა მონაწილეები არ არიან</p>
            ) : (
              <ul className="max-h-56 overflow-y-auto p-1.5">
                {participants.map((participant) => {
                  const identity = participant.identity;
                  const isIsolated = isolatedIdentities.includes(identity);
                  const isPending = pendingIdentity === identity;

                  return (
                    <li key={identity}>
                      <button
                        type="button"
                        onClick={() => toggleIsolation(identity)}
                        disabled={pendingIdentity !== null}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-box px-2.5 py-2 text-left font-bold transition-colors ${
                          isIsolated
                            ? 'bg-brass-tint text-brass-strong'
                            : 'text-mainText hover:bg-sectionHeader'
                        } ${isPending ? 'opacity-60' : ''}`}>
                        <span className="truncate text-xs font-medium">{participant.name || identity}</span>
                        {isPending ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <span
                            className={`shrink-0 rounded-box px-1.5 py-0.5 text-[10px] font-bold ${
                              isIsolated ? 'bg-[#A66A32] text-white' : 'bg-sectionHeader text-muted'
                            }`}>
                            {isIsolated ? 'გამოშვება' : 'იზოლაცია'}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {error && <p className="border-t border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-500">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
