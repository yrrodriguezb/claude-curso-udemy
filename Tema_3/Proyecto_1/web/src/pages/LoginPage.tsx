import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../api/errors";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { FormField } from "../components/FormField";
import { useAuth } from "../auth/AuthContext";
import { focusFirstInvalid, unexpectedMessage } from "../auth/formErrors";
import { safeNext } from "../auth/guards";
import { validateLogin, type FieldErrors } from "../auth/validation";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // El error del campo se quita al editarlo; la alerta general se mantiene hasta el
  // siguiente envío para que el formulario no salte bajo el cursor mientras escribes.
  function edit(field: string, setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setErrors(({ [field]: _removed, ...rest }) => rest);
    };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const local = validateLogin(email, password);
    setErrors(local);
    if (Object.keys(local).length) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") {
        setFormError("Email o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.");
        setPassword("");
      } else if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setErrors(err.fieldErrors());
        focusFirstInvalid(formRef.current);
      } else {
        setFormError(unexpectedMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const registerLink = params.has("next") ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Entra para ver tus enlaces y estadísticas."
      footer={
        <>
          ¿No tienes cuenta? <Link to={registerLink}>Regístrate</Link>
        </>
      }
    >
      {formError && <Alert>{formError}</Alert>}
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={edit("email", setEmail)}
          error={errors.email}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={edit("password", setPassword)}
          error={errors.password}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
