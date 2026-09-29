"use client";

import { useState } from "react";
import type { LessonResource, LessonResourceKind } from "@/types/lms";

const kindOptions: { value: LessonResourceKind; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "video", label: "Video link" },
  { value: "file", label: "File upload" }
];

function newResource(): LessonResource {
  return { id: crypto.randomUUID(), label: "", kind: "link", url: "" };
}

export function ResourcesEditor({ initialResources }: { initialResources: LessonResource[] }) {
  const [resources, setResources] = useState<LessonResource[]>(initialResources);

  return (
    <div>
      <p className="text-sm font-semibold">Resources (optional - extra videos, links, or files for this lesson)</p>
      <input type="hidden" name="resourcesJson" value={JSON.stringify(resources)} />
      <div className="mt-2 space-y-3">
        {resources.map((resource) => (
          <div key={resource.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <select
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={resource.kind}
                onChange={(event) =>
                  setResources((prev) =>
                    prev.map((item) =>
                      item.id === resource.id
                        ? { ...item, kind: event.target.value as LessonResourceKind, url: "" }
                        : item
                    )
                  )
                }
              >
                {kindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:underline"
                onClick={() => setResources((prev) => prev.filter((item) => item.id !== resource.id))}
              >
                Remove
              </button>
            </div>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Label (e.g. Lecture slides PDF)"
              value={resource.label}
              onChange={(event) =>
                setResources((prev) =>
                  prev.map((item) => (item.id === resource.id ? { ...item, label: event.target.value } : item))
                )
              }
            />
            {resource.kind === "file" ? (
              <>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="file"
                  name={`resourceFile-${resource.id}`}
                />
                {resource.url ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Current file is kept unless you choose a new one above.
                  </p>
                ) : null}
              </>
            ) : (
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://..."
                value={resource.url}
                onChange={(event) =>
                  setResources((prev) =>
                    prev.map((item) => (item.id === resource.id ? { ...item, url: event.target.value } : item))
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-cloud"
        onClick={() => setResources((prev) => [...prev, newResource()])}
      >
        + Add resource
      </button>
    </div>
  );
}
