import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="placeholder-page">
      <p className="brand">Snap</p>
      <h1>Página no encontrada</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </main>
  );
}
