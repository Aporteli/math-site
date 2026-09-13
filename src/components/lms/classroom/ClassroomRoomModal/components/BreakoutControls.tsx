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
        className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 transition-all ${
          isOpen || hasIsolated
            ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
            : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white'
        }`}>
        {hasIsolated ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        <span className="hidden text-xs font-semibold sm:inline">Breakout</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="დახურვა"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <span className="text-xs font-bold text-white">მოსწავლეების იზოლაცია</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/50 transition-colors hover:text-white"
                aria-label="დახურვა">
                <span className="text-sm leading-none">×</span>
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-white/50">ოთახში სხვა მონაწილეები არ არიან</p>
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
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isIsolated
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        } ${isPending ? 'opacity-60' : ''}`}>
                        <span className="truncate text-xs font-medium">{participant.name || identity}</span>
                        {isPending ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              isIsolated ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white/60'
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

            {error && <p className="border-t border-rose-500/30 px-3 py-2 text-xs text-rose-400">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
