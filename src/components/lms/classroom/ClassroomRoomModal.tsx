"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  Chat,
  useTracks,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import "@livekit/components-styles";
import { X, Layout, PenTool, Loader2, MessageSquare } from "lucide-react";
import { ClassWhiteboard } from "./ClassWhiteboard";

interface ClassroomRoomModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

function ConnectionStatusBadge() {
  const state = useConnectionState();

  if (state === ConnectionState.Connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>დაკავშირებულია</span>
      </div>
    );
  }

  if (state === ConnectionState.Connecting || state === ConnectionState.Reconnecting) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
        <span className="size-2 rounded-full bg-amber-500 animate-ping" />
        <span>კავშირი მყარდება...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
      <span className="size-2 rounded-full bg-rose-500" />
      <span>გათიშულია</span>
    </div>
  );
}

function MyVideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden p-1.5">
      <GridLayout tracks={tracks} className="h-full w-full">
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

export function ClassroomRoomModal({ courseId, courseTitle, onClose }: ClassroomRoomModalProps) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"split" | "board">("split");
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchToken() {
      try {
        setLoading(true);
        const res = await fetch(`/api/livekit?courseId=${encodeURIComponent(courseId)}`);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "ოთახში შესვლა ვერ მოხერხდა");
        }
        const data = await res.json();
        if (isMounted) {
          setToken(data.token);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "დაფიქსირდა შეცდომა");
          setLoading(false);
        }
      }
    }

    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 shadow-2xl">
          <Loader2 className="size-8 animate-spin text-navy" />
          <p className="text-sm font-bold text-ink">გაკვეთილთან დაკავშირება...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 max-w-sm text-center shadow-2xl">
          <p className="text-sm font-bold text-rose-600">{error || "წვდომა უარყოფილია"}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white hover:bg-navy-strong transition-colors"
          >
            დახურვა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-slate-950 p-2 sm:p-3">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
        onDisconnected={onClose}
      >
        {/* Header */}
        <header className="relative z-40 flex h-12 shrink-0 items-center justify-between px-3 text-white bg-slate-900 rounded-xl border border-white/10 mb-2 gap-2 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm sm:text-base font-bold truncate">{courseTitle} — გაკვეთილი</h2>
            <ConnectionStatusBadge />
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("split")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "split" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              <Layout className="size-3.5" />
              <span className="hidden sm:inline">ვიდეო + დაფა</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("board")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "board" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              <PenTool className="size-3.5" />
              <span className="hidden sm:inline">მხოლოდ დაფა</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Workspace */}
        <main className="relative flex flex-1 min-h-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <div className="flex h-full w-full min-h-0 min-w-0 flex-col lg:flex-row gap-2.5 p-2">
            
            {/* მარცხენა სვეტი: ვიდეო / ჩატი */}
            <div
              className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-slate-950/80 border border-white/5 transition-all select-none ${
                activeTab === "board"
                  ? "hidden"
                  : "w-full lg:w-[340px] xl:w-[400px] shrink-0"
              }`}
            >
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
              </div>
            </div>

            {/* დაფის ზონა - იზოლირებული LiveKit-ის Idle სტილებისგან */}
            <div className="relative isolate flex flex-1 h-full min-h-0 min-w-0 overflow-hidden rounded-xl bg-white pointer-events-auto z-10 [&_*]:!pointer-events-auto">
              <ClassWhiteboard
                isFullscreen={isBoardFullscreen}
                onToggleFullscreen={() => setIsBoardFullscreen(!isBoardFullscreen)}
              />
            </div>
          </div>

          <RoomAudioRenderer />
        </main>
      </LiveKitRoom>
    </div>
  );
}