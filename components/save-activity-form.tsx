import { setSavedActivity } from "@/app/library/actions";
import { Heart } from "lucide-react";

export function SaveActivityForm({
  templateId,
  saved,
  returnTo,
  removeLabel,
}: {
  templateId: string;
  saved: boolean;
  returnTo: string;
  removeLabel?: string;
}) {
  return (
    <form action={setSavedActivity}>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="saved" value={saved ? "false" : "true"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={saved ? "button-ghost gap-2 bg-[#f6d8cf] text-[#a9503b]" : "button-ghost gap-2 text-ink/55"} type="submit">
        <Heart size={16} aria-hidden="true" fill={saved ? "currentColor" : "none"} /> {saved ? removeLabel ?? "Saved" : "Save idea"}
      </button>
    </form>
  );
}
