'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  BarChart3,
  Bot,
  CreditCard,
  Database,
  Flag,
  FolderTree,
  Globe2,
  Languages,
  LayoutDashboard,
  Library,
  School,
  Shield,
  Sparkles,
  Users,
  Wrench,
  BookOpen,
  Plus,
  PenLine,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  KeyRound,
  UserCheck,
  Search,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { TaxonomyManager } from '@/components/lms/teacher/problem-bank/components/TaxonomyManager';
import { PageHero } from '@/components/ui/page-hero';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import {
  getAdminCoursesAction,
  getAdminTeachersAction,
  getAdminStudentsWithEnrollmentsAction,
  updateStudentEnrollmentsAction,
  createAdminCourseAction,
  updateAdminCourseAction,
  deleteAdminCourseAction,
} from '@/lib/actions/admin-courses';

type AdminCopy = Dictionary['dashboard']['teacher']['admin'];
type TaxonomyCopy = Dictionary['dashboard']['teacher']['taxonomy'];

export type AdminSectionId = keyof AdminCopy['sections'] | 'courses';

const SECTION_ICONS: Record<AdminSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  taxonomy: FolderTree,
  courses: BookOpen,
  users: Users,
  roles: Shield,
  ai: Bot,
  prompts: Sparkles,
  content: Library,
  storage: Database,
  lms: School,
  analytics: BarChart3,
  i18n: Languages,
  locales: Globe2,
  billing: CreditCard,
  featureFlags: Flag,
  system: Wrench,
};

const SECTION_ORDER: AdminSectionId[] = ['taxonomy', 'courses'];

function ComingSoonCard({
  title,
  description,
  soon,
  hint,
}: {
  title: string;
  description: string;
  soon: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
          <p className="mt-1 text-sm text-body">{description}</p>
        </div>
        <span className="rounded-full bg-brass-tint px-2.5 py-1 text-[11px] font-semibold text-brass">{soon}</span>
      </div>
      <p className="mt-4 rounded-xl border border-hairline-soft bg-paper px-4 py-3 text-sm text-muted">{hint}</p>
    </div>
  );
}

