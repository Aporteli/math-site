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
    <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-150">
      <div className="w-full max-w-sm rounded-box border border-hairline bg-paper p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-box border border-rose-500/20 bg-rose-500/10 text-rose-500">
          <AlertTriangle className="size-5" />
        </div>
        <h3 className="mb-1 text-base font-bold text-ink">ჯგუფის წაშლა</h3>
        <p className="mb-6 text-sm text-muted">ნამდვილად გსურთ ჯგუფის წაშლა? მოქმედება შეუქცევადია.</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeletingId(null)}
            disabled={isSaving}
            className="flex-1 cursor-pointer rounded-box border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper-deep">
            გაუქმება
          </button>
          <button
            onClick={handleDeleteCourse}
            disabled={isSaving}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-box border border-rose-500/30 bg-rose-500/15 px-4 py-2.5 text-sm font-bold text-rose-500 transition-colors hover:bg-rose-500/25 disabled:opacity-50">
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            წაშლა
          </button>
        </div>
      </div>
    </div>
    )
  );
}