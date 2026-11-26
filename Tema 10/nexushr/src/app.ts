import { supabase, escapeHtml as h, type Profile } from "./lib/supabase";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-ES");
const fmtMoney = (n: unknown) => "€" + Number(n ?? 0).toLocaleString("es-ES");
const STATUS = new Set(["pending", "approved", "rejected"]);
const ROLES = new Set(["employee", "manager", "admin"]);
const safeClass = (v: string, allowed: Set<string>) => (allowed.has(v) ? v : "unknown");
const ERROR_HTML = '<p class="muted-text">No se pudieron cargar los datos. Inténtalo de nuevo.</p>';

let me: Profile;
let mySalary = 0;

/* ── Auth guard ─────────────────────────────────────────────────────────── */
const goLogin = () => window.location.replace("/index.html");

// Limpia la sesión local (aunque el servidor ya no la reconozca) y vuelve al login.
// Evita el bucle index ↔ dashboard con sesiones locales inválidas.
const forceLogout = async () => {
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  goLogin();
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) goLogin();
});

/** Ejecuta un loader mostrando un mensaje genérico si falla (sin detalles internos). */
const safe = (fn: () => Promise<void>, errorTargetId?: string) => async () => {
  try {
    await fn();
  } catch {
    if (errorTargetId) $(errorTargetId).innerHTML = ERROR_HTML;
  }
};

const boot = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(); // valida el JWT contra Supabase
  if (userError || !user) return forceLogout();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department, hire_date, active")
    .eq("id", user.id)
    .single();

  // Perfil inexistente o inactivo → RLS no devuelve nada → fuera.
  if (error || !profile || !profile.active) return forceLogout();

  me = profile as Profile;
  initUI();
  await safe(loadOverview, "announcementsPreview")();
};

/* ── Init UI ────────────────────────────────────────────────────────────── */
const initUI = () => {
  $("sidebarName").textContent = me.full_name;
  $("sidebarRole").textContent = me.role;
  $("sidebarAvatar").textContent = me.full_name.charAt(0).toUpperCase();
  $("welcomeMsg").textContent = `Hola, ${me.full_name.split(" ")[0]} 👋`;
  $("topbarDate").textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Solo cosmético: la autorización real la aplica RLS en Supabase.
  if (me.role === "admin") {
    $("adminSection").classList.remove("hidden");
    $("adminNav").classList.remove("hidden");
  }

  document.querySelectorAll<HTMLElement>(".nav-item[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.section ?? ""));
  });

  $("empSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") safeSearch(); });
  $("empSearchBtn").addEventListener("click", () => safeSearch());
  $("globalSearch").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    navigateTo("employees");
    $<HTMLInputElement>("empSearch").value = (e.target as HTMLInputElement).value;
    safeSearch();
  });

  $("leaveForm").addEventListener("submit", submitLeave);
  $("calcBtn").addEventListener("click", () => runCalc());
  $("calcFormula").addEventListener("keydown", (e) => { if (e.key === "Enter") runCalc(); });
  document.querySelectorAll<HTMLButtonElement>(".preset-btn[data-formula]").forEach((b) => {
    b.addEventListener("click", () => { $<HTMLInputElement>("calcFormula").value = b.dataset.formula ?? ""; });
  });

  $("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut().catch(() => {});
    goLogin();
  });
};

/* ── Navigation ─────────────────────────────────────────────────────────── */
const sections: Record<string, string> = {
  overview: "Resumen", employees: "Empleados", announcements: "Comunicados",
  leave: "Ausencias", payroll: "Nóminas", admin: "Administración",
};