function CoursesManager() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // კურსის შექმნა/რედაქტირების მოდალი
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', title: '', teacherId: '', inviteCode: '' });

  // მოსწავლეების მიბმის მოდალი
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [coursesRes, teachersRes, studentsRes] = await Promise.all([
      getAdminCoursesAction(),
      getAdminTeachersAction(),
      getAdminStudentsWithEnrollmentsAction(),
    ]);
    if (coursesRes.success) setCourses(coursesRes.data || []);
    if (teachersRes.success) setTeachers(teachersRes.data || []);
    if (studentsRes.success) setStudents(studentsRes.data || []);
    setLoading(false);
  }

  const openCourseModal = (course?: any) => {
    if (course) {
      setFormData({
        id: course.id,
        title: course.title,
        teacherId: course.teacherId || '',
        inviteCode: course.inviteCode || '',
      });
    } else {
      setFormData({
        id: '',
        title: '',
        teacherId: teachers[0]?.id || '',
        inviteCode: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeCourseModal = () => {
    setIsModalOpen(false);
    setFormData({ id: '', title: '', teacherId: '', inviteCode: '' });
  };

  const handleSaveCourse = async () => {
    if (!formData.title.trim() || !formData.teacherId) return;
    setIsSaving(true);

    let res;
    if (formData.id) {
      res = await updateAdminCourseAction(formData.id, {
        title: formData.title,
        teacherId: formData.teacherId,
        inviteCode: formData.inviteCode,
      });
    } else {
      res = await createAdminCourseAction({
        title: formData.title,
        teacherId: formData.teacherId,
        inviteCode: formData.inviteCode,
      });
    }

    if (res.success) {
      await loadData();
      closeCourseModal();
    } else {
      alert(res.error || 'შენახვა ვერ მოხერხდა');
    }
    setIsSaving(false);
  };

  const handleDeleteCourse = async () => {
    if (!deletingId) return;
    setIsSaving(true);
    const res = await deleteAdminCourseAction(deletingId);
    if (!res.success) alert(res.error);
    await loadData();
    setIsSaving(false);
    setDeletingId(null);
  };

  // მოსწავლის კურსების რედაქტირების დაწყება
  const startEditStudentEnrollments = (student: any) => {
    setEditingStudent(student);
    setSelectedCourseIds(student.enrollments.map((e: any) => e.courseId));
  };

  // მოსწავლის ჩარიცხვების შენახვა
  const handleSaveStudentEnrollments = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    const res = await updateStudentEnrollmentsAction(editingStudent.id, selectedCourseIds);
    if (res.success) {
      await loadData();
      setEditingStudent(null);
    } else {
      alert(res.error || 'განახლება ვერ მოხერხდა');
    }
    setIsSaving(false);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted">
        <Loader2 className="size-6 animate-spin text-navy mb-2" />
        <span className="text-sm font-bold">იტვირთება მონაცემები...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ზედა მოქმედებების პანელი */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setIsStudentsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-navy/20 bg-white px-4 py-2 text-sm font-bold text-navy shadow-xs transition-all hover:bg-navy-tint hover:border-navy/40 active:scale-95">
          <UserCheck className="size-4" />
          მოსწავლეების მართვა & მიბმა ({students.length})
        </button>

        <button
          onClick={() => openCourseModal()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition-all hover:bg-navy-strong active:scale-95">
          <Plus className="size-4" />
          ჯგუფის დამატება
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline py-16 text-center text-muted">
          <BookOpen className="mx-auto size-8 opacity-40 mb-3" />
          <p className="text-sm font-bold">ჯგუფები ჯერ არ არის დამატებული</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper/50 text-xs uppercase tracking-wider text-muted border-b border-hairline">
              <tr>
                <th className="px-4 py-3 font-bold">ჯგუფის სახელი</th>
                <th className="px-4 py-3 font-bold">მოსაწვევი კოდი</th>
                <th className="px-4 py-3 font-bold">მასწავლებელი</th>
                <th className="px-4 py-3 font-bold">მოსწავლეები</th>
                <th className="px-4 py-3 font-bold text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-white">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-ink">{course.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {course.inviteCode ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-navy-tint px-2 py-0.5 font-bold text-navy border border-navy/10">
                        <KeyRound className="size-3" />
                        {course.inviteCode}
                      </span>
                    ) : (
                      <span className="text-muted italic text-[11px]">არ აქვს</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {course.teacher?.name || course.teacher?.email || 'არ არის მინიჭებული'}
                  </td>
                  <td className="px-4 py-3 font-bold text-navy">{course._count.enrollments}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openCourseModal(course)}
                        className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:text-navy hover:border-navy/30 transition-colors">
                        <PenLine className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(course.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* მოსწავლეების სიის და კურსებზე ხელით მიბმის მოდალი */}
      {isStudentsModalOpen && (
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
      )}

      {/* კურსის შექმნა/რედაქტირების მოდალი */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-hairline pb-3">
              <h3 className="text-lg font-bold text-ink">{formData.id ? 'ჯგუფის რედაქტირება' : 'ახალი ჯგუფო'}</h3>
              <button onClick={closeCourseModal} className="text-muted hover:text-ink transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  ჯგუფის სახელი
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="მაგ. Algebra X"
                  className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-navy focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  მოსაწვევი კოდი (არასავალდებულო)
                </label>
                <input
                  type="text"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  placeholder="მაგ. MATH-10A"
                  className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm font-mono text-ink outline-none focus:border-navy focus:bg-white uppercase"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  მასწავლებელი
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-navy focus:bg-white">
                  <option value="" disabled>
                    აირჩიეთ მასწავლებელი
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeCourseModal}
                disabled={isSaving}
                className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:bg-paper transition-colors">
                გაუქმება
              </button>
              <button
                onClick={handleSaveCourse}
                disabled={isSaving || !formData.title.trim() || !formData.teacherId}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white transition-all hover:bg-navy-strong disabled:opacity-50">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* წაშლის მოდალი */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-1">ჯგუფის წაშლა</h3>
            <p className="text-sm text-muted mb-6">ნამდვილად გსურთ ჯგუფის წაშლა? მოქმედება შეუქცევადია.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-paper px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper-deep transition-colors">
                გაუქმება
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={isSaving}
                className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-rose-700 disabled:opacity-50">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPanel({
  locale,
  copy,
  taxonomyCopy,
  taxonomyNodes,
}: {
  locale: Locale;
  copy: AdminCopy;
  taxonomyCopy: TaxonomyCopy;
  taxonomyNodes: TaxonomyNodeDto[];
}) {
  const [section, setSection] = useState<AdminSectionId>('overview');

  const getActiveSectionInfo = (id: AdminSectionId) => {
    if (id === 'courses') {
      return {
        title: 'ჯგუფები',
        description: 'მართეთ კლასები, დაამატეთ ახალი, მიამაგრეთ მასწავლებელი ან მართეთ მოსწავლეები',
      };
    }
    return copy.sections[id as keyof AdminCopy['sections']];
  };

  const active = useMemo(() => getActiveSectionInfo(section), [copy, section]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHero icon={Shield} eyebrow={copy.eyebrow} title={copy.title} description={copy.subtitle} />

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-hairline bg-white p-2 shadow-sm lg:sticky lg:top-4">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{copy.sectionsNav}</p>
          <nav aria-label={copy.sectionsNav} className="space-y-0.5">
            {SECTION_ORDER.map((id) => {
              const Icon = SECTION_ICONS[id];
              const item = getActiveSectionInfo(id);
              const selected = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    selected ? 'bg-navy-tint font-semibold text-navy' : 'text-body hover:bg-paper hover:text-navy',
                  ].join(' ')}
                  onClick={() => setSection(id)}>
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {section === 'overview' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{active.title}</h2>
                <p className="mt-1 text-sm text-body">{active.description}</p>
                <p className="mt-4 text-sm text-muted">{copy.overviewHint}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {SECTION_ORDER.filter((id) => id !== 'overview').map((id) => {
                  const Icon = SECTION_ICONS[id];
                  const item = getActiveSectionInfo(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="flex h-full w-full flex-col gap-2 rounded-2xl border border-hairline bg-white p-4 text-left shadow-sm transition-colors hover:border-navy/30 hover:shadow-md"
                        onClick={() => setSection(id)}>
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold text-ink">{item.title}</span>
                        <span className="text-xs text-body">{item.description}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {section === 'taxonomy' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{active.title}</h2>
                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
                <TaxonomyManager locale={locale} copy={taxonomyCopy} initialNodes={taxonomyNodes} embedded />
              </div>
            </div>
          ) : null}

          {section === 'courses' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{active.title}</h2>
                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
                <CoursesManager />
              </div>
            </div>
          ) : null}

          {section !== 'overview' && section !== 'taxonomy' && section !== 'courses' ? (
            <ComingSoonCard
              title={active.title}
              description={active.description}
              soon={copy.comingSoon}
              hint={copy.comingSoonHint}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
