'use client';

import { CheckCircle2, ZoomIn } from 'lucide-react';

export type SubmittedAnswerItem = {
  id: string;
  url: string;
  title: string;
  status: string;
};

interface AssignmentAnswersTabProps {
  answers: SubmittedAnswerItem[];
  onPreviewAnswer: (payload: { url: string; title: string; isAnswer: boolean }) => void;
}

export function AssignmentAnswersTab({ answers, onPreviewAnswer }: AssignmentAnswersTabProps) {
  return (
    <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
      {answers.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
          <CheckCircle2 className="size-9 opacity-30 mb-2 text-emerald-600" />
          <p className="text-sm font-bold text-ink">პასუხები ჯერ არ გაგიგზავნიათ</p>
          <p className="text-xs max-w-xs mt-1">გამოიყენეთ ქვედა პანელი პასუხის ასატვირთად და გასაგზავნად.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {answers.map((ans) => (
            <div
              key={ans.id}
              onClick={() =>
                onPreviewAnswer({
                  url: ans.url,
                  title: ans.title,
                  isAnswer: true,
                })
              }
              className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/20 p-3 transition-all cursor-pointer group shadow-2xs hover:shadow-md min-h-[210px]">
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> ჩაბარებულია
                  </span>
                </div>

                <div className="w-full h-32 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={ans.url}
                    alt="მოსწავლის პასუხი"
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                <span className="text-xs font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                  გადიდება <ZoomIn className="size-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}