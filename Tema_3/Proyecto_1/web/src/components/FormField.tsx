import { useId, type InputHTMLAttributes } from "react";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onChange"> {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

/** Input con etiqueta, ayuda y error asociados (accesibles por lector de pantalla). */
export function FormField({ label, name, value, onChange, error, hint, ...input }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
      />
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
