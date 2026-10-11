'use client';

import { useState } from 'react';
import { Loader2, Video } from 'lucide-react';
import { getLessonRoomAction } from '@/lib/actions/lesson-room';

interface StudentCourseVideoCallButtonProps {
  courseId: string;
  courseTitle: string;
  label?: string;
}

export function StudentCourseVideoCallButton({ courseId, label }: StudentCourseVideoCallButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openMeet() {
    setMessage(null);
    const tab = window.open('', '_blank');
    if (!tab) {
      setMessage('ბრაუზერმა ახალი ფანჯრის გახსნა დაბლოკა.');
      return;
    }

    setPending(true);
    try {
      const result = await getLessonRoomAction(courseId);
      if (!result.ok) {
        tab.close();
        setMessage(result.error);
        return;
      }
      if (!result.room.meetUrl) {
        tab.close();
        setMessage('ამ ჯგუფს Meet-ის ბმული ჯერ არ აქვს.');
        return;
      }
      tab.opener = null;
      tab.location.href = result.room.meetUrl;
    } catch {
      tab.close();
      setMessage('Meet-ის ბმულის გახსნა ვერ მოხერხდა.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void openMeet()}
        disabled={pending}
        className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Video className="size-5" />}
        <span className="text-[16px]">{label ?? 'გაკვეთილზე შესვლა'}</span>
      </button>
      {message ? (
        <p role="alert" className="text-xs font-bold text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
