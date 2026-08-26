"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import { X, Layout, PenTool, Loader2 } from "lucide-react";
import { ClassWhiteboard } from "./ClassWhiteboard";

interface ClassroomRoomModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

// კავშირის სტატუსის კომპონენტი ზედა პანელისთვის
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

export function ClassroomRoomModal({ courseId, courseTitle, onClose }: ClassroomRoomModalProps) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"split" | "board">("split");
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-2 sm:p-4 select-none">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        className="h-full w-full flex flex-col min-h-0"
        onDisconnected={onClose}
      >
        {/* ზედა მართვის ზოლი (Header) */}
        <header className="relative z-40 flex h-12 shrink-0 items-center justify-between px-3 text-white bg-slate-900/100 rounded-xl border border-white/10 mb-2 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm sm:text-base font-bold truncate">{courseTitle} — გაკვეთილი</h2>
            <ConnectionStatusBadge />
          </div>

          {/* რეჟიმების გადამრთველი ღილაკები */}
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

        {/* LiveKit სამუშაო სივრცე */}
        <main className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
          <div className="flex-1 h-full min-h-0 flex flex-col lg:flex-row gap-3 p-2 sm:p-3">
            {/* ვიდეო ბადე */}
            <div className={`h-full min-h-0 transition-all ${
              activeTab === "board" ? "hidden" : "w-full lg:w-[340px] xl:w-[400px] shrink-0"
            }`}>
              <VideoConference />
            </div>

            {/* ინტერაქტიული დაფა */}
            <div className="flex-1 h-full min-h-0 min-w-0">
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