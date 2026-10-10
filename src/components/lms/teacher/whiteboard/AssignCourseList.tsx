'use client';

import { ChevronDown, Loader2, Check, GraduationCap } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function AssignCourseList({ model }: { model: TeacherWhiteboardModel }) {
  const {
    courseGroups,
    expandedCourseIds,
    loadingCourses,
    selectedStudentIds,
    setSelectedStudentIds,
    toggleCourseExpand,
    toggleCourseSelectAll,
    toggleStudentSelection,
  } = model;
  return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">
                    კურსები და მოსწავლეები ({selectedStudentIds.length} მონიშნულია):
                  </span>
                  {courseGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allStudentIds = courseGroups.flatMap((g) => g.students.map((s) => s.id));
                        if (allStudentIds.every((id) => selectedStudentIds.includes(id))) {
                          setSelectedStudentIds([]);
                        } else {
                          setSelectedStudentIds(Array.from(new Set(allStudentIds)));
                        }
                      }}
                      className="text-xs font-bold text-navy hover:underline">
                      {courseGroups.flatMap((g) => g.students).every((s) => selectedStudentIds.includes(s.id))
                        ? 'მონიშვნის მოხსნა'
                        : 'ყველა მოსწავლის მონიშვნა'}
                    </button>
                  )}
                </div>
                {loadingCourses ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
                    <Loader2 className="size-6 animate-spin text-navy" />
                    <span className="text-xs">კურსები იტვირთება...</span>
                  </div>
                ) : courseGroups.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed rounded-box">
                    კურსები და მოსწავლეები ვერ მოიძებნა
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {courseGroups.map((group) => {
                      const isExpanded = expandedCourseIds.includes(group.id);
                      const groupStudentIds = group.students.map((s) => s.id);
                      const allGroupSelected =
                        groupStudentIds.length > 0 && groupStudentIds.every((id) => selectedStudentIds.includes(id));
                      const someGroupSelected =
                        groupStudentIds.some((id) => selectedStudentIds.includes(id)) && !allGroupSelected;
                      return (
                        <div
                          key={group.id}
                          className="rounded-box border border-hairline bg-paper/30 overflow-hidden transition-all">
                          <div
                            onClick={() => toggleCourseExpand(group.id)}
                            className="flex cursor-pointer items-center justify-between bg-main p-3 transition-colors hover:bg-sectionHeader">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <GraduationCap className="size-4 text-navy shrink-0" />
                              <span className="text-xs font-bold text-ink truncate">{group.title}</span>
                              <span className="rounded-box bg-paper-deep px-1.5 py-0.5 text-[10px] font-bold text-muted">
                                {group.students.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseSelectAll(group);
                                }}
                                className={`rounded-box border px-2 py-1 text-[11px] font-bold transition-all ${allGroupSelected ? 'border-hairline bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : someGroupSelected ? 'border-navy/30 bg-navy-tint text-navy' : 'border-hairline bg-paper text-muted hover:text-ink'}`}>
                                {allGroupSelected ? 'მონიშნულია' : 'ჯგუფის მონიშვნა'}
                              </button>
                              <ChevronDown
                                className={`size-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="space-y-1 border-t border-hairline bg-sectionHeader p-2">
                              {group.students.length === 0 ? (
                                <p className="text-[11px] text-muted p-2 text-center">ამ კურსში მოსწავლეები არ არიან</p>
                              ) : (
                                group.students.map((student) => {
                                  const isSelected = selectedStudentIds.includes(student.id);
                                  return (
                                    <div
                                      key={student.id}
                                      onClick={() => toggleStudentSelection(student.id)}
                                      className={`flex cursor-pointer items-center justify-between rounded-box p-2 text-xs transition-all ${isSelected ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]' : 'border border-hairline bg-main text-ink hover:bg-sectionHeader'}`}>
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <div
                                          className={`flex size-5 shrink-0 items-center justify-center rounded-box text-[9px] font-bold ${isSelected ? 'bg-[#465D73] text-white' : 'bg-paper-deep text-muted'}`}>
                                          {student.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{student.name}</span>
                                      </div>
                                      <div
                                        className={`flex size-4 shrink-0 items-center justify-center rounded-box border transition-all ${isSelected ? 'border-[#465D73] bg-[#465D73] text-white' : 'border-hairline bg-paper text-transparent'}`}>
                                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
  );
}
