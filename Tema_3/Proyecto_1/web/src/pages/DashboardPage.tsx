import { useAuth } from "../auth/AuthContext";

/**
 * PROVISIONAL: solo confirma que hay sesión. El dashboard real (tarjetas, gráfica,
 * selector de días contra GET /dashboard) se implementa en un paso posterior.
 */
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="placeholder-page">
      <p className="brand">Snap</p>
      <h1>Hola, {user?.name}</h1>
      <p>
        Sesión iniciada como <strong>{user?.email}</strong>.
      </p>
      <p className="muted">El dashboard se construye en el siguiente paso.</p>
      <button type="button" className="btn-secondary" onClick={logout}>
        Cerrar sesión
      </button>
    </main>
  );
}
