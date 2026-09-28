"use client";

import { deleteLearningMoment } from "@/app/insights/actions";
import { Trash2 } from "lucide-react";

export function DeleteLearningMomentForm({ momentId, title }: { momentId: string; title: string }) {
  return (
    <form
      action={deleteLearningMoment}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}” from the journal? This cannot be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="momentId" value={momentId} />
      <button className="button-ghost gap-2 text-ink/45 hover:text-red-700" type="submit" aria-label={`Delete ${title}`}>
        <Trash2 size={15} /> Delete
      </button>
    </form>
  );
}
