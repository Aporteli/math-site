"use client";

import { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  Chat,
} from "@livekit/components-react";
import type { Room } from "livekit-client";
import { MessageSquare } from "lucide-react";
import { BlurToggleButton } from "@/components/ui/BlurToggleButton";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { MyVideoGrid } from "./MyVideoGrid";
import { RoomInstanceBridge } from "./RoomInstanceBridge";
import { BreakoutControls } from "./BreakoutControls";
import { AudioIsolationListener } from "./AudioIsolationListener";
import "@livekit/components-styles";

interface ClassroomVideoPanelProps {
  token: string;
  courseId: string;
  isTeacher: boolean;
  onClose: () => void;
  onRoom: (room: Room) => void;
}

export function ClassroomVideoPanel({
  token,
  courseId,
  isTeacher,
  onClose,
  onRoom,
}: ClassroomVideoPanelProps) {
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
      onDisconnected={onClose}
    >
      <RoomInstanceBridge onRoom={onRoom} />
      <AudioIsolationListener isTeacher={isTeacher} />

      <div className="absolute top-2 left-2 z-10">
        <ConnectionStatusBadge />
      </div>

      {/* BlurToggleButton განთავსებულია აბსოლუტურად ზედა მარჯვენა კუთხეში */}
      <div className="absolute top-2 right-2 z-20">
        <BlurToggleButton />
      </div>

      {isChatOpen ? (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden p-2 [&_.lk-chat]:h-full [&_.lk-chat]:w-full [&_.lk-chat-messages]:overflow-y-auto">
          <Chat />
        </div>
      ) : (
        <MyVideoGrid />
      )}

      <div className="shrink-0 flex items-center justify-center gap-2 p-2 bg-slate-900/90 border-t border-white/10">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            chat: false,
            leave: false,
          }}
        />

        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
          title="ჩატი"
          className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
            isChatOpen
              ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white"
          }`}
        >
          <MessageSquare className="size-4" />
        </button>

        {isTeacher && <BreakoutControls courseId={courseId} />}
      </div>

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}