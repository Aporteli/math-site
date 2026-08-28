"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Room, RemoteParticipant } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Maximize2, Minimize2, Loader2, ChevronLeft, ChevronRight, Plus, Send, UserCheck, X } from "lucide-react";
import geometryLibrary from "@/data/geometry.json";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    ),
  }
);

interface ClassWhiteboardProps {
  room: Room | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

async function compressData(str: string): Promise<Uint8Array> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
  const response = new Response(stream);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function decompressData(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const response = new Response(stream);
  return await response.text();
}

export function ClassWhiteboard({ room, isFullscreen, onToggleFullscreen }: ClassWhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const [pages, setPages] = useState<any[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // მოსწავლეების მენიუს სტეიტი
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [students, setStudents] = useState<RemoteParticipant[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);

  const pagesRef = useRef<any[][]>([[]]);
  const currentPageIndexRef = useRef<number>(0);

  useEffect(() => {
    pagesRef.current = pages;
    currentPageIndexRef.current = currentPageIndex;
  }, [pages, currentPageIndex]);

  const lastSceneVersion = useRef<number>(0);
  const getSceneVersionRef = useRef<any>(null);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPublishingRef = useRef(false);

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      getSceneVersionRef.current = mod.getSceneVersion;
    });
  }, []);

  // ქოლში მყოფი მოსწავლეების სიის განახლება
  useEffect(() => {
    if (!room) return;

    const updateParticipantList = () => {
      setStudents(Array.from(room.remoteParticipants.values()));
    };

    updateParticipantList();
    room.on(RoomEvent.ParticipantConnected, updateParticipantList);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipantList);

    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipantList);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipantList);
    };
  }, [room]);

  // მიმდინარე გვერდის რედაქტირება
  const handleEditorChange = (elements: readonly any[]) => {
    if (!room || room.state !== ConnectionState.Connected || !getSceneVersionRef.current || isSyncingRef.current) return;

    const currentVersion = getSceneVersionRef.current(elements);
    if (currentVersion > lastSceneVersion.current) {
      lastSceneVersion.current = currentVersion;

      const cleanElements = elements.filter((el) => !el.isDeleted);
      const newPages = [...pagesRef.current];
      newPages[currentPageIndexRef.current] = cleanElements;

      pagesRef.current = newPages;
      setPages(newPages);
    }
  };

  // ახალი გვერდის დამატება
  const handleAddNewPage = () => {
    if (!excalidrawAPI) return;

    isSyncingRef.current = true;
    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    const newPages = [...pagesRef.current];
    newPages[currentPageIndexRef.current] = currentElements;
    newPages.push([]);

    const newIndex = newPages.length - 1;
    pagesRef.current = newPages;
    currentPageIndexRef.current = newIndex;
    setPages(newPages);
    setCurrentPageIndex(newIndex);

    excalidrawAPI.updateScene({ elements: [] });
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  };

  // გვერდზე გადართვა
  const handleSwitchPage = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= pagesRef.current.length || !excalidrawAPI || newIndex === currentPageIndexRef.current) return;

    isSyncingRef.current = true;
    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    const updatedPages = [...pagesRef.current];
    updatedPages[currentPageIndexRef.current] = currentElements;

    pagesRef.current = updatedPages;
    currentPageIndexRef.current = newIndex;
    setPages(updatedPages);
    setCurrentPageIndex(newIndex);

    const targetElements = updatedPages[newIndex] || [];
    excalidrawAPI.updateScene({ elements: targetElements });

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  };

  // კონკრეტული გვერდის გაგზავნა არჩეულ მოსწავლესთან
  const handleAssignPageToStudent = async (student: RemoteParticipant) => {
    if (!room || !excalidrawAPI || room.state !== ConnectionState.Connected) return;

    // მიმდინარე გვერდის მონაცემების აღება
    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    const activePage = pagesRef.current[currentPageIndexRef.current] || currentElements;

    const message = JSON.stringify({
      type: "EXCALIDRAW_ASSIGNED_PAGE",
      elements: activePage,
      pageLabel: `დავალება (გვერდი ${currentPageIndexRef.current + 1})`,
    });

    try {
      const compressedPayload = await compressData(message);

      // გაგზავნა მხოლოდ ამ კონკრეტულ მოსწავლესთან
      await room.localParticipant?.publishData(compressedPayload as any, {
        reliable: true,
        destinationIdentities: [student.identity],
      });

      setAssignedStatus(`გაეგზავნა: ${student.name || student.identity}`);
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to assign page to student:", err);
    }
  };

  // მონაცემების მიღება (მოსწავლის მხარეს ჩატვირთვა)
  useEffect(() => {
    if (!room || !excalidrawAPI) return;

    const handleDataReceived = async (payload: Uint8Array) => {
      try {
        let str: string;
        try {
          str = await decompressData(payload);
        } catch {
          str = new TextDecoder().decode(payload);
        }

        const data = JSON.parse(str);

        // როდესაც მასწავლებელმა გამოუგზავნა კონკრეტული დაფა
        if (data.type === "EXCALIDRAW_ASSIGNED_PAGE" && Array.isArray(data.elements)) {
          isSyncingRef.current = true;

          const newPages = [...pagesRef.current, data.elements];
          const targetIndex = newPages.length - 1;

          pagesRef.current = newPages;
          currentPageIndexRef.current = targetIndex;
          setPages(newPages);
          setCurrentPageIndex(targetIndex);

          excalidrawAPI.updateScene({ elements: data.elements });

          setTimeout(() => {
            isSyncingRef.current = false;
          }, 100);
        }
      } catch (err) {
        console.error("Failed to parse incoming whiteboard payload:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [room, excalidrawAPI]);

  const initialLibraryItems = Array.isArray(geometryLibrary)
    ? geometryLibrary
    : (geometryLibrary as any)?.libraryItems || (geometryLibrary as any)?.library || [];

  return (
    <div
      className={`relative w-full h-full bg-slate-100 overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-screen w-screen"
          : "rounded-2xl border border-slate-200 shadow-sm"
      }`}
    >
      {/* ეკრანის გაშლის ღილაკი */}
      <div className="absolute top-3 right-3 z-[100] flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "დაპატარავება" : "მთელ ეკრანზე გაშლა"}
          className="flex size-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors pointer-events-auto"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* მოსწავლის არჩევის მოდალი / Popup */}
      {isAssignModalOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-72 rounded-2xl bg-white p-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              გვერდი {currentPageIndex + 1}-ის გაგზავნა
            </span>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>

          {assignedStatus ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-emerald-600">
              <UserCheck className="size-4" />
              <span>{assignedStatus}</span>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-3">
              ქოლში სხვა მოსწავლეები არ არიან
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.identity}
                  type="button"
                  onClick={() => handleAssignPageToStudent(student)}
                  className="flex items-center justify-between p-2 rounded-xl text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <span className="font-medium truncate max-w-[170px]">
                    {student.name || student.identity}
                  </span>
                  <Send className="size-3 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* გვერდების მართვის ქვედა პანელი */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-lg select-none">
        <button
          type="button"
          onClick={() => handleSwitchPage(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
          title="წინა გვერდი"
          className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-xs font-semibold text-slate-700 px-2 min-w-[70px] text-center">
          {currentPageIndex + 1} / {pages.length}
        </span>

        <button
          type="button"
          onClick={() => handleSwitchPage(currentPageIndex + 1)}
          disabled={currentPageIndex === pages.length - 1}
          title="შემდეგი გვერდი"
          className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={handleAddNewPage}
          title="ახალი გვერდის დამატება"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
        >
          <Plus className="size-3.5" />
          <span>ახალი გვერდი</span>
        </button>

        {/* მოსწავლისთვის გაგზავნის ღილაკი */}
        <button
          type="button"
          onClick={() => setIsAssignModalOpen((prev) => !prev)}
          title="ამ გვერდის გაგზავნა მოსწავლესთან"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Send className="size-3.5" />
          <span>გაგზავნა</span>
        </button>
      </div>

      {/* Excalidraw დაფა */}
      <div className="absolute inset-0 h-full w-full">
        <Excalidraw
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          onChange={handleEditorChange}
          initialData={{
            libraryItems: initialLibraryItems,
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
        />
      </div>
    </div>
  );
}