"use client";

import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  ArrowRightLeft,
  Sparkles,
  ChevronDown,
  ZoomIn,
  AlertCircle,
} from "lucide-react";
import { convertPdfToImages } from "@/lib/pdf-helpers";
import { KatexPreview } from "@/components/math/katex-preview";

// 1. სქროლის ჩამკეტი ჰუკი
export function useLockBodyScroll(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [lock]);
}

interface AssignmentProblemItem {
  id: string;
  topic: string;
  difficulty: string;
  promptTex?: string;
  previewUrl?: string;
  fileName?: string;
}

interface BatchUploadModalProps {
  problems: AssignmentProblemItem[];
  onClose: () => void;
  onApplyAssignments: (
    assignmentsMap: { problemId: string; previewUrl: string; fileName: string }[]
  ) => void;
}

interface UploadedFileItem {
  id: string;
  name: string;
  url: string;
}

export function BatchUploadModal({
  problems,
  onClose,
  onApplyAssignments,
}: BatchUploadModalProps) {
  // ვრთავთ ფონის სქროლის ჩამკეტს
  useLockBodyScroll(true);

  const [loading, setLoading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<UploadedFileItem[]>([]);

  const [matches, setMatches] = useState<Record<string, string>>({});

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredItems, setHoveredItems] = useState<Record<string, string | null>>({});

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    const fileArray = Array.from(files);
    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          const pdfPages = await convertPdfToImages(file);
          pdfPages.forEach((page, idx) => {
            newItems.push({
              id: `pdf-page-${Date.now()}-${idx}-${Math.random()}`,
              name: `${file.name} (${page.name})`,
              url: page.url,
            });
          });
        } catch (e) {
          console.error("PDF-ის დამუშავების შეცდომა:", e);
          alert(`ვერ მოხერხდა PDF-ის წაკითხვა: ${file.name}`);
        }
      } else if (file.type.startsWith("image/")) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newItems.push({
          id: `img-${Date.now()}-${i}-${Math.random()}`,
          name: file.name,
          url: base64,
        });
      }
    }

    const allItems = [...uploadedItems, ...newItems];
    setUploadedItems(allItems);

    const newMatches: Record<string, string> = { ...matches };
    problems.forEach((prob, index) => {
      if (!newMatches[prob.id] && allItems[index]) {
        newMatches[prob.id] = allItems[index].id;
      }
    });

    setMatches(newMatches);
    setLoading(false);
  };

  const handleMatchChange = (problemId: string, itemId: string) => {
    setMatches((prev) => ({
      ...prev,
      [problemId]: itemId,
    }));
  };

  const handleUnmatch = (problemId: string) => {
    setMatches((prev) => {
      const copy = { ...prev };
      delete copy[problemId];
      return copy;
    });
  };

  const handleDropdownHover = (problemId: string, itemId: string | null) => {
    setHoveredItems((prev) => ({
      ...prev,
      [problemId]: itemId,
    }));
  };

  const handleConfirm = () => {
    const results = Object.entries(matches)
      .map(([problemId, itemId]) => {
        const item = uploadedItems.find((u) => u.id === itemId);
        if (!item) return null;
        return {
          problemId,
          previewUrl: item.url,
          fileName: item.name,
        };
      })
      .filter(Boolean) as { problemId: string; previewUrl: string; fileName: string }[];

    onApplyAssignments(results);
    onClose();
  };

  const matchedCount = Object.keys(matches).length;
  const totalCount = Math.max(problems.length, 1);
  const progressPct = Math.min(100, Math.round((matchedCount / totalCount) * 100));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-gradient-to-b from-paper/60 to-white px-6 py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-navy/10 bg-navy-tint text-navy">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-ink leading-tight">
                ამოხსნების ერთდროული ატვირთვა
              </h3>
              <p className="text-xs text-muted mt-0.5">
                ატვირთეთ 1 ცალი PDF ან მრავალი ფოტო ერთად — სისტემა ავტომატურად გაანაწილებს ბილეთებზე.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div
          className="flex-1 overflow-y-auto p-6 pb-32 space-y-6"
          onClick={() => setOpenDropdown(null)}
        >
          {/* Upload Zone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleFiles(files).finally(() => {
                  if (fileInputRef.current) fileInputRef.current.value = "";
                });
              }
            }}
          />

          <div
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDragging) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-navy bg-navy-tint/60 scale-[1.01]"
                : "border-navy/30 bg-navy-tint/20 hover:border-navy hover:bg-navy-tint/40"
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="size-8 animate-spin text-navy" />
                <p className="text-sm font-bold text-navy">ფაილები მუშავდება...</p>
              </div>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-2xl border border-navy/10 bg-white text-navy shadow-sm transition-transform group-hover:scale-105">
                  <UploadCloud className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">
                    დააჭირეთ, ან გადმოათრიეთ ფაილები აქ (PDF ან რამდენიმე სურათი)
                  </p>
                  <p className="text-xs text-muted mt-1">
                    ატვირთულია:{" "}
                    <span className="font-bold text-navy">{uploadedItems.length} გვერდი/ფოტო</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Quick Match List */}
          {uploadedItems.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    ბილეთებისა და ფოტოების შესაბამისობა
                  </h4>
                  <span className="text-xs font-bold text-navy">
                    {matchedCount}/{problems.length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full bg-navy transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {problems.map((problem, idx) => {
                  const assignedItemId = matches[problem.id];

                  const currentPreviewId = hoveredItems[problem.id] || assignedItemId;
                  const currentPreviewItem = uploadedItems.find((u) => u.id === currentPreviewId);
                  const assignedItem = uploadedItems.find((u) => u.id === assignedItemId);

                  const isDropdownOpen = openDropdown === problem.id;

                  return (
                    <div
                      key={problem.id}
                      className={`relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 rounded-2xl border p-4 transition-all ${
                        isDropdownOpen ? "z-50 ring-2 ring-navy/20" : "z-10"
                      } ${
                        assignedItem
                          ? "border-emerald-200 bg-emerald-50/20 shadow-sm"
                          : "border-hairline bg-white shadow-sm"
                      }`}
                    >
                      {/* 1. ამოცანის ინფორმაცია */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-2.5 flex items-center gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                            {problem.topic || `ამოცანა ${idx + 1}`}
                          </span>
                          {assignedItem ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle className="size-4 shrink-0 text-amber-400" />
                          )}
                        </div>

                        {problem.promptTex && (
                          <div className="relative max-h-[70px] overflow-hidden rounded-xl border border-hairline-soft bg-paper/50 p-2.5">
                            <KatexPreview
                              tex={problem.promptTex}
                              className="text-[11px] sm:text-xs text-ink/80 leading-relaxed"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-paper/90 to-transparent" />
                          </div>
                        )}
                      </div>

                      {/* 2. მიბმის კონტროლი */}
                      <div className="w-full shrink-0 sm:w-56">
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                          <ArrowRightLeft className="size-3" />
                          მიბმული ფაილი
                        </label>
                        <div className="relative w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(isDropdownOpen ? null : problem.id);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg border py-2 px-3 text-xs font-bold transition-colors ${
                              assignedItem
                                ? "border-emerald-300 bg-white text-emerald-800"
                                : "border-hairline bg-paper text-ink"
                            }`}
                          >
                            <span className="truncate">
                              {assignedItem ? assignedItem.name : "(არ არის მიბმული)"}
                            </span>
                            <ChevronDown
                              className={`size-3.5 shrink-0 ml-2 transition-transform ${
                                isDropdownOpen ? "rotate-180 opacity-100" : "opacity-50"
                              }`}
                            />
                          </button>

                          {isDropdownOpen && (
                            <div
                              className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-hairline bg-white shadow-2xl custom-scrollbar"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleMatchChange(problem.id, "");
                                  setOpenDropdown(null);
                                  handleDropdownHover(problem.id, null);
                                }}
                                onMouseEnter={() => handleDropdownHover(problem.id, null)}
                                className="w-full border-b border-hairline-soft px-3 py-3 text-left text-xs font-medium text-muted transition-colors hover:bg-paper"
                              >
                                (არ არის მიბმული)
                              </button>

                              {uploadedItems.map((item, itemIdx) => {
                                const isSelected = assignedItemId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      handleMatchChange(problem.id, item.id);
                                      setOpenDropdown(null);
                                      handleDropdownHover(problem.id, null);
                                    }}
                                    onMouseEnter={() => handleDropdownHover(problem.id, item.id)}
                                    onMouseLeave={() => handleDropdownHover(problem.id, null)}
                                    className={`w-full text-left px-3 py-3 text-xs transition-colors ${
                                      isSelected
                                        ? "bg-navy font-bold text-white"
                                        : "font-medium text-ink hover:bg-navy-tint hover:text-navy"
                                    }`}
                                  >
                                    #{itemIdx + 1} — {item.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Thumbnail Preview */}
                      {currentPreviewItem ? (
                        <div className="group relative shrink-0 self-center transition-all duration-200 sm:self-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentPreviewItem.url}
                            alt="Preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenImage(currentPreviewItem.url);
                            }}
                            className="h-24 w-28 rounded-xl border border-hairline bg-white object-cover shadow-sm transition-transform cursor-zoom-in group-hover:scale-105"
                          />

                          {/* Hover ლუპა */}
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-900/0 transition-all group-hover:bg-slate-900/20">
                            <span className="flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                              <ZoomIn className="size-3" /> გადიდება
                            </span>
                          </div>

                          {assignedItemId === currentPreviewItem.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnmatch(problem.id);
                              }}
                              className="absolute -top-2 -right-2 z-20 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md transition-colors hover:bg-rose-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-24 w-28 shrink-0 items-center justify-center self-center rounded-xl border-2 border-dashed border-hairline bg-paper/50 text-muted transition-all duration-200">
                          <FileText className="size-8 opacity-30" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-hairline bg-paper/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-hairline bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper"
          >
            გაუქმება
          </button>

          {uploadedItems.length > 0 &&
            (matchedCount < problems.length ? (
              <p className="hidden text-xs text-muted sm:block">
                დარჩენილია{" "}
                <span className="font-bold text-amber-600">
                  {problems.length - matchedCount}
                </span>{" "}
                მიუბმელი ბარათი
              </p>
            ) : (
              <p className="hidden items-center gap-1.5 text-xs font-bold text-emerald-600 sm:flex">
                <CheckCircle2 className="size-3.5" /> ყველა ბარათი მიბმულია
              </p>
            ))}

          <button
            type="button"
            disabled={matchedCount === 0 || loading}
            onClick={handleConfirm}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-navy-strong disabled:opacity-40 active:scale-95"
          >
            <CheckCircle2 className="size-4" />
            <span>ყველას მიბმა და მომზადება ({matchedCount})</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Image Preview */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-rose-500"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage}
              alt="გადიდებული გვერდი"
              className="max-h-[95vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}