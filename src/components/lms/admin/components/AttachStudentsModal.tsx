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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-navy-tint text-navy">
              <UserCheck className="size-5" />
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
            className="text-muted hover:text-ink transition-colors">
            <X className="size-5" />
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
              className="w-full rounded-xl border border-hairline bg-paper py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-navy focus:bg-white"
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
                    className={`rounded-2xl border p-4 transition-all ${
                      isEditingThis
                        ? 'border-navy bg-navy-tint/20 ring-1 ring-navy/20'
                        : 'border-hairline bg-white hover:border-navy/30'
                    }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-ink">{st.name}</h4>
                        <p className="text-xs text-muted">{st.email}</p>
                      </div>

                      {!isEditingThis && (
                        <button
                          onClick={() => startEditStudentEnrollments(st)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3 py-1.5 text-xs font-bold text-navy hover:bg-paper-deep transition-colors">
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
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-colors ${
                                    checked
                                      ? 'bg-navy text-white border-navy'
                                      : 'bg-white text-ink border-hairline hover:bg-paper'
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
                                    className={`size-4 rounded-md border flex items-center justify-center ${
                                      checked ? 'border-white bg-white text-navy' : 'border-hairline bg-white'
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
                              className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-paper">
                              გაუქმება
                            </button>
                            <button
                              onClick={handleSaveStudentEnrollments}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-1.5 text-xs font-bold text-white hover:bg-navy-strong transition-colors">
                              {isSaving && <Loader2 className="size-3 animate-spin" />}
                              შენახვა
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted font-medium mr-1">ჯგუფები:</span>
                          {st.enrollments.length === 0 ? (
                            <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                              არცერთ ჯგუფზე არ არის
                            </span>
                          ) : (
                            st.enrollments.map((e: any) => (
                              <span
                                key={e.courseId}
                                className="rounded-lg bg-navy-tint px-2 py-0.5 text-xs font-bold text-navy border border-navy/10">
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

        <div className="border-t border-hairline bg-paper/30 px-6 py-4 flex justify-end">
          <button
            onClick={() => {
              setIsStudentsModalOpen(false);
              setEditingStudent(null);
            }}
            className="rounded-xl bg-white border border-hairline px-5 py-2 text-xs font-bold text-ink hover:bg-paper transition-colors">
            დახურვა
          </button>
        </div>
      </div>
    </div>
    )
  );
}