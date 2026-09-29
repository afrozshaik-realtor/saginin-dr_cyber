"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PdfFormMeta } from "@/lib/services/pdfForm";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Answers = Record<string, string | boolean>;

export function PdfFormFiller({
  templateUrl,
  formMeta,
  initialAnswers,
  disabled
}: {
  templateUrl: string;
  formMeta: PdfFormMeta;
  initialAnswers?: Answers;
  disabled?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  const [pageImages, setPageImages] = useState<{ url: string; width: number; height: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const renderWidth = 720;

    async function render() {
      try {
        const response = await fetch(templateUrl);
        if (!response.ok) throw new Error("Could not load the assignment PDF.");
        const bytes = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

        const images: { url: string; width: number; height: number }[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = renderWidth / unscaled.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not render the PDF.");
          await page.render({ canvasContext: context, viewport }).promise;
          images.push({ url: canvas.toDataURL("image/png"), width: viewport.width, height: viewport.height });
        }
        if (!cancelled) setPageImages(images);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the assignment PDF.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [templateUrl]);

  function setAnswer(name: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }

  if (error) {
    return <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }

  if (!pageImages) {
    return <p className="mt-4 text-sm text-slate-500">Loading assignment form...</p>;
  }

  return (
    <div ref={containerRef} className="mt-4 space-y-4 overflow-x-auto">
      <input type="hidden" name="answersJson" value={JSON.stringify(answers)} />
      {pageImages.map((page, pageIndex) => {
        const scale = page.width / (formMeta.pages[pageIndex]?.width || page.width);
        return (
          <div
            key={pageIndex}
            className="relative border border-slate-200"
            style={{ width: page.width, height: page.height }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.url} alt={`Page ${pageIndex + 1}`} width={page.width} height={page.height} />
            {formMeta.fields.map((field) =>
              field.widgets
                .filter((widget) => widget.page === pageIndex)
                .map((widget, widgetIndex) => {
                  const pageHeightPt = formMeta.pages[pageIndex]?.height || 0;
                  const left = widget.rect.x * scale;
                  const top = (pageHeightPt - widget.rect.y - widget.rect.height) * scale;
                  const width = widget.rect.width * scale;
                  const height = widget.rect.height * scale;
                  const style: React.CSSProperties = { position: "absolute", left, top, width, height };

                  if (field.type === "text") {
                    return (
                      <input
                        key={`${field.name}-${widgetIndex}`}
                        type="text"
                        disabled={disabled}
                        className="border border-blueglow bg-white/90 px-1 text-sm"
                        style={style}
                        value={typeof answers[field.name] === "string" ? (answers[field.name] as string) : ""}
                        onChange={(event) => setAnswer(field.name, event.target.value)}
                      />
                    );
                  }
                  if (field.type === "checkbox") {
                    return (
                      <input
                        key={`${field.name}-${widgetIndex}`}
                        type="checkbox"
                        disabled={disabled}
                        style={style}
                        checked={answers[field.name] === true}
                        onChange={(event) => setAnswer(field.name, event.target.checked)}
                      />
                    );
                  }
                  if (field.type === "radio") {
                    return (
                      <input
                        key={`${field.name}-${widgetIndex}`}
                        type="radio"
                        name={field.name}
                        disabled={disabled}
                        style={style}
                        checked={answers[field.name] === widget.optionValue}
                        onChange={() => setAnswer(field.name, widget.optionValue || "")}
                      />
                    );
                  }
                  if (field.type === "dropdown") {
                    return (
                      <select
                        key={`${field.name}-${widgetIndex}`}
                        disabled={disabled}
                        className="border border-blueglow bg-white/90 text-sm"
                        style={style}
                        value={typeof answers[field.name] === "string" ? (answers[field.name] as string) : ""}
                        onChange={(event) => setAnswer(field.name, event.target.value)}
                      >
                        <option value="" disabled>
                          Select...
                        </option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return null;
                })
            )}
          </div>
        );
      })}
    </div>
  );
}
