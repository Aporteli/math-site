'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLocalParticipant, useMediaDeviceSelect } from '@livekit/components-react';
import { ChevronUp, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { MenuId } from './types';

/** Matches Tailwind `bottom-11`: sit just above the toolbar control. */
const MENU_GAP_PX = 44;

interface MenuPosition {
  left: number;
  bottom: number;
}

function readMenuPosition(anchor: HTMLElement): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  return {
    left: rect.left,
    bottom: window.innerHeight - rect.bottom + MENU_GAP_PX,
  };
}

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
  const anchorRef = useRef<HTMLDivElement>(null);

  const isMic = kind === 'audioinput';
  const muted = locked || (isMic
    ? !localParticipant.isMicrophoneEnabled
    : !localParticipant.isCameraEnabled);
  const Icon = isMic ? (muted ? MicOff : Mic) : muted ? VideoOff : Video;

  if (locked) {
    return (
      <div className="relative flex items-center rounded-box border border-hairline bg-main p-0.5">
        <button
          type="button"
          disabled
          title={lockedTitle}
          className="flex h-8 cursor-not-allowed items-center justify-center rounded-box bg-rose-500/15 px-2 text-rose-500 opacity-70"
        >
          <MicOff className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={anchorRef}
      className="relative flex items-center rounded-box border border-hairline bg-main p-0.5"
    >
      <button
        type="button"
        onClick={() =>
          isMic
            ? localParticipant.setMicrophoneEnabled(muted)
            : localParticipant.setCameraEnabled(muted)
        }
        title={`${nounGen} ${muted ? 'ჩართვა' : 'გათიშვა'}`}
        className={`flex h-8 cursor-pointer items-center justify-center rounded-box px-2 transition-all duration-200 ${
          muted
            ? 'bg-rose-500/15 text-rose-500'
            : 'text-mainText hover:bg-mainButtonHover'
        }`}
      >
        <Icon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setActiveMenu(activeMenu === menuId ? null : menuId)}
        title={`${nounGen} არჩევა`}
        className="flex h-8 cursor-pointer items-center justify-center rounded-box px-1 text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText"
      >
        <ChevronUp className="size-3" />
      </button>

      {activeMenu === menuId && (
        <DeviceMenu
          anchorRef={anchorRef}
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
  anchorRef,
  devices,
  activeDeviceId,
  onSelect,
  label,
  fallbackPrefix,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | undefined;
  onSelect: (id: string) => void;
  label: string;
  fallbackPrefix: string;
}) {
  const [position, setPosition] = useState<MenuPosition | null>(() => {
    const anchor = anchorRef.current;
    return anchor ? readMenuPosition(anchor) : null;
  });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      const next = readMenuPosition(anchor);
      setPosition((prev) =>
        prev && prev.left === next.left && prev.bottom === next.bottom ? prev : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    let node: HTMLElement | null = anchor;
    while (node) {
      observer.observe(node);
      node = node.parentElement;
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  if (!position || typeof document === 'undefined') return null;

  const portalRoot =
    anchorRef.current?.closest('[data-classroom-root]') ?? document.body;

  return createPortal(
    <div
      className="fixed z-[200] w-52 rounded-box border border-hairline bg-main p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      style={{ left: position.left, bottom: position.bottom }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </div>
      {devices.map((d) => (
        <button
          key={d.deviceId}
          type="button"
          onClick={() => onSelect(d.deviceId)}
          className={`w-full cursor-pointer truncate rounded-box px-2.5 py-1.5 text-left text-xs font-bold transition-all duration-200 ${
            activeDeviceId === d.deviceId
              ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'text-mainText hover:bg-sectionHeader'
          }`}
        >
          {d.label || `${fallbackPrefix} ${d.deviceId.slice(0, 5)}`}
        </button>
      ))}
    </div>,
    portalRoot,
  );
}