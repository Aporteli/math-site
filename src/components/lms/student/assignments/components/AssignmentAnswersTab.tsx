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
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-main min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
      {answers.length === 0 ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center  bg-main px-6 py-16 text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center  text-navy">
            <CheckCircle2 className="size-8" strokeWidth={2.5}/>
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
              className="group flex min-h-[260px] w-full cursor-pointer flex-col overflow-hidden rounded-box border border-hairline bg-sectionHeader text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/35"
            >
              <span className="h-1 w-full shrink-0 bg-win" aria-hidden="true" />

              <div className="relative mx-3 mt-3 h-36 overflow-hidden  bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={answer.url} alt="" className="size-full bg-sectionHeader object-contain p-2 transition duration-200 group-hover:scale-[1.03]" />
                <span className="absolute left-2 top-1 inline-flex items-center gap-1 rounded-box border border-win/20 bg-win-tint px-2 py-0.5 text-[10px] font-bold text-win shadow-sm">
                  <CheckCircle2 className="size-3" />
                  ჩაბარებულია
                </span>
              </div>

              <div className="flex flex-1 flex-col border-t border-border/10 justify-between gap-3 px-3.5 pb-3.5 pt-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{answer.title}</p>
                <span className="inline-flex items-center gap-1.5
        rounded-[10px]
        border border-border/10
        w-fit
        bg-mainButton
        px-3 py-1.5
        text-xs font-semibold
        text-mainText
        shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.06)]
        transition-all duration-200
        hover:bg-mainButtonHover
        hover:text-ink
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]
        active:scale-[0.98]">
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
