import type { ReactNode } from "react";

/** Mensaje de error general del formulario (no ligado a un campo). */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  );
}
