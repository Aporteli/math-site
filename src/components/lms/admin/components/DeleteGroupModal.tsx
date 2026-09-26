import { AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DeleteGroupModalProps {
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  isSaving: boolean;
  handleDeleteCourse: () => void;
}

export function DeleteGroupModal({ deletingId, setDeletingId, isSaving, handleDeleteCourse }: DeleteGroupModalProps) {
  return (
    deletingId && (
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
    )
  );
}