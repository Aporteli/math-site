"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { createAssignmentAction } from "@/app/[locale]/(dashboard)/teacher/actions";

interface SendCardModalProps {
  courses: { id: string; title: string }[];
  targetStudentId?: string;
  targetStudentName?: string;
  onClose: () => void;
}

export function SendCardModal({
  courses,
  targetStudentId,
  targetStudentName,
  onClose,
}: SendCardModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"FLASHCARD" | "PROBLEM">("FLASHCARD");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [instructions, setInstructions] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await createAssignmentAction({
      title,
      type,
      courseId,
      targetUserId: targetStudentId,
      instructions,
      content: { note: "დამატებითი სავარჯიშო" },
    });

    setPending(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "გაგზავნა ვერ მოხერხდა");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-hairline bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-ink"
        >
          <X className="size-5" />
        </button>

        <h3 className="text-lg font-bold text-ink">
          {targetStudentName
            ? `ბარათის გაგზავნა: ${targetStudentName}`
            : "ახალი ბარათის / ამოცანის გაგზავნა"}
        </h3>

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted">სათაური</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-hairline p-2.5 text-sm outline-none focus:border-navy"
              placeholder="მაგ: კვადრატული განტოლების ამოხსნა"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted">ტიპი</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-hairline p-2.5 text-sm outline-none focus:border-navy"
              >
                <option value="FLASHCARD">სასწავლო ბარათი</option>
                <option value="PROBLEM">ამოცანა / სავარჯიშო</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">კლასი</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-hairline p-2.5 text-sm outline-none focus:border-navy"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted">
              ინსტრუქცია / კომენტარი მოსწავლისთვის
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1 w-full rounded-xl border border-hairline p-2.5 text-sm outline-none focus:border-navy"
              placeholder="მაგ: ყურადღება მიაქციეთ ფორმულას..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-muted hover:bg-paper-deep"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-strong disabled:opacity-50"
            >
              {pending ? "იგზავნება..." : "გაგზავნა"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentActions({
  student,
  courses,
}: {
  student: { id: string; name: string };
  courses: { id: string; title: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-navy/40 hover:text-navy"
      >
        <Send className="size-3.5" />
        ბარათის გაგზავნა
      </button>

      {isOpen && (
        <SendCardModal
          courses={courses}
          targetStudentId={student.id}
          targetStudentName={student.name}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}