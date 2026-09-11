//CUT

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  Chat,
  useLocalParticipant,
  useMediaDeviceSelect,
} from '@livekit/components-react';
import type { Room } from 'livekit-client';
import { MessageSquare, Mic, MicOff, Video, VideoOff, MonitorUp, MoreVertical, ChevronUp } from 'lucide-react';
import { BlurToggleButton } from '@/components/ui/BlurToggleButton';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { MyVideoGrid } from './MyVideoGrid';
import { RoomInstanceBridge } from './RoomInstanceBridge';
import { BreakoutControls } from './BreakoutControls';
import { AudioIsolationListener } from './AudioIsolationListener';
import '@livekit/components-styles';
import { CustomChat } from './CustomChat';
import { ChatBackgroundListener } from './ChatBackgroundListener';

interface ClassroomVideoPanelProps {
  token: string;
  courseId: string;
  isTeacher: boolean;
  onClose: () => void;
  onRoom: (room: Room) => void;
}

function CustomCompactControlBar({
  isChatOpen,
  setIsChatOpen,
  isTeacher,
  courseId,
}: {
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTeacher: boolean;
  courseId: string;
}) {
  const { localParticipant } = useLocalParticipant();

  const micSelect = useMediaDeviceSelect({ kind: 'audioinput' });
  const cameraSelect = useMediaDeviceSelect({ kind: 'videoinput' });

  const [activeMenu, setActiveMenu] = useState<'mic' | 'cam' | 'more' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMicMuted = !localParticipant.isMicrophoneEnabled;
  const isCameraMuted = !localParticipant.isCameraEnabled;
  const isScreenSharing = localParticipant.isScreenShareEnabled;

  return (
    <div
      ref={navRef}
      className="shrink-0 flex items-center justify-between px-3 py-2 bg-slate-950/90 border-t border-white/10 relative backdrop-blur-md">
      {/* 1. ძირითადი მედია მართვა (მარცხენა მხარე) */}
      <div className="flex items-center gap-2">
        {/* მიკროფონის გაერთიანებული ღილაკი */}
        <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => localParticipant.setMicrophoneEnabled(isMicMuted)}
            title={isMicMuted ? 'მიკროფონის ჩართვა' : 'მიკროფონის გათიშვა'}
            className={`flex h-8 items-center justify-center rounded-lg px-2 transition-all ${
              isMicMuted ? 'bg-red-500/20 text-red-400' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}>
            {isMicMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu((prev) => (prev === 'mic' ? null : 'mic'))}
            title="მიკროფონის არჩევა"
            className="flex h-8 items-center justify-center rounded-lg px-1 text-white/50 hover:bg-white/10 hover:text-white">
            <ChevronUp className="size-3" />
          </button>

          {/* მიკროფონების სია */}
          {activeMenu === 'mic' && (
            <div className="absolute bottom-11 left-0 z-50 w-52 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">აირჩიეთ მიკროფონი</div>
              {micSelect.devices.map((device) => (
                <button
                  key={device.deviceId}
                  type="button"
                  onClick={() => {
                    if (micSelect.activeDeviceId !== device.deviceId) {
                      micSelect.setActiveMediaDevice(device.deviceId);
                    }
                    setActiveMenu(null);
                  }}
                  className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    micSelect.activeDeviceId === device.deviceId
                      ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                      : 'text-white/80 hover:bg-white/10'
                  }`}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* კამერის გაერთიანებული ღილაკი */}
        <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => localParticipant.setCameraEnabled(isCameraMuted)}
            title={isCameraMuted ? 'კამერის ჩართვა' : 'კამერის გათიშვა'}
            className={`flex h-8 items-center justify-center rounded-lg px-2 transition-all ${
              isCameraMuted ? 'bg-red-500/20 text-red-400' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}>
            {isCameraMuted ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu((prev) => (prev === 'cam' ? null : 'cam'))}
            title="კამერის არჩევა"
            className="flex h-8 items-center justify-center rounded-lg px-1 text-white/50 hover:bg-white/10 hover:text-white">
            <ChevronUp className="size-3" />
          </button>

          {/* კამერების სია */}
          {activeMenu === 'cam' && (
            <div className="absolute bottom-11 left-0 z-50 w-52 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">აირჩიეთ კამერა</div>
              {cameraSelect.devices.map((device) => (
                <button
                  key={device.deviceId}
                  type="button"
                  onClick={() => {
                    if (cameraSelect.activeDeviceId !== device.deviceId) {
                      cameraSelect.setActiveMediaDevice(device.deviceId);
                    }
                    setActiveMenu(null);
                  }}
                  className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    cameraSelect.activeDeviceId === device.deviceId
                      ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                      : 'text-white/80 hover:bg-white/10'
                  }`}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ეკრანის გაზიარება */}
        <button
          type="button"
          onClick={() => localParticipant.setScreenShareEnabled(!isScreenSharing)}
          title="ეკრანის გაზიარება"
          className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
            isScreenSharing
              ? 'border-blue-500 bg-blue-600 text-white'
              : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white'
          }`}>
          <MonitorUp className="size-4" />
        </button>
      </div>

      {/* 2. დამატებითი ინსტრუმენტები (მარჯვენა მხარე) */}
      <div className="flex items-center gap-1.5">
        {/* ჩატი */}
        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
          title="ჩატი"
          className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
            isChatOpen
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white'
          }`}>
          <MessageSquare className="size-4" />
        </button>

        {/* მეტი ოპციები */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu((prev) => (prev === 'more' ? null : 'more'))}
            title="პარამეტრები"
            className={`flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white transition-all ${
              activeMenu === 'more' ? 'bg-white/20 text-white' : ''
            }`}>
            <MoreVertical className="size-4" />
          </button>

          {activeMenu === 'more' && (
            <div className="absolute bottom-11 right-0 z-50 flex w-48 flex-col gap-1.5 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">პარამეტრები</div>

              <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
                <span>ფონის ბლური</span>
                <BlurToggleButton />
              </div>

              {isTeacher && (
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
                  <span>Breakout</span>
                  <BreakoutControls courseId={courseId} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClassroomVideoPanel({ token, courseId, isTeacher, onClose, onRoom }: ClassroomVideoPanelProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      options={{
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      }}
      data-lk-theme="default"
      className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
      onDisconnected={onClose}>
      <RoomInstanceBridge onRoom={onRoom} />
      <AudioIsolationListener isTeacher={isTeacher} />

      <ChatBackgroundListener courseId={courseId} />

      <div className="absolute top-2 left-2 z-10">
        <ConnectionStatusBadge />
      </div>

      {isChatOpen ? (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden p-2">
          <CustomChat courseId={courseId} />
        </div>
      ) : (
        <MyVideoGrid />
      )}

      <CustomCompactControlBar
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isTeacher={isTeacher}
        courseId={courseId}
      />

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
