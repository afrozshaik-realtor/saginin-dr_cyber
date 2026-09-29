import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField
} from "pdf-lib";

export type PdfFieldType = "text" | "checkbox" | "radio" | "dropdown";

export type PdfFieldWidget = {
  page: number;
  rect: { x: number; y: number; width: number; height: number };
  // For checkbox/radio widgets only - the "on" value this specific widget represents.
  optionValue?: string;
};

export type PdfFieldMeta = {
  name: string;
  type: PdfFieldType;
  widgets: PdfFieldWidget[];
  options?: string[];
};

export type PdfFormMeta = {
  pages: { width: number; height: number }[];
  fields: PdfFieldMeta[];
};

/**
 * Reads a fillable PDF's AcroForm fields and their on-page positions, so the app can render an
 * HTML overlay form on top of a client-rendered image of each page (see components/PdfFormFiller.tsx).
 */
export async function extractFormFields(pdfBytes: Uint8Array): Promise<PdfFormMeta> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  const pageSizes = pages.map((page) => {
    const { width, height } = page.getSize();
    return { width, height };
  });

  function findPageIndex(widgetDict: object): number {
    for (let i = 0; i < pages.length; i++) {
      const annots = pages[i].node.Annots();
      if (!annots) continue;
      for (let j = 0; j < annots.size(); j++) {
        const dict = pages[i].node.context.lookup(annots.get(j));
        if (dict === widgetDict) return i;
      }
    }
    return 0;
  }

  const form = doc.getForm();
  const fields: PdfFieldMeta[] = [];

  for (const field of form.getFields()) {
    const name = field.getName();
    const acroWidgets = field.acroField.getWidgets();

    let type: PdfFieldType = "text";
    let options: string[] | undefined;
    if (field instanceof PDFCheckBox) type = "checkbox";
    else if (field instanceof PDFRadioGroup) {
      type = "radio";
      options = field.getOptions();
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      type = "dropdown";
      options = field.getOptions();
    } else if (field instanceof PDFTextField) {
      type = "text";
    } else {
      continue;
    }

    const widgets: PdfFieldWidget[] = acroWidgets.map((widget, index) => {
      const rect = widget.getRectangle();
      const page = findPageIndex(widget.dict);
      // Radio groups can have a separate "export values" label list distinct from each widget's
      // raw on-state name (e.g. widget states "0"/"1" mapped to labels "yes"/"no") - widget order
      // matches options order, so index into `options` rather than trusting the raw widget value.
      const optionValue =
        type === "radio" ? options?.[index] : type === "checkbox" ? widget.getOnValue()?.decodeText() : undefined;
      return {
        page,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        optionValue
      };
    });

    fields.push({ name, type, widgets, options });
  }

  return { pages: pageSizes, fields };
}

/**
 * Fills a fillable PDF template with the student's submitted answers and flattens it into a
 * plain, non-editable PDF - the final artifact that gets stored and emailed.
 */
export async function fillFormPdf(
  templateBytes: Uint8Array,
  answers: Record<string, string | boolean>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const form = doc.getForm();

  for (const field of form.getFields()) {
    const name = field.getName();
    if (!(name in answers)) continue;
    const value = answers[name];

    try {
      if (field instanceof PDFTextField) {
        field.setText(typeof value === "string" ? value : String(value ?? ""));
      } else if (field instanceof PDFCheckBox) {
        if (value === true || value === "true" || value === "on") field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup) {
        if (typeof value === "string" && value) field.select(value);
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        if (typeof value === "string" && value) field.select(value);
      }
    } catch {
      // Ignore values that no longer validate against the field (e.g. a stale option) -
      // better to submit the rest of the form than fail the whole submission.
    }
  }

  form.flatten();
  return doc.save();
}
