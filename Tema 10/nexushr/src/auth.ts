import { supabase } from "./lib/supabase";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>("loginForm");
const errEl = $("loginError");
const okEl = $("loginInfo");
const btn = $<HTMLButtonElement>("loginBtn");
const nameGroup = $("nameGroup");
const nameInput = $<HTMLInputElement>("fullName");
const toggle = $<HTMLButtonElement>("toggleMode");
const title = $("formTitle");

let mode: "login" | "signup" = "login";

const showError = (msg: string) => {
  errEl.textContent = msg;
  errEl.classList.remove("hidden");
};

const setMode = (next: typeof mode) => {
  mode = next;
  const signup = mode === "signup";
  nameGroup.classList.toggle("hidden", !signup);
  nameInput.required = signup;
  title.textContent = signup ? "Crear cuenta" : "Bienvenido de nuevo";
  btn.textContent = signup ? "Registrarse" : "Iniciar sesión";
  toggle.textContent = signup ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
  $<HTMLInputElement>("password").autocomplete = signup ? "new-password" : "current-password";
  errEl.classList.add("hidden");
  okEl.classList.add("hidden");
};

toggle.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

// Si ya hay sesión válida, ir directo al dashboard.
supabase.auth.onAuthStateChange((event, session) => {
  if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
    window.location.replace("/dashboard.html");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.classList.add("hidden");
  okEl.classList.add("hidden");
  btn.disabled = true;

  const email = $<HTMLInputElement>("email").value.trim();
  const password = $<HTMLInputElement>("password").value;

  try {
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      // Mensaje genérico: no revelar si el email existe.
      if (error) showError("Credenciales incorrectas o cuenta no confirmada.");
      return;
    }

    if (password.length < 12) {
      showError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nameInput.value.trim().slice(0, 120) },
        emailRedirectTo: `${window.location.origin}/index.html`,
      },
    });
    if (error) {
      showError("No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.");
      return;
    }
    if (!data.session) {
      setMode("login");
      okEl.textContent = "Revisa tu correo para confirmar la cuenta.";
      okEl.classList.remove("hidden");
    }
  } catch {
    showError("Error de conexión. Inténtalo de nuevo.");
  } finally {
    btn.disabled = false;
  }
});
