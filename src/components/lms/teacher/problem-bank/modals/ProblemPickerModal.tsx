"use client";

import { useState } from "react";
import { X, Search, Check, FolderOpen } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";

export interface SetProblem {
  id: string;
  setId: string;
  setTitle: string;
  title: string;
  promptTex: string;
  solutionTex: string;
  difficulty?: string;
  grade?: string;
  kind?: string;
}

export function ProblemPickerModal({
  problems,
  onSelect,
  onClose,
}: {
  problems: SetProblem[];
  onSelect: (problem: SetProblem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedSet, setSelectedSet] = useState<string>("ALL");

  const setNames = Array.from(new Set(problems.map((p) => p.setTitle)));

  const filtered = problems.filter((p) => {
    const matchesSet = selectedSet === "ALL" || p.setTitle === selectedSet;
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.promptTex.toLowerCase().includes(search.toLowerCase());
    return matchesSet && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-3xl border border-hairline bg-paper shadow-2xl overflow-hidden">
        {/* ჰედერი */}
        <div className="flex items-center justify-between border-b border-hairline bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">ბარათის არჩევა ბანკიდან / Set-ებიდან</h3>
              <p className="text-xs text-muted">აირჩიეთ სასურველი ბარათი მოსწავლესთან გასაგზავნად</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted transition-colors hover:bg-paper-deep hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ფილტრები და ძებნა */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-white/70 px-6 py-3 backdrop-blur-sm">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 size-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="მოძებნეთ ამოცანის ტექსტით ან თემით..."
              className="w-full rounded-xl border border-hairline bg-paper pl-9 pr-3 py-1.5 text-xs outline-none focus:border-navy"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedSet("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedSet === "ALL"
                  ? "bg-navy text-white shadow-sm"
                  : "bg-paper text-muted hover:bg-paper-deep hover:text-ink"
              }`}
            >
              ყველა ({problems.length})
            </button>
            {setNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedSet(name)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedSet === name
                    ? "bg-navy text-white shadow-sm"
                    : "bg-paper text-muted hover:bg-paper-deep hover:text-ink"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* ბარათების სია/ბადე ქართული ტექსტითა და მათემატიკური ფორმულებით */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-semibold text-ink">ბარათები არ მოიძებნა</p>
              <p className="text-xs text-muted mt-1">სცადეთ სხვა საძიებო სიტყვა</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((problem) => (
                <div
                  key={problem.id}
                  onClick={() => {
                    onSelect(problem);
                    onClose();
                  }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-hairline bg-white p-5 shadow-sm transition-all hover:border-navy/60 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* ტეგები */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                        {problem.difficulty || "მარტივი"}
                      </span>
                      <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {problem.title}
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {problem.setTitle}
                      </span>
                    </div>

                    {/* ამოცანის პირობა KatexPreview-ით */}
                    <div className="text-sm font-medium text-ink leading-relaxed">
                      <KatexPreview tex={problem.promptTex} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-hairline-soft pt-3">
                    <span className="text-[11px] font-medium text-muted group-hover:text-navy transition-colors">
                      დააწკაპუნეთ ასარჩევად →
                    </span>
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-navy-tint text-navy opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="size-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}