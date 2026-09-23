'use client';

import { useRef, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { useAudioDeviceRole } from '../../hooks/useAudioDeviceRole';
import { MessageSquare, MoreVertical, MonitorUp, Columns2 } from 'lucide-react';
import { ControlButton } from './ControlButton';
import { MediaControl } from './MediaControl';
import { MoreMenu } from './more-menu/MoreMenu';
import { TemporalBackgroundTunerPanel } from './TemporalBackgroundTuner';
import { useClickOutside } from './use-click-outside';
import { useBreakout } from '../../breakout/BreakoutContext';
import type { MenuId } from './types';

interface ControlBarProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
  isTeacher: boolean;
  courseId: string;
  isolatedIdentities: string[];
  onIsolationChange: (isolatedIdentities: string[]) => void;
  /** Token was issued for a later connection of this account. */
  secondary?: boolean;
}

export function ControlBar({
  isChatOpen,
  onToggleChat,
  isTeacher,
  courseId,
  isolatedIdentities,
  onIsolationChange,
  secondary = false,
}: ControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const audioRole = useAudioDeviceRole();
  const breakout = useBreakout();
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
            locked={audioRole === 'secondary' || (secondary && audioRole !== 'primary')}
            lockedTitle="ხმა პირველ მოწყობილობაზე რჩება"
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

          {isTeacher && (
            <ControlButton
              icon={Columns2}
              title="ოთახები"
              active={breakout.dashboardOpen}
              activeClass="border-amber-500 bg-amber-500 text-slate-950"
              onClick={breakout.toggleDashboard}
            />
          )}

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