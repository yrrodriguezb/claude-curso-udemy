// Utilidades compartidas del frontend de Kōhi
const TOKEN_KEY = 'kohi_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Llama a la API y devuelve { ok, status, data }
const api = async (path, { method = 'GET', body, auth = false } = {}) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.' },
    };
  }
};

const showMessage = (el, text, type = 'error') => {
  el.textContent = text;
  el.className = `message is-visible is-${type}`;
};

const hideMessage = (el) => {
  el.className = 'message';
  el.textContent = '';
};

// Lee el "sub" (id del usuario) del payload del JWT
const getUserIdFromToken = () => {
  try {
    const payload = getToken().split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).sub;
  } catch {
    return null;
  }
};
