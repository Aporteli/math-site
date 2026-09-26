import { X } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CourseModalProps {
  isModalOpen: boolean;
  closeCourseModal: () => void;
  formData: any;
  setFormData: (data: any) => void;
  isSaving: boolean;
  teachers: any[];
  handleSaveCourse: () => void;
}

export function CourseModal({
  isModalOpen,
  closeCourseModal,
  formData,
  setFormData,
  isSaving,
  teachers,
  handleSaveCourse,
}: CourseModalProps) {
  return (
    isModalOpen && (
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">მასწავლებელი</label>
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
    )
  );
}
