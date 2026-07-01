import { Label } from "~/components/ui/label";

/** Label + control + inline error, in spec-compliant order (error below field). */
export function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error ? <p className="mt-1 text-sm text-ink-subtle">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-ink-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
