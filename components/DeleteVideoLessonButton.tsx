"use client";

import { useRouter } from "next/navigation";

export function DeleteVideoLessonButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="text-sm font-semibold text-red-600"
      type="button"
      onClick={async () => {
        if (!confirm("Remove this lesson? (The video file stays in R2.)")) return;
        await fetch(`/api/admin/video/lessons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Remove
    </button>
  );
}
