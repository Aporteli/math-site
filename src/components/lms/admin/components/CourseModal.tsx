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
      <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-200">
        <div className="w-full max-w-md rounded-box border border-hairline bg-paper p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-5 border-b border-hairline pb-3">
            <h3 className="text-lg font-bold text-ink">{formData.id ? 'ჯგუფის რედაქტირება' : 'ახალი ჯგუფო'}</h3>
            <button onClick={closeCourseModal} className="cursor-pointer text-muted transition-colors hover:text-ink">
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
                className="w-full rounded-box border border-hairline bg-searchInput px-4 py-2.5 text-sm font-medium text-searchInputText outline-none focus:border-navy focus:bg-searchInput"
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
                className="w-full rounded-box border border-hairline bg-searchInput px-4 py-2.5 font-mono text-sm uppercase text-searchInputText outline-none focus:border-navy focus:bg-searchInput"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">მასწავლებელი</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full rounded-box border border-hairline bg-searchInput px-4 py-2.5 text-sm font-bold text-searchInputText outline-none focus:border-navy focus:bg-searchInput">
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
              className="cursor-pointer rounded-box border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper-deep">
              გაუქმება
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={isSaving || !formData.title.trim() || !formData.teacherId}
              className="inline-flex cursor-pointer items-center gap-2 rounded-box bg-[#465D73] px-5 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              შენახვა
            </button>
          </div>
        </div>
      </div>
    )
  );
}
