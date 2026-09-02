'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="flex-1 border-hairline bg-paper overflow-y-auto pt-1 pe-1 custom-scrollbar">
      {answers.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted">
          <CheckCircle2 className="size-8 opacity-40 mb-2 text-brass" />
          <p className="text-sm font-bold text-ink">პასუხები ჯერ არ გაგიგზავნიათ</p>
          <p className="text-xs max-w-xs mt-1 text-muted">გამოიყენეთ ქვედა პანელი პასუხის ასატვირთად და გასაგზავნად.</p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
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
              className="flex flex-col justify-between rounded-2xl border border-hairline/40 bg-surface/30 p-3.5 transition-all cursor-pointer group hover:border-hairline hover:bg-surface/50 min-h-[220px]">
              
              <div className="flex flex-col gap-3 min-w-0">
                {/* ზედა პატარა ბეიჯი სურათის მსგავსად */}
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep/70 px-2.5 py-0.5 text-[10px] font-medium text-body border border-hairline/50">
                    <CheckCircle2 className="size-3 text-brass" />
                    <span>ჩაბარებულია</span>
                  </span>
                </div>

                {/* სურათის ჩარჩო: მუქი შეჭრილი ბლოკი */}
                <div className="w-full h-32 rounded-xl bg-black/50 p-1 flex items-center justify-center overflow-hidden border border-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ans.url}
                    alt="მოსწავლის პასუხი"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* ქვედა ზოლი: ხაზის გარეშე, სუფთა ტექსტური ისრით ზუსტად როგორც სურათზე */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-body group-hover:text-ink flex items-center gap-1 transition-colors">
                  <span>ნახვა</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}