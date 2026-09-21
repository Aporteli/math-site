'use client';

import { useRef, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { MessageSquare, MoreVertical, MonitorUp } from 'lucide-react';
import { ControlButton } from './ControlButton';
import { MediaControl } from './MediaControl';
import { MoreMenu } from './more-menu/MoreMenu';
import { TemporalBackgroundTunerPanel } from './TemporalBackgroundTuner';
import { useClickOutside } from './use-click-outside';
import type { MenuId } from './types';

interface ControlBarProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
  isTeacher: boolean;
  courseId: string;
  isolatedIdentities: string[];
  onIsolationChange: (isolatedIdentities: string[]) => void;
}

export function ControlBar({
  isChatOpen,
  onToggleChat,
  isTeacher,
  courseId,
  isolatedIdentities,
  onIsolationChange,
}: ControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useClickOutside(navRef, () => setActiveMenu(null));

  const sharing = localParticipant.isScreenShareEnabled;

  return (
    <>
      <div
        ref={navRef}
        className="shrink-0 flex items-center justify-between px-3 py-2 bg-slate-950/90 border-t border-white/10 relative backdrop-blur-md"
      >
        {/* Left: media controls */}
        <div className="flex items-center gap-2">
          <MediaControl
            kind="audioinput"
            menuId="mic"
            nounNom="მიკროფონი"
            nounGen="მიკროფონის"
            fallbackPrefix="Microphone"
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />
          <MediaControl
            kind="videoinput"
            menuId="cam"
            nounNom="კამერა"
            nounGen="კამერის"
            fallbackPrefix="Camera"
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />
          <ControlButton
            icon={MonitorUp}
            title="ეკრანის გაზიარება"
            active={sharing}
            activeClass="border-blue-500 bg-blue-600 text-white"
            onClick={() => localParticipant.setScreenShareEnabled(!sharing)}
          />
        </div>

        {/* Right: tools */}
        <div className="flex items-center gap-1.5">
          <ControlButton
            icon={MessageSquare}
            title="ჩატი"
            active={isChatOpen}
            activeClass="border-emerald-500 bg-emerald-500 text-white"
            onClick={onToggleChat}
          />

          <div className="relative">
            <ControlButton
              icon={MoreVertical}
              title="პარამეტრები"
              active={activeMenu === 'more'}
              activeClass="bg-white/20 text-white"
              keepIdleOnActive
              onClick={() =>
                setActiveMenu(activeMenu === 'more' ? null : 'more')
              }
            />
            {activeMenu === 'more' && (
              <MoreMenu
                courseId={courseId}
                isTeacher={isTeacher}
                isolatedIdentities={isolatedIdentities}
                onIsolationChange={onIsolationChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tuner panel: portaled to document.body, sibling of navRef so
          useClickOutside(navRef) treats it as "outside" — but its own
          document-level capture listener kills those events before they
          reach the click-outside handler. */}
      <TemporalBackgroundTunerPanel />
    </>
  );
}