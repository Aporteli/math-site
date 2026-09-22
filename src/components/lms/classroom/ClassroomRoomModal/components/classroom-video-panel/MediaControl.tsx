'use client';

import { useLocalParticipant, useMediaDeviceSelect } from '@livekit/components-react';
import { ChevronUp, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { MenuId } from './types';

interface MediaControlProps {
  kind: 'audioinput' | 'videoinput';
  menuId: 'mic' | 'cam';
  /** Nominative form — used in "აირჩიეთ X". */
  nounNom: string;
  /** Genitive form — used in "X ჩართვა / გათიშვა / არჩევა". */
  nounGen: string;
  fallbackPrefix: string;
  activeMenu: MenuId | null;
  setActiveMenu: (m: MenuId | null) => void;
  /** Microphone stays on the account's first device. */
  locked?: boolean;
  lockedTitle?: string;
}

export function MediaControl({
  kind,
  menuId,
  nounNom,
  nounGen,
  fallbackPrefix,
  activeMenu,
  setActiveMenu,
  locked = false,
  lockedTitle,
}: MediaControlProps) {
  const { localParticipant } = useLocalParticipant();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  const isMic = kind === 'audioinput';
  const muted = locked || (isMic
    ? !localParticipant.isMicrophoneEnabled
    : !localParticipant.isCameraEnabled);
  const Icon = isMic ? (muted ? MicOff : Mic) : muted ? VideoOff : Video;

  if (locked) {
    return (
      <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
        <button
          type="button"
          disabled
          title={lockedTitle}
          className="flex h-8 cursor-not-allowed items-center justify-center rounded-lg bg-red-500/20 px-2 text-red-400 opacity-70"
        >
          <MicOff className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
      <button
        type="button"
        onClick={() =>
          isMic
            ? localParticipant.setMicrophoneEnabled(muted)
            : localParticipant.setCameraEnabled(muted)
        }
        title={`${nounGen} ${muted ? 'ჩართვა' : 'გათიშვა'}`}
        className={`flex h-8 items-center justify-center rounded-lg px-2 transition-all ${
          muted
            ? 'bg-red-500/20 text-red-400'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setActiveMenu(activeMenu === menuId ? null : menuId)}
        title={`${nounGen} არჩევა`}
        className="flex h-8 items-center justify-center rounded-lg px-1 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <ChevronUp className="size-3" />
      </button>

      {activeMenu === menuId && (
        <DeviceMenu
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSelect={(id) => {
            if (activeDeviceId !== id) setActiveMediaDevice(id);
            setActiveMenu(null);
          }}
          label={`აირჩიეთ ${nounNom}`}
          fallbackPrefix={fallbackPrefix}
        />
      )}
    </div>
  );
}

/* ───────── local helper (not exported) ───────── */

function DeviceMenu({
  devices,
  activeDeviceId,
  onSelect,
  label,
  fallbackPrefix,
}: {
  devices: MediaDeviceInfo[];
  activeDeviceId: string | undefined;
  onSelect: (id: string) => void;
  label: string;
  fallbackPrefix: string;
}) {
  return (
    <div className="absolute bottom-11 left-0 z-50 w-52 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
      <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">
        {label}
      </div>
      {devices.map((d) => (
        <button
          key={d.deviceId}
          type="button"
          onClick={() => onSelect(d.deviceId)}
          className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
            activeDeviceId === d.deviceId
              ? 'bg-emerald-500/20 text-emerald-400 font-medium'
              : 'text-white/80 hover:bg-white/10'
          }`}
        >
          {d.label || `${fallbackPrefix} ${d.deviceId.slice(0, 5)}`}
        </button>
      ))}
    </div>
  );
}