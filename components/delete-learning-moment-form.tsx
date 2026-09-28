import { deleteLearningMoment } from "@/app/insights/actions";
import { Trash2 } from "lucide-react";

export function DeleteLearningMomentForm({ momentId, title }: { momentId: string; title: string }) {
  return (
    <details className="group relative sm:text-right">
      <summary className="button-ghost cursor-pointer list-none gap-2 text-ink/45 hover:text-red-700 [&::-webkit-details-marker]:hidden">
        <Trash2 size={15} /> Delete
      </summary>
      <div className="mt-2 rounded-xl border border-red-100 bg-red-50 p-3 text-left sm:absolute sm:right-0 sm:z-10 sm:w-64 sm:shadow-lg">
        <p className="text-xs leading-5 text-red-800">Delete “{title}”? This cannot be undone.</p>
        <form action={deleteLearningMoment} className="mt-2">
          <input type="hidden" name="momentId" value={momentId} />
          <button className="min-h-9 rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800" type="submit">
            Delete permanently
          </button>
        </form>
      </div>
    </details>
  );
}