const navigateTo = (name: string) => {
  if (!Object.hasOwn(sections, name)) return;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.nav-item[data-section="${name}"]`)?.classList.add("active");
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  $(`sec-${name}`)?.classList.add("active");
  $("topbarTitle").textContent = sections[name];
  if (name === "admin") safe(loadAdmin, "adminUsersBody")();
  if (name === "leave") safe(loadLeave, "leaveTableBody")();
  if (name === "payroll") safe(loadPayroll, "payrollTableBody")();
  if (name === "announcements") safe(loadAnnouncementsFull, "announcementsFull")();
};

/* ── Data access ────────────────────────────────────────────────────────── */
type Announcement = { id: number; title: string; body: string; pinned: boolean; created_at: string; profiles: { full_name: string } | null };
type Leave = { id: number; start_date: string; end_date: string; status: string; created_at: string; profiles: { full_name: string; department: string | null } | null };

const fetchAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at, profiles(full_name)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("announcements");
  return (data ?? []) as unknown as Announcement[];
};

const fetchLeave = async () => {
  // RLS decide: empleado → solo las suyas; manager/admin → todas.
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, status, created_at, profiles!leave_requests_user_id_fkey(full_name, department)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("leave");
  return (data ?? []) as unknown as Leave[];
};

const announcementHtml = (a: Announcement, full = false) => `
  <div class="announcement-item">
    <div class="announcement-meta">
      ${a.pinned ? `<span class="pinned-dot"></span>${full ? '<span class="pinned-label">Fijado</span><span>·</span>' : ""}` : ""}
      <span>${h(a.profiles?.full_name ?? "—")}</span>
      <span>·</span>
      <span>${h(full
        ? new Date(a.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
        : fmtDate(a.created_at))}</span>
    </div>
    <div class="announcement-title">${h(a.title)}</div>
    <div class="announcement-body">${h(a.body)}</div>
  </div>`;

const leaveRowHtml = (r: Leave) => `
  <tr>
    <td>${h(r.profiles?.full_name ?? me.full_name)}</td>
    <td class="text-small">${h(r.start_date)} → ${h(r.end_date)}</td>
    <td><span class="badge badge-${safeClass(r.status, STATUS)}">${h(r.status)}</span></td>
  </tr>`;

/* ── Overview ───────────────────────────────────────────────────────────── */
type AdminStats = { total_active: number; departments: number; avg_salary: number | null; pending_leave: number };

const loadOverview = async () => {
  const [announcements, leaveRequests] = await Promise.all([fetchAnnouncements(), fetchLeave()]);

  if (me.role === "admin") {
    // Agregados calculados en la BD: no se descargan los salarios individuales.
    const { data, error } = await supabase.rpc("admin_stats");
    const stats = (error ? null : (data as AdminStats[] | null)?.[0]) ?? null;
    $("statEmployees").textContent = String(stats?.total_active ?? "—");
    $("statSalary").textContent = stats ? fmtMoney(stats.avg_salary) : "—";
    $("statLeave").textContent = String(stats?.pending_leave ?? "—");
    $("statDepts").textContent = String(stats?.departments ?? "—");
  } else {
    $("statsGrid").classList.add("hidden");
  }

  $("announcementsPreview").innerHTML = announcements.slice(0, 3).map((a) => announcementHtml(a)).join("");

  const pending = leaveRequests.filter((r) => r.status === "pending").slice(0, 4);
  const leaveEl = $("leavePreview");
  if (!pending.length) {
    leaveEl.innerHTML = '<p class="muted-text">No hay solicitudes pendientes.</p>';
    return;
  }
  leaveEl.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Empleado</th><th>Período</th><th>Estado</th></tr></thead>
    <tbody>${pending.map(leaveRowHtml).join("")}</tbody></table></div>`;
};

/* ── Employee search ────────────────────────────────────────────────────── */
const runEmpSearch = async () => {
  const q = $<HTMLInputElement>("empSearch").value.trim().slice(0, 100);
  const resultsEl = $("empSearchResults");

  const { data, error } = await supabase.rpc("search_employees", { q });
  if (error) throw new Error("search");

  const results = (data ?? []) as { id: string; full_name: string; email: string | null; department: string | null; role: string }[];
  const rows = results.map((e) => `
    <div class="result-row">
      <div class="result-avatar">${h(e.full_name.charAt(0))}</div>
      <div class="result-info">
        <strong>${h(e.full_name)}</strong>
        <span>${h(e.email ?? "—")}</span>
      </div>
      <span class="badge badge-${safeClass(e.role, ROLES)}">${h(e.role)}</span>
      <span class="dept-tag">${h(e.department ?? "—")}</span>
    </div>`).join("");

  resultsEl.innerHTML = `<div class="card-body"><div class="search-results-container">
    <p class="results-meta">${results.length} resultado(s) para: <em>${h(q)}</em></p>
    <div class="results-list">${rows || '<p class="no-results">Sin resultados</p>'}</div>
  </div></div>`;
};
const safeSearch = safe(runEmpSearch, "empSearchResults");

/* ── Announcements ──────────────────────────────────────────────────────── */
const loadAnnouncementsFull = async () => {
  const data = await fetchAnnouncements();
  $("announcementsFull").innerHTML = data.map((a) => announcementHtml(a, true)).join("");
};

/* ── Leave ──────────────────────────────────────────────────────────────── */
const loadLeave = async () => {
  const data = await fetchLeave();
  $("leaveTableBody").innerHTML = data.map(leaveRowHtml).join("");
};

const submitLeave = async (e: Event) => {
  e.preventDefault();
  const msgEl = $("leaveMsg");
  try {
    // user_id y status los fija la BD (default auth.uid() / 'pending') y RLS lo verifica.
    const { error } = await supabase.from("leave_requests").insert({
      start_date: $<HTMLInputElement>("leaveStart").value,
      end_date: $<HTMLInputElement>("leaveEnd").value,
      reason: $<HTMLTextAreaElement>("leaveReason").value.slice(0, 500),
    });
    if (error) throw new Error("insert");
    msgEl.innerHTML = '<div class="alert alert-success">Solicitud enviada correctamente.</div>';
    (e.target as HTMLFormElement).reset();
    await safe(loadLeave, "leaveTableBody")();
  } catch {
    msgEl.innerHTML = '<div class="alert alert-error">No se pudo enviar la solicitud. Revisa las fechas.</div>';
  }
};

/* ── Payroll ────────────────────────────────────────────────────────────── */
const loadPayroll = async () => {
  // RLS: empleado → solo su fila; admin → todas. ssn/bank_account no son legibles por columna.
  const { data, error } = await supabase
    .from("employee_private")
    .select("id, salary, profiles(full_name, department)");
  if (error) throw new Error("payroll");
  const rows = (data ?? []) as unknown as { id: string; salary: number | null; profiles: { full_name: string; department: string | null } | null }[];
  mySalary = Number(rows.find((r) => r.id === me.id)?.salary ?? 0);
  $("payrollTableBody").innerHTML = rows
    .sort((a, b) => (a.profiles?.department ?? "").localeCompare(b.profiles?.department ?? ""))
    .map((r) => `
    <tr>
      <td>${h(r.profiles?.full_name ?? "—")}</td>
      <td>${h(r.profiles?.department ?? "—")}</td>
      <td class="mono-sm">${h(fmtMoney(r.salary))}</td>
    </tr>`).join("");
};

/**
 * Evaluador aritmético seguro (sin eval): números, `salary`, + - * / y paréntesis.
 * Gramática: expr = term (('+'|'-') term)* ; term = factor (('*'|'/') factor)* ;
 *            factor = ('-'|'+') factor | number | 'salary' | '(' expr ')'
 */
const evaluateFormula = (src: string, vars: { salary: number }): number => {
  if (src.length > 200) throw new Error("Fórmula demasiado larga.");
  const tokens = src.match(/\d+(?:\.\d+)?|salary|[+\-*/()]|\S/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  const factor = (): number => {
    const t = next();
    if (t === "-") return -factor();
    if (t === "+") return factor();
    if (t === "(") {
      const v = expr();
      if (next() !== ")") throw new Error("Falta ')'.");
      return v;
    }
    if (t === "salary") return vars.salary;
    if (t !== undefined && /^\d+(?:\.\d+)?$/.test(t)) return Number(t);
    throw new Error("Token no válido.");
  };
  const term = (): number => {
    let v = factor();
    while (peek() === "*" || peek() === "/") v = next() === "*" ? v * factor() : v / factor();
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") v = next() === "+" ? v + term() : v - term();
    return v;
  };

  const result = expr();
  if (i !== tokens.length || !Number.isFinite(result)) throw new Error("Expresión no válida.");
  return result;
};

const runCalc = async () => {
  const formula = $<HTMLInputElement>("calcFormula").value.trim();
  if (!formula) return;
  const errEl = $("calcError");
  $("calcExpr").textContent = formula;
  $("calcResult").textContent = "";
  errEl.textContent = "";
  errEl.classList.add("hidden");

  try {
    if (/salary/.test(formula) && !mySalary) await loadPayroll();
    const result = evaluateFormula(formula, { salary: mySalary });
    $("calcResult").textContent = "€ " + result.toLocaleString("es-ES", { minimumFractionDigits: 2 });
  } catch {
    errEl.textContent = "Fórmula no válida. Revisa la sintaxis.";
    errEl.classList.remove("hidden");
  }
};

/* ── Admin ──────────────────────────────────────────────────────────────── */
type AdminUser = {
  id: string; full_name: string; email: string | null; role: string; department: string | null;
  active: boolean; salary: number | null; ssn_masked: string | null; bank_account_masked: string | null;
};

const loadAdmin = async () => {
  if (me.role !== "admin") return;
  // NSS e IBAN llegan ya enmascarados desde la BD (nunca en claro al navegador).
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw new Error("admin");
  const users = (data ?? []) as AdminUser[];

  $("adminUsersBody").innerHTML = users.map((u) => `
    <tr>
      <td class="mono-xs">${h(u.id.slice(0, 8))}</td>
      <td>${h(u.full_name)}</td>
      <td>${h(u.email ?? "—")}</td>
      <td><span class="badge badge-${safeClass(u.role, ROLES)}">${h(u.role)}</span></td>
      <td>${h(u.department ?? "—")}</td>
      <td class="mono-sm">${h(fmtMoney(u.salary))}</td>
      <td class="mono-xs">${h(u.ssn_masked ?? "—")}</td>
      <td class="mono-xs">${h(u.bank_account_masked ?? "—")}</td>
    </tr>`).join("");
};

/* ── Boot ───────────────────────────────────────────────────────────────── */
boot().catch(() => forceLogout());
