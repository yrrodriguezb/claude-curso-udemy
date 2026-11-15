import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../api/errors";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { FormField } from "../components/FormField";
import { useAuth } from "../auth/AuthContext";
import { focusFirstInvalid, unexpectedMessage } from "../auth/formErrors";
import { safeNext } from "../auth/guards";
import { MIN_PASSWORD_LENGTH, validateRegister, type FieldErrors } from "../auth/validation";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // El error del campo se quita al editarlo; las alertas generales se mantienen hasta el
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
    setEmailTaken(false);

    const local = validateRegister(name, email, password, confirm);
    setErrors(local);
    if (Object.keys(local).length) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") {
        setErrors({ email: "Ya existe una cuenta con este email." });
        setEmailTaken(true);
        focusFirstInvalid(formRef.current);
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

  const loginLink = params.has("next") ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Acorta enlaces y mide cuántas visitas reciben."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to={loginLink}>Inicia sesión</Link>
        </>
      }
    >
      {formError && <Alert>{formError}</Alert>}
      {emailTaken && (
        <Alert>
          Ese email ya está registrado. <Link to={loginLink}>¿Quieres iniciar sesión?</Link>
        </Alert>
      )}
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <FormField
          label="Nombre"
          name="name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={edit("name", setName)}
          error={errors.name}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={edit("email", setEmail)}
          error={errors.email}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={edit("password", setPassword)}
          error={errors.password}
          hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
        />
        <FormField
          label="Confirmar contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={edit("confirm", setConfirm)}
          error={errors.confirm}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
}
