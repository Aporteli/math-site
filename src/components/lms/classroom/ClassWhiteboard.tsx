"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Room, RemoteParticipant } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Loader2, ChevronLeft, ChevronRight, Plus, Send, UserCheck, X } from "lucide-react";
import geometryLibrary from "@/data/geometry.json";
import { sendProblemToStudentAction } from "@/lib/actions/students";

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
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher?: boolean;
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export function ClassWhiteboard({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  onToggleFullscreen,
  isTeacher = false,
}: ClassWhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const [pages, setPages] = useState<any[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [students, setStudents] = useState<RemoteParticipant[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState<string>("");
  const [assignPending, setAssignPending] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

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

  const publishScene = async (pageIndex: number, pagesLength: number, elements: any[]) => {
    if (!room || room.state !== ConnectionState.Connected || isPublishingRef.current) return;

    isPublishingRef.current = true;
    try {
      const message = JSON.stringify({
        type: "EXCALIDRAW_SYNC",
        pageIndex,
        pagesLength,
        elements,
      });
      const compressed = await compressData(message);
      await room.localParticipant?.publishData(compressed as any, { reliable: true });
    } catch (err) {
      console.error("Failed to publish whiteboard scene:", err);
    } finally {
      isPublishingRef.current = false;
    }
  };

  const handleEditorChange = (elements: readonly any[]) => {
    if (assignError) {
      setAssignError(null);
    }

    if (!room || room.state !== ConnectionState.Connected || !getSceneVersionRef.current || isSyncingRef.current) return;

    const currentVersion = getSceneVersionRef.current(elements);
    if (currentVersion > lastSceneVersion.current) {
      lastSceneVersion.current = currentVersion;

      const cleanElements = elements.filter((el) => !el.isDeleted);
      const newPages = [...pagesRef.current];
      newPages[currentPageIndexRef.current] = cleanElements;

      pagesRef.current = newPages;
      setPages(newPages);

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      const pageIndex = currentPageIndexRef.current;
      const pagesLength = newPages.length;
      syncTimeoutRef.current = setTimeout(() => {
        void publishScene(pageIndex, pagesLength, cleanElements);
      }, 120);
    }
  };

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
    void publishScene(newIndex, newPages.length, []);

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  };

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
    void publishScene(newIndex, updatedPages.length, targetElements);

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  };

  const handleAssignPageToStudent = async (student: RemoteParticipant) => {
    if (!excalidrawAPI || !isTeacher) return;

    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    if (currentElements.length === 0) {
      setAssignError("დაფა ცარიელია");
      setTimeout(() => {
        setAssignError(null);
      }, 2500);
      return;
    }

    setAssignPending(true);
    setAssignError(null);

    const title = assignTitle.trim() || `${courseTitle || "დაფის ამოცანა"} — გვერდი ${currentPageIndex + 1}`;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const appState = excalidrawAPI.getAppState();
      const blob = await exportToBlob({
        elements: currentElements,
        appState: {
          ...appState,
          exportWithDarkMode: false,
          exportBackground: true,
          viewBackgroundColor: "#ffffff",
        },
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        quality: 0.95,
      });

      const imageBase64 = await blobToBase64(blob);

      const res = await sendProblemToStudentAction({
        studentId: student.identity,
        instructions: undefined,
        attachmentUrl: imageBase64,
        problem: {
          id: `whiteboard-${Date.now()}`,
          topic: title,
          difficulty: "medium",
          promptTex: "",
          solutionTex: "",
        },
      });

      if (!res.success) {
        throw new Error(res.error || "დავალების გაგზავნა ვერ მოხერხდა");
      }

      if (room && room.state === ConnectionState.Connected) {
        const message = JSON.stringify({
          type: "EXCALIDRAW_ASSIGNED_PAGE",
          elements: currentElements,
          pageLabel: title,
        });
        const compressedPayload = await compressData(message);
        await room.localParticipant?.publishData(compressedPayload as any, {
          reliable: true,
          destinationIdentities: [student.identity],
        });
      }

      setAssignedStatus(`წარმატებით გაეგზავნა: ${student.name || student.identity}`);
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
        setAssignTitle("");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to assign page to student:", err);
      setAssignError(err.message || "გაგზავნა ვერ მოხერხდა");
    } finally {
      setAssignPending(false);
    }
  };

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

        if (data.type === "EXCALIDRAW_SYNC" && Number.isInteger(data.pageIndex) && Array.isArray(data.elements)) {
          isSyncingRef.current = true;

          const pagesLength = Math.max(pagesRef.current.length, Number(data.pagesLength) || 0);
          const newPages = [...pagesRef.current];
          while (newPages.length < pagesLength) newPages.push([]);
          newPages[data.pageIndex] = data.elements;

          pagesRef.current = newPages;
          currentPageIndexRef.current = data.pageIndex;
          setPages(newPages);
          setCurrentPageIndex(data.pageIndex);

          excalidrawAPI.updateScene({ elements: data.elements });

          setTimeout(() => {
            isSyncingRef.current = false;
          }, 100);
        }

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
      {isTeacher && isAssignModalOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-80 rounded-2xl bg-white p-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              დაფის გაგზავნა დავალებად
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssignError(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>

          <input
            value={assignTitle}
            onChange={(e) => setAssignTitle(e.target.value)}
            placeholder={`${courseTitle || "დაფის ამოცანა"} — გვერდი ${currentPageIndex + 1}`}
            className="mb-2 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400"
          />

          {assignedStatus ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-emerald-600">
              <UserCheck className="size-4" />
              <span>{assignedStatus}</span>
            </div>
          ) : assignError ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 text-xs font-medium text-rose-600 text-center animate-in fade-in">
              <span>{assignError}</span>
              <p className="text-[10px] text-slate-400">დახატეთ დაფაზე რაიმე გასაგზავნად</p>
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
                  disabled={assignPending}
                  className="flex items-center justify-between p-2 rounded-xl text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                >
                  <span className="font-medium truncate max-w-[170px]">
                    {student.name || student.identity}
                  </span>
                  {assignPending ? (
                    <Loader2 className="size-3 animate-spin text-indigo-600" />
                  ) : (
                    <Send className="size-3 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

        {isTeacher && (
          <button
            type="button"
            onClick={() => {
              setAssignError(null);
              setIsAssignModalOpen((prev) => !prev);
            }}
            title="ამ დაფის სურათის გაგზავნა მოსწავლესთან დავალებად"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Send className="size-3.5" />
            <span>გაგზავნა დავალებად</span>
          </button>
        )}
      </div>

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