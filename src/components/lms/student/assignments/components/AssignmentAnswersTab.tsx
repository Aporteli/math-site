'use client';

import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

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
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-paper p-3 pe-2 sm:p-4">
      {answers.length === 0 ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="text-sm font-bold text-ink">პასუხები ჯერ არ გაგიგზავნიათ</p>
          <p className="mt-1 max-w-xs text-xs text-muted">გამოიყენეთ ქვედა პანელი პასუხის ასატვირთად და გასაგზავნად.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {answers.map((answer) => (
            <button
              key={answer.id}
              type="button"
              onClick={() =>
                onPreviewAnswer({
                  url: answer.url,
                  title: answer.title,
                  isAnswer: true,
                })
              }
              className="group flex min-h-[260px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/35"
            >
              <span className="h-1 w-full shrink-0 bg-win" aria-hidden="true" />

              <div className="relative mx-3 mt-3 h-36 overflow-hidden rounded-xl border border-hairline bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={answer.url} alt="" className="size-full bg-white object-contain p-2 transition duration-200 group-hover:scale-[1.03]" />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-win/20 bg-win-tint px-2 py-0.5 text-[10px] font-bold text-win shadow-sm">
                  <CheckCircle2 className="size-3" />
                  ჩაბარებულია
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3 px-3.5 pb-3.5 pt-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{answer.title}</p>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-navy-tint px-2.5 py-1 text-xs font-bold text-navy transition group-hover:bg-navy group-hover:text-white">
                  ნახვა
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
