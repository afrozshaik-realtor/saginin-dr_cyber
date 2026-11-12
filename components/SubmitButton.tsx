"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the form's server action runs (stops double-click double submits). */
export function SubmitButton({ children, className, pendingText = "Please wait..." }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
