import { UserCheck } from "lucide-react";
import { X } from "lucide-react";
import { Search, Check } from "lucide-react";
import { PenLine } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface AttachStudentsModalProps {
  startEditStudentEnrollments: (student: any) => void;
  isStudentsModalOpen: boolean;
  setIsStudentsModalOpen: (isOpen: boolean) => void;
  editingStudent: any;
  setEditingStudent: (student: any) => void;
  studentSearch: string;
  setStudentSearch: (search: string) => void;
  filteredStudents: any[];
  courses: any[];
  selectedCourseIds: string[];
  setSelectedCourseIds: Dispatch<SetStateAction<string[]>>;
  isSaving: boolean;
  handleSaveStudentEnrollments: () => void;
}

export function AttachStudentsModal({ startEditStudentEnrollments, isStudentsModalOpen, setIsStudentsModalOpen, editingStudent, setEditingStudent, studentSearch, setStudentSearch, filteredStudents, courses, selectedCourseIds, setSelectedCourseIds, isSaving, handleSaveStudentEnrollments }: AttachStudentsModalProps) {
  return (
    isStudentsModalOpen && (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-box border border-hairline bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline bg-sectionHeader px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center text-brass-strong">
              <UserCheck className="size-7" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">მოსწავლეების მიბმა ჯგუფებზე</h3>
              <p className="text-xs text-muted">მიაბით ან გადაიყვანეთ მოსწავლე სასურველ კლასში ხელით</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsStudentsModalOpen(false);
              setEditingStudent(null);
            }}
            className="cursor-pointer text-muted transition-colors hover:text-loss">
            <X className="size-7" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* ძებნა */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="მოძებნეთ მოსწავლე სახელით ან მეილით..."
              className="w-full rounded-box border border-hairline bg-searchInput py-2.5 pl-10 pr-4 text-sm font-medium text-searchInputText outline-none focus:border-navy focus:bg-searchInput"
            />
          </div>

          {/* მოსწავლეების სია */}
          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pe-1">
            {filteredStudents.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">მოსწავლე ვერ მოიძებნა</p>
            ) : (
              filteredStudents.map((st) => {
                const isEditingThis = editingStudent?.id === st.id;

                return (
                  <div
                    key={st.id}
                    className={`rounded-box border p-4 transition-all ${
                      isEditingThis
                        ? 'border-navy bg-navy-tint/30'
                        : 'border-hairline bg-main hover:bg-sectionHeader'
                    }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-ink">{st.name}</h4>
                        <p className="text-xs text-muted">{st.email}</p>
                      </div>

                      {!isEditingThis && (
                        <button
                          onClick={() => startEditStudentEnrollments(st)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:bg-paper-deep">
                          <PenLine className="size-3.5" />
                          ჯგუფების შეცვლა
                        </button>
                      )}
                    </div>

                    {/* მიმდინარე კურსები ან რედაქტირების არეალი */}
                    <div className="mt-3 pt-3 border-t border-hairline-soft">
                      {isEditingThis ? (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-ink uppercase tracking-wider">
                            მონიშნეთ ჯგუფი, რომელშიც უნდა იყოს ეს მოსწავლე:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {courses.map((course) => {
                              const checked = selectedCourseIds.includes(course.id);
                              return (
                                <label
                                  key={course.id}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-box border cursor-pointer text-xs font-bold transition-colors ${
                                    checked
                                      ? 'border-hairline bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                                      : 'border-hairline bg-main text-ink hover:bg-sectionHeader'
                                  }`}>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedCourseIds((prev) =>
                                        checked ? prev.filter((id) => id !== course.id) : [...prev, course.id],
                                      );
                                    }}
                                  />
                                  <div
                                    className={`size-4 rounded-box border flex items-center justify-center ${
                                      checked ? 'border-navy bg-[#465D73] text-white' : 'border-hairline bg-main'
                                    }`}>
                                    {checked && <Check className="size-3" />}
                                  </div>
                                  <span className="truncate">{course.title}</span>
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingStudent(null)}
                              disabled={isSaving}
                              className="cursor-pointer rounded-box border border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper-deep">
                              გაუქმება
                            </button>
                            <button
                              onClick={handleSaveStudentEnrollments}
                              disabled={isSaving}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-4 py-1.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:opacity-45">
                              {isSaving && <Loader2 className="size-3 animate-spin" />}
                              შენახვა
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted font-medium mr-1">ჯგუფები:</span>
                          {st.enrollments.length === 0 ? (
                            <span className="rounded-box border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-500">
                              არცერთ ჯგუფზე არ არის
                            </span>
                          ) : (
                            st.enrollments.map((e: any) => (
                              <span
                                key={e.courseId}
                                className="rounded-box bg-navy-tint px-2 py-0.5 text-xs font-bold text-navy border border-navy/10">
                                {e.course.title}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-hairline bg-sectionHeader px-6 py-4">
          <button
            onClick={() => {
              setIsStudentsModalOpen(false);
              setEditingStudent(null);
            }}
            className="cursor-pointer rounded-box border border-hairline bg-surface px-5 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-deep">
            დახურვა
          </button>
        </div>
      </div>
    </div>
    )
  );
}