/* GestEvent — Prototipo web (Fase 5). Sin backend; estado en memoria. */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const main = $("#main");

/* ---------- Estado ---------- */
const S = {
  role: null,
  user: null,
  theme: { mode: "light", primary: "indigo", custom: null, accent: "ambar", font: "sans", scale: 100, radius: 12 },
  perms: JSON.parse(JSON.stringify(DEFAULT_PERMS)),
  cfg: {
    sysName: "GestEvent", logo: null, tz: "America/Bogota", lang: "es-CO", dateFmt: "corta",
    holdMin: 10, lowPct: 10, minPass: 8, sessionMin: 30, sender: "no-responder@gestevent.test",
    maintenance: false, confirmMsg: "Su inscripción fue registrada. Presente el código del ticket en la entrada."
  },
  events: JSON.parse(JSON.stringify(EVENTS)),
  venues: JSON.parse(JSON.stringify(VENUES)),
  users: JSON.parse(JSON.stringify(USERS)),
  regs: [
    { id: 1, ev: 1, st: "CONFIRMED", code: "GE-0001-A7K2", d: "2027-01-04" },
    { id: 2, ev: 3, st: "CANCELLED", code: "GE-0003-Q9M1", d: "2027-01-09" }
  ],
  roster: {},
  hold: null,
  q: { name: "", date: "", cat: "" },
  loaded: false,
  userTab: "users",
  last: null
};
const USERS_BY_ROLE = {
  ATTENDEE: { n: "Alba Asistente", e: "alba@correo.test", label: "Asistente" },
  ORGANIZER: { n: "Oscar Organizador", e: "organizador@gestevent.test", label: "Organizador" },
  ADMINISTRATOR: { n: "Ana Admin", e: "admin@gestevent.test", label: "Administrador" }
};
let timerId = null;

/* ---------- Utilidades ---------- */
const avail = (e) => e.cap - e.taken - (e.held || 0);
const venue = (id) => S.venues.find((v) => v.id === +id) || { name: "—", capacity: 0, address: "" };
const evById = (id) => S.events.find((e) => e.id === +id);
const can = (p) => !!S.role && S.perms[S.role].includes(p);
const initials = (t) => t.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "EV";
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (S.cfg.dateFmt === "dmy") return `${d}/${m}/${y}`;
  if (S.cfg.dateFmt === "ymd") return iso;
  return new Date(`${iso}T12:00:00`).toLocaleDateString(S.cfg.lang, { day: "numeric", month: "short", year: "numeric" });
}
function toast(msg, kind = "ok") {
  const t = document.createElement("div");
  t.className = "t";
  t.innerHTML = `${ico(kind === "ok" ? "check" : "alert")}<span>${esc(msg)}</span>`;
  $("#toast").appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function confirmDlg(title, msg, okLabel, cb) {
  const d = $("#dlg");
  d.innerHTML = `<h2>${esc(title)}</h2><p>${esc(msg)}</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="no">Volver</button><button class="btn danger" id="dlgOk">${esc(okLabel)}</button></div>`;
  d.showModal();
  $("button[value=no]", d).onclick = () => d.close();
  $("#dlgOk", d).onclick = () => { d.close(); cb(); };
}
const go = (h) => { location.hash = h; };
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const bestOn = (bg) => (ratio(bg, "#FFFFFF") >= ratio(bg, "#1B1F3B") ? "#FFFFFF" : "#1B1F3B");
const field = (id, label, input, hint = "") => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<div class="hint" id="${id}-h">${hint}</div>` : ""}<div id="${id}-e" aria-live="polite"></div></div>`;
function setErr(id, msg) {
  const el = $("#" + id), box = $("#" + id + "-e");
  if (!el || !box) return;
  if (msg) { el.classList.add("invalid"); el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", id + "-e"); box.innerHTML = `<div class="errmsg">${ico("alert")}<span>${esc(msg)}</span></div>`; }
  else { el.classList.remove("invalid"); el.removeAttribute("aria-invalid"); box.innerHTML = ""; }
}
function vopts(sel) { return S.venues.map((v) => `<option value="${v.id}" ${+sel === v.id ? "selected" : ""}>${esc(v.name)} (aforo ${v.capacity.toLocaleString(S.cfg.lang)})</option>`).join(""); }

/* ---------- Tema (Administración > Apariencia) ---------- */
function applyTheme() {
  const t = S.theme, root = document.documentElement;
  const dark = t.mode === "dark" || (t.mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme", dark ? "dark" : "light");
  const p = t.custom || (dark ? PRIMARIES[t.primary].d : PRIMARIES[t.primary].l);
  root.style.setProperty("--primary", p);
  root.style.setProperty("--on-primary", bestOn(p));
  const a = ACCENTS[t.accent].c;
  root.style.setProperty("--accent", a);
  root.style.setProperty("--on-accent", bestOn(a));
  root.style.setProperty("--font", FONTS[t.font].v);
  root.style.setProperty("--radius", t.radius + "px");
  root.style.setProperty("--fs", (16 * t.scale / 100) + "px");
  $("#brandName").textContent = S.cfg.sysName;
  $("#brandLogo").innerHTML = S.cfg.logo ? `<img src="${S.cfg.logo}" alt="">` : esc(S.cfg.sysName.slice(0, 1).toUpperCase());
}

/* ---------- Piezas visuales ---------- */
function art(e, cls = "") {
  const c = CATS[e.cat];
  const bg = e.banner ? `background-image:url('${e.banner}')` : `background-image:linear-gradient(135deg,${c.grad[0]},${c.grad[1]})`;
  const chip = e.logo ? `<span class="chip"><img src="${e.logo}" alt="Logo de ${esc(e.title)}"></span>` : `<span class="chip" aria-hidden="true">${esc(initials(e.title))}</span>`;
  const glyph = e.banner ? "" : `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[c.icon]}"/></svg>`;
  return `<div class="art ${cls}" style="${bg}" role="img" aria-label="Imagen del evento ${esc(e.title)}">${glyph}${chip}</div>`;
}
function badgeOf(m) { return `<span class="badge ${m.c}">${ico(m.i)}${m.t}</span>`; }
function evBadges(e) {
  let b = `<span class="badge">${ico(CATS[e.cat].icon)}${CATS[e.cat].label}</span>`;
  if (e.status !== "PUBLISHED") b += badgeOf(EV_STATUS[e.status]);
  else if (avail(e) <= 0) b += `<span class="badge b-err">${ico("alert")}Agotado</span>`;
  else if (avail(e) <= e.cap * S.cfg.lowPct / 100) b += `<span class="badge b-warn">${ico("alert")}Pocos cupos</span>`;
  return b;
}
function occ(e) {
  const pct = Math.min(100, Math.round((e.taken + (e.held || 0)) / e.cap * 100));
  return `<div class="cap"><div class="bar ${pct >= 100 ? "full" : ""}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Ocupación"><span style="width:${pct}%"></span></div>
    <div class="small muted">${avail(e) > 0 ? `${avail(e).toLocaleString(S.cfg.lang)} cupos disponibles de ${e.cap.toLocaleString(S.cfg.lang)}` : "Sin cupos disponibles"}</div></div>`;
}
function head(title, sub = "", actions = "") { return `<div class="pagehead"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="row full">${actions}</div></div>`; }
function crumbs(...p) { return `<nav class="crumbs" aria-label="Ruta de navegación">${p.map((x, i) => (i < p.length - 1 ? x + " / " : `<span aria-current="page">${x}</span>`)).join("")}</nav>`; }
function upload(id, label, accept = "image/png,image/jpeg,image/svg+xml,image/webp") {
  return `<div class="drop"><input id="${id}" type="file" accept="${accept}" class="sr"><label for="${id}" class="btn sec sm" style="display:inline-flex">${ico("upload")}${label}</label>
    <div class="hint">PNG, JPG, SVG o WebP · máximo 2 MB</div><div id="${id}-e" aria-live="polite"></div></div>`;
}
function readImg(inputId, cb) {
  const inp = $("#" + inputId); if (!inp) return;
  inp.addEventListener("change", () => {
    const f = inp.files[0]; if (!f) return;
    const box = $("#" + inputId + "-e");
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { box.innerHTML = `<div class="errmsg">${ico("alert")}<span>Formato no permitido. Use PNG, JPG, SVG o WebP.</span></div>`; return; }
    if (f.size > 2 * 1024 * 1024) { box.innerHTML = `<div class="errmsg">${ico("alert")}<span>El archivo supera 2 MB. Reduzca su tamaño e intente de nuevo.</span></div>`; return; }
    const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f);
  });
}

/* ---------- Navegación ---------- */
const NAV = {
  ATTENDEE: [
    { r: "catalogo", l: "Eventos", i: "calendar", p: "catalogo" },
    { r: "mis-inscripciones", l: "Mis inscripciones", i: "ticket", p: "inscribirse" },
    { r: "perfil", l: "Mi cuenta", i: "user" }
  ],
  ORGANIZER: [
    { r: "org-panel", l: "Panel", i: "home", p: "ver_participantes" },
    { r: "org-eventos", l: "Mis eventos", i: "calendar", p: "crear_evento" },
    { r: "participantes", l: "Participantes", i: "users", p: "ver_participantes" },
    { r: "catalogo", l: "Catálogo público", i: "search", p: "catalogo" },
    { r: "perfil", l: "Mi cuenta", i: "user" }
  ],
  ADMINISTRATOR: [
    { r: "adm-panel", l: "Panel", i: "home" },
    { r: "adm-usuarios", l: "Usuarios", i: "users", p: "gestionar_usuarios" },
    { r: "adm-lugares", l: "Lugares", i: "pin", p: "gestionar_lugares" },
    { r: "adm-eventos", l: "Eventos", i: "calendar", p: "catalogo" },
    { r: "adm-inscripciones", l: "Inscripciones", i: "ticket", p: "gestionar_insc" },
    { r: "adm-reportes", l: "Reportes", i: "chart", p: "reportes" },
    { g: "Administración" },
    { r: "ad-apariencia", l: "Apariencia", i: "palette", p: "administracion" },
    { r: "ad-logos", l: "Logos y banners", i: "image", p: "administracion" },
    { r: "ad-sistema", l: "Configuración", i: "sliders", p: "administracion" },
    { r: "ad-permisos", l: "Permisos", i: "shield", p: "administracion" },
    { g: "Cuenta" },
    { r: "perfil", l: "Mi cuenta", i: "user" }
  ]
};
const ROUTE_PERM = {
  catalogo: "catalogo", evento: "catalogo", reserva: "inscribirse", confirmacion: "inscribirse", "mis-inscripciones": "inscribirse",
  "org-panel": "ver_participantes", "org-eventos": "crear_evento", "org-form": "crear_evento", participantes: "ver_participantes",
  "adm-usuarios": "gestionar_usuarios", "adm-lugares": "gestionar_lugares", "adm-eventos": "catalogo", "adm-inscripciones": "gestionar_insc", "adm-reportes": "reportes",
  "ad-apariencia": "administracion", "ad-logos": "administracion", "ad-sistema": "administracion", "ad-permisos": "administracion"
};
const HOME = { ATTENDEE: "catalogo", ORGANIZER: "org-panel", ADMINISTRATOR: "adm-panel" };

function renderNav(cur) {
  const items = (NAV[S.role] || []).filter((n) => n.g || !n.p || can(n.p));
  $("#nav").innerHTML = items.map((n) => n.g
    ? `<h2 class="grp">${n.g}</h2>`
    : `<a class="nav" href="#/${n.r}" ${n.r === cur ? 'aria-current="page"' : ""}>${ico(n.i)}<span>${n.l}</span></a>`).join("");
}
function setShell() {
  const auth = !!S.role;
  document.body.classList.toggle("noauth", !auth);
  document.body.classList.remove("nav-open");
  $("#menuBtn").innerHTML = ico("menu"); $("#menuBtn").setAttribute("aria-expanded", "false");
  $("#logoutBtn").innerHTML = `${ico("logout")}<span class="sr">Cerrar sesión</span>`;
  if (auth) {
    $("#roleBadge").innerHTML = `${ico("shield")}${USERS_BY_ROLE[S.role].label}`;
    $("#acctBtn").innerHTML = `${ico("user")}<span>${esc(S.user.n)}</span>`;
  }
}

/* ---------- Router ---------- */
function route() {
  clearInterval(timerId);
  const raw = (location.hash || "#/").replace(/^#\//, "");
  let [name, arg] = raw.split("/");
  if (!name || name === "inicio") name = S.role ? HOME[S.role] : "login";
  const open = ["login", "registro", "recuperar"];
  if (!S.role && !open.includes(name)) name = "login";
  if (S.role && open.includes(name)) name = HOME[S.role];
  setShell(); applyTheme();
  const need = ROUTE_PERM[name];
  let html;
  if (need && !can(need)) html = V.denied(name);
  else html = (V[name] || V.denied)(arg);
  main.innerHTML = html;
  if (S.role) renderNav(name);
  document.title = (S.cfg.sysName) + " — " + (name.replace(/-/g, " "));
  window.scrollTo(0, 0);
  if (!open.includes(name)) main.focus({ preventScroll: true });
  (A[name] || (() => {}))(arg);
}

/* ---------- Vistas ---------- */
const V = {};
const A = {};

V.denied = () => `${crumbs("Inicio", "Acceso restringido")}<div class="card"><div class="alert warn">${ico("lock")}<div><strong>No tiene permiso para ver esta sección.</strong><br>Su rol no incluye este permiso. Un administrador puede cambiarlo en Administración › Permisos.</div></div><a class="btn" href="#/inicio">Volver al inicio</a></div>`;

/* --- Acceso --- */
V.login = () => `<div class="authwrap"><div class="card authcard">
  <h1>Iniciar sesión</h1><p class="muted">Ingrese con su correo y contraseña.</p>
  <form id="fLogin" novalidate>
    ${field("lg-mail", "Correo electrónico", '<input id="lg-mail" type="email" autocomplete="email" placeholder="nombre@correo.com">')}
    ${field("lg-pass", "Contraseña", '<input id="lg-pass" type="password" autocomplete="current-password">')}
    <div class="row between"><label class="checkline"><input type="checkbox" id="lg-show"> Mostrar contraseña</label><a href="#/recuperar">¿Olvidó su contraseña?</a></div>
    <button class="btn block" type="submit" style="margin-top:16px">Iniciar sesión</button>
  </form>
  <p class="small" style="margin-top:16px">¿Es asistente y no tiene cuenta? <a href="#/registro">Crear cuenta</a></p>
  <div class="demo"><p class="small muted"><strong>Demostración del prototipo:</strong> entre directamente con un rol.</p>
    <div class="grid g3">${ROLES.map(([k, l]) => `<button class="btn sec sm" data-role="${k}">${l}</button>`).join("")}</div></div>
</div></div>`;
A.login = () => {
  $("#lg-show").onchange = (e) => { $("#lg-pass").type = e.target.checked ? "text" : "password"; };
  $("#fLogin").onsubmit = (ev) => {
    ev.preventDefault();
    const m = $("#lg-mail").value.trim(), p = $("#lg-pass").value;
    setErr("lg-mail", !m ? "Ingrese su correo electrónico." : !/^\S+@\S+\.\S+$/.test(m) ? "El correo no tiene un formato válido. Ejemplo: nombre@correo.com." : "");
    setErr("lg-pass", !p ? "Ingrese su contraseña." : p.length < 6 ? "Credenciales incorrectas. Verifique su correo y contraseña." : "");
    if (m && p.length >= 6 && /^\S+@\S+\.\S+$/.test(m)) enter(/^admin/.test(m) ? "ADMINISTRATOR" : /^org/.test(m) ? "ORGANIZER" : "ATTENDEE");
  };
  $$("[data-role]").forEach((b) => (b.onclick = () => enter(b.dataset.role)));
};
function enter(role) { S.role = role; S.user = USERS_BY_ROLE[role]; S.loaded = false; go("#/inicio"); route(); toast("Sesión iniciada como " + USERS_BY_ROLE[role].label); }

V.registro = () => `<div class="authwrap"><div class="card authcard"><h1>Crear cuenta de asistente</h1>
  <p class="muted">Con su cuenta podrá inscribirse en eventos y consultar su ticket.</p>
  <form id="fReg" novalidate>
    ${field("rg-n", "Nombre completo", '<input id="rg-n" type="text" autocomplete="name">')}
    ${field("rg-m", "Correo electrónico", '<input id="rg-m" type="email" autocomplete="email">')}
    ${field("rg-p", "Contraseña", '<input id="rg-p" type="password" autocomplete="new-password">', `Mínimo ${S.cfg.minPass} caracteres.`)}
    <label class="checkline"><input type="checkbox" id="rg-t"> Acepto el tratamiento de mis datos personales</label><div id="rg-t-e" aria-live="polite"></div>
    <button class="btn block" style="margin-top:16px" type="submit">Crear cuenta</button>
  </form><p class="small" style="margin-top:16px"><a href="#/login">Volver a iniciar sesión</a></p></div></div>`;
A.registro = () => {
  $("#fReg").onsubmit = (ev) => {
    ev.preventDefault();
    const n = $("#rg-n").value.trim(), m = $("#rg-m").value.trim(), p = $("#rg-p").value, t = $("#rg-t").checked;
    setErr("rg-n", n.length < 3 ? "Ingrese su nombre completo." : "");
    setErr("rg-m", !/^\S+@\S+\.\S+$/.test(m) ? "Ingrese un correo válido." : S.users.some((u) => u.e === m) ? "Este correo ya está registrado. Inicie sesión o recupere su contraseña." : "");
    setErr("rg-p", p.length < S.cfg.minPass ? `La contraseña debe tener al menos ${S.cfg.minPass} caracteres.` : "");
    $("#rg-t-e").innerHTML = t ? "" : `<div class="errmsg">${ico("alert")}<span>Debe aceptar el tratamiento de datos para continuar.</span></div>`;
    if (n.length >= 3 && /^\S+@\S+\.\S+$/.test(m) && p.length >= S.cfg.minPass && t) { toast("Cuenta creada. Ya puede iniciar sesión."); go("#/login"); }
  };
};

V.recuperar = () => `<div class="authwrap"><div class="card authcard"><h1>Recuperar contraseña</h1>
  <p class="muted">Le enviaremos un enlace para crear una contraseña nueva.</p>
  <form id="fRec" novalidate>${field("rc-m", "Correo electrónico", '<input id="rc-m" type="email" autocomplete="email">')}
  <button class="btn block" type="submit">Enviar enlace</button></form><div id="rc-ok" aria-live="polite"></div>
  <p class="small" style="margin-top:16px"><a href="#/login">Volver a iniciar sesión</a></p></div></div>`;
A.recuperar = () => {
  $("#fRec").onsubmit = (ev) => {
    ev.preventDefault();
    const m = $("#rc-m").value.trim();
    setErr("rc-m", /^\S+@\S+\.\S+$/.test(m) ? "" : "Ingrese un correo válido.");
    $("#rc-ok").innerHTML = /^\S+@\S+\.\S+$/.test(m) ? `<div class="alert ok" style="margin-top:16px">${ico("check")}<span>Si el correo está registrado, recibirá el enlace en unos minutos. El enlace vence en 30 minutos.</span></div>` : "";
  };
};

/* --- Asistente --- */
function cards(list) {
  if (!list.length) return `<div class="card"><div class="alert info">${ico("info")}<span>No se encontraron eventos con esos criterios. Pruebe con otro nombre o fecha.</span></div><button class="btn sec" id="clearQ">Limpiar búsqueda</button></div>`;
  return `<div class="events">${list.map((e) => `<article class="ev" aria-labelledby="t${e.id}">${art(e)}
    <div class="body"><div class="row" style="gap:8px">${evBadges(e)}</div><h3 id="t${e.id}">${esc(e.title)}</h3>
      <p class="muted" style="margin:0">${esc(e.desc)}</p>
      <div class="meta"><span>${ico("calendar")}${fmtDate(e.date)} · ${e.time}</span><span>${ico("pin")}${esc(venue(e.venue).name)}</span></div>
      <div class="foot">${occ(e)}<a class="btn" href="#/evento/${e.id}">Ver detalle</a></div></div></article>`).join("")}</div>`;
}
function filtered(all = false) {
  const q = S.q;
  return S.events.filter((e) => (all || e.status !== "DRAFT") && (!q.name || e.title.toLowerCase().includes(q.name.toLowerCase())) && (!q.date || e.date === q.date) && (!q.cat || e.cat === q.cat));
}
function searchForm() {
  return `<form id="fQ" class="card row" role="search" style="align-items:flex-end;margin-bottom:16px">
    <div class="field" style="flex:2;min-width:200px;margin:0"><label for="q-n">Buscar por nombre</label><input id="q-n" type="text" value="${esc(S.q.name)}" placeholder="Ej.: jazz"></div>
    <div class="field" style="flex:1;min-width:160px;margin:0"><label for="q-d">Fecha</label><input id="q-d" type="date" value="${S.q.date}"></div>
    <div class="field" style="flex:1;min-width:160px;margin:0"><label for="q-c">Tipo</label><select id="q-c"><option value="">Todos</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${S.q.cat === k ? "selected" : ""}>${c.label}</option>`).join("")}</select></div>
    <button class="btn" type="submit">${ico("search")}Buscar</button></form>`;
}
function bindSearch(redraw) {
  $("#fQ").onsubmit = (e) => { e.preventDefault(); S.q = { name: $("#q-n").value.trim(), date: $("#q-d").value, cat: $("#q-c").value }; redraw(); };
}
V.catalogo = () => `${crumbs("Inicio", "Eventos")}${head("Eventos disponibles", "Encuentre un evento y reserve su cupo.")}${searchForm()}<div id="list">${S.loaded ? cards(filtered()) : `<div class="grid">${[1, 2, 3].map(() => '<div class="skel" style="height:200px" aria-hidden="true"></div>').join("")}</div><p class="sr" role="status">Cargando eventos…</p>`}</div>`;
A.catalogo = () => {
  const draw = () => { $("#list").innerHTML = cards(filtered()); const c = $("#clearQ"); if (c) c.onclick = () => { S.q = { name: "", date: "", cat: "" }; route(); }; };
  bindSearch(draw);
  if (!S.loaded) setTimeout(() => { S.loaded = true; if ($("#list")) draw(); }, 600); else draw();
};

V.evento = (id) => {
  const e = evById(id); if (!e) return V.denied();
  const mine = S.regs.find((r) => r.ev === e.id && r.st !== "CANCELLED");
  let cta;
  if (e.status === "CANCELLED") cta = `<div class="alert err">${ico("x")}<span>Este evento fue cancelado. No admite nuevas inscripciones.</span></div>`;
  else if (e.status !== "PUBLISHED") cta = `<div class="alert info">${ico("info")}<span>Este evento aún no está publicado.</span></div>`;
  else if (mine) cta = `<div class="alert ok">${ico("check")}<span>Ya está inscrito en este evento. No es posible inscribirse dos veces.</span></div><a class="btn sec" href="#/mis-inscripciones">Ver mi inscripción</a>`;
  else if (avail(e) <= 0) cta = `<div class="alert err">${ico("alert")}<span>El evento alcanzó su capacidad máxima.</span></div><button class="btn" disabled>Reservar cupo</button>`;
  else if (!can("inscribirse")) cta = `<div class="alert info">${ico("info")}<span>Su rol no puede inscribirse. Ingrese como asistente para reservar.</span></div>`;
  else cta = `<button class="btn acc block" id="reserve">${ico("ticket")}Reservar cupo</button><p class="hint">Se bloquea un cupo por ${S.cfg.holdMin} minutos mientras confirma.</p>`;
  return `${crumbs('<a href="#/catalogo">Eventos</a>', esc(e.title))}
  ${art(e, "banner")}
  <div class="grid g2" style="grid-template-columns:2fr 1fr;margin-top:16px;align-items:start">
    <div class="card"><div class="row" style="gap:8px">${evBadges(e)}</div><h1 style="margin-top:8px">${esc(e.title)}</h1><p>${esc(e.desc)}</p>
      <h2>Información</h2>
      <p class="row" style="gap:8px">${ico("calendar")}<span>${fmtDate(e.date)} · ${e.time}</span></p>
      <p class="row" style="gap:8px">${ico("pin")}<span>${esc(venue(e.venue).name)} — ${esc(venue(e.venue).address)}</span></p>
      <p class="row" style="gap:8px">${ico("users")}<span>Organiza: ${esc(e.org)}</span></p></div>
    <div class="card"><h2>Cupos</h2>${occ(e)}<div style="margin-top:16px">${cta}</div></div>
  </div>`;
};
A.evento = (id) => {
  const e = evById(id), b = $("#reserve");
  if (b) b.onclick = () => {
    if (avail(e) <= 0) { toast("El cupo se agotó mientras decidía.", "err"); route(); return; }
    if (S.hold) { const o = evById(S.hold.ev); o.held = Math.max(0, (o.held || 1) - 1); }
    e.held = (e.held || 0) + 1; S.hold = { ev: e.id, end: Date.now() + S.cfg.holdMin * 60000 }; go("#/reserva/" + e.id);
  };
};
const stepper = (n) => `<ol class="stepper" aria-label="Progreso">${["Detalle", "Reserva temporal", "Confirmación"].map((t, i) => `<li class="${i + 1 <= n ? "on" : ""}" ${i + 1 === n ? 'aria-current="step"' : ""}><span>${i + 1}</span>${t}</li>`).join("")}</ol>`;
V.reserva = (id) => {
  const e = evById(id);
  if (!S.hold || S.hold.ev !== e.id) return `${stepper(2)}<div class="card"><div class="alert warn">${ico("clock")}<span>No tiene una reserva activa para este evento.</span></div><a class="btn" href="#/evento/${e.id}">Volver al evento</a></div>`;
  return `${crumbs('<a href="#/catalogo">Eventos</a>', '<a href="#/evento/' + e.id + '">' + esc(e.title) + "</a>", "Reserva")}${stepper(2)}
  <div class="grid g2" style="align-items:start"><div class="card"><h1>Confirme su inscripción</h1>
    <p>${esc(e.title)}<br><span class="muted">${fmtDate(e.date)} · ${e.time} · ${esc(venue(e.venue).name)}</span></p>
    <div class="alert info">${ico("info")}<span>Su cupo está bloqueado. Si el tiempo termina sin confirmar, el cupo se libera automáticamente.</span></div>
    <div class="row full"><button class="btn acc" id="confirm">${ico("check")}Confirmar inscripción</button><button class="btn ghost" id="release">Cancelar reserva</button></div></div>
    <div class="card" style="text-align:center"><div class="lbl">Tiempo restante</div><div class="timer" id="timer" role="timer" aria-live="off">--:--</div>
    <div id="exp" aria-live="assertive"></div></div></div>`;
};
A.reserva = (id) => {
  const e = evById(id); if (!S.hold || S.hold.ev !== e.id) return;
  const tick = () => {
    const left = S.hold.end - Date.now(), t = $("#timer"); if (!t) return;
    if (left <= 0) { clearInterval(timerId); e.held = Math.max(0, (e.held || 1) - 1); S.hold = null; t.textContent = "00:00"; $("#exp").innerHTML = `<div class="alert err" style="margin-top:16px">${ico("clock")}<span>La reserva expiró y el cupo fue liberado.</span></div>`; $("#confirm").disabled = true; return; }
    t.textContent = String(Math.floor(left / 60000)).padStart(2, "0") + ":" + String(Math.floor(left % 60000 / 1000)).padStart(2, "0");
  };
  tick(); timerId = setInterval(tick, 500);
  $("#confirm").onclick = () => {
    e.held = Math.max(0, (e.held || 1) - 1); e.taken++; S.hold = null;
    const code = "GE-" + String(e.id).padStart(4, "0") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    S.regs.unshift({ id: Date.now(), ev: e.id, st: "CONFIRMED", code, d: "2027-01-10" }); S.lastCode = code; S.lastEv = e.id; go("#/confirmacion");
  };
  $("#release").onclick = () => { e.held = Math.max(0, (e.held || 1) - 1); S.hold = null; toast("Reserva cancelada. El cupo quedó disponible."); go("#/evento/" + e.id); };
};
V.confirmacion = () => {
  const e = evById(S.lastEv || 1);
  return `${stepper(3)}<div class="card" style="max-width:640px"><div class="alert ok">${ico("check")}<div><strong>Inscripción realizada correctamente.</strong><br>${esc(S.cfg.confirmMsg)}</div></div>
  <h2>${esc(e.title)}</h2><p class="muted">${fmtDate(e.date)} · ${e.time} · ${esc(venue(e.venue).name)}</p>
  <div class="lbl">Código de su ticket</div><div class="ticket">${esc(S.lastCode || "GE-0001-A7K2")}</div>
  <div class="row full" style="margin-top:16px"><a class="btn" href="#/mis-inscripciones">Ver mis inscripciones</a><a class="btn ghost" href="#/catalogo">Seguir explorando</a></div></div>`;
};
V["mis-inscripciones"] = () => `${crumbs("Inicio", "Mis inscripciones")}${head("Mis inscripciones", "Consulte sus tickets y cancele si no puede asistir.")}
  ${S.regs.length ? `<div class="card tscroll"><table class="rt"><thead><tr><th>Evento</th><th>Fecha</th><th>Estado</th><th>Ticket</th><th>Acciones</th></tr></thead><tbody>
  ${S.regs.map((r) => { const e = evById(r.ev); return `<tr><td data-l="Evento"><strong>${esc(e.title)}</strong></td><td data-l="Fecha">${fmtDate(e.date)}</td><td data-l="Estado">${badgeOf(REG_STATUS[r.st])}</td><td data-l="Ticket"><code>${r.st === "CANCELLED" ? "—" : r.code}</code></td>
  <td class="act">${r.st !== "CANCELLED" && can("cancelar_insc") ? `<button class="btn danger sm" data-cancel="${r.id}">Cancelar inscripción</button>` : '<span class="muted small">Sin acciones</span>'}</td></tr>`; }).join("")}</tbody></table></div>`
    : `<div class="card"><div class="alert info">${ico("info")}<span>Aún no tiene inscripciones.</span></div><a class="btn" href="#/catalogo">Explorar eventos</a></div>`}`;
A["mis-inscripciones"] = () => $$("[data-cancel]").forEach((b) => (b.onclick = () => {
  const r = S.regs.find((x) => x.id === +b.dataset.cancel), e = evById(r.ev);
  confirmDlg("¿Cancelar inscripción?", `Se liberará su cupo en «${e.title}». Esta acción no se puede deshacer.`, "Sí, cancelar", () => { r.st = "CANCELLED"; e.taken = Math.max(0, e.taken - 1); toast("Inscripción cancelada. El cupo quedó disponible."); route(); });
}));

V.perfil = () => `${crumbs("Inicio", "Mi cuenta")}${head("Mi cuenta", "Datos personales, contraseña y preferencias.")}
  <div class="grid g2" style="align-items:start">
  <form class="card" id="fPerfil" novalidate><h2>Datos personales</h2>
    ${field("pf-n", "Nombre completo", `<input id="pf-n" type="text" value="${esc(S.user.n)}">`)}
    ${field("pf-m", "Correo electrónico", `<input id="pf-m" type="email" value="${esc(S.user.e)}">`)}
    <button class="btn" type="submit">Guardar cambios</button></form>
  <form class="card" id="fPass" novalidate><h2>Cambiar contraseña</h2>
    ${field("ps-a", "Contraseña actual", '<input id="ps-a" type="password" autocomplete="current-password">')}
    ${field("ps-n", "Contraseña nueva", '<input id="ps-n" type="password" autocomplete="new-password">', `Mínimo ${S.cfg.minPass} caracteres.`)}
    ${field("ps-c", "Confirmar contraseña nueva", '<input id="ps-c" type="password" autocomplete="new-password">')}
    <button class="btn" type="submit">Actualizar contraseña</button></form>
  <div class="card"><h2>Preferencias de visualización</h2><p class="muted small">Solo afectan a su sesión.</p>
    <div class="seg" role="group" aria-label="Tema">${[["light", "Claro"], ["dark", "Oscuro"], ["system", "Sistema"]].map(([k, l]) => `<button data-mode="${k}" aria-pressed="${S.theme.mode === k}">${l}</button>`).join("")}</div></div>
  <div class="card"><h2>Sesión</h2><p class="muted small">La sesión se cierra tras ${S.cfg.sessionMin} minutos de inactividad.</p><button class="btn ghost" id="outAll">${ico("logout")}Cerrar sesión en todos los dispositivos</button></div></div>`;
A.perfil = () => {
  $("#fPerfil").onsubmit = (e) => { e.preventDefault(); const n = $("#pf-n").value.trim(), m = $("#pf-m").value.trim(); setErr("pf-n", n.length < 3 ? "Ingrese su nombre completo." : ""); setErr("pf-m", /^\S+@\S+\.\S+$/.test(m) ? "" : "Ingrese un correo válido."); if (n.length >= 3 && /^\S+@\S+\.\S+$/.test(m)) { S.user.n = n; S.user.e = m; setShell(); toast("Datos actualizados."); } };
  $("#fPass").onsubmit = (e) => { e.preventDefault(); const a = $("#ps-a").value, n = $("#ps-n").value, c = $("#ps-c").value;
    setErr("ps-a", a ? "" : "Ingrese su contraseña actual."); setErr("ps-n", n.length >= S.cfg.minPass ? "" : `La contraseña nueva debe tener al menos ${S.cfg.minPass} caracteres.`); setErr("ps-c", c === n ? "" : "Las contraseñas no coinciden.");
    if (a && n.length >= S.cfg.minPass && c === n) { toast("Contraseña actualizada."); e.target.reset(); } };
  $$("[data-mode]").forEach((b) => (b.onclick = () => { S.theme.mode = b.dataset.mode; applyTheme(); $$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  $("#outAll").onclick = () => toast("Sesiones cerradas en otros dispositivos.");
};

/* --- Organizador --- */
const myEvents = () => (S.role === "ORGANIZER" ? S.events.filter((e) => e.org === "Producciones Demo") : S.events);
V["org-panel"] = () => { const L = myEvents().filter((e) => e.status === "PUBLISHED"); const tot = L.reduce((a, e) => a + e.taken, 0), pct = Math.round(L.reduce((a, e) => a + e.taken / e.cap, 0) / (L.length || 1) * 100);
  return `${crumbs("Inicio", "Panel")}${head("Panel del organizador", "Ocupación de sus eventos publicados.", `<a class="btn" href="#/org-form">${ico("plus")}Crear evento</a>`)}
  <div class="grid g4 kpis">${[["Eventos publicados", L.length], ["Inscritos totales", tot.toLocaleString(S.cfg.lang)], ["Ocupación promedio", pct + " %"], ["Próximo evento", fmtDate(L.map((e) => e.date).sort()[0])]].map(([a, b]) => `<div class="card kpi"><span class="muted small">${a}</span><span class="n">${b}</span></div>`).join("")}</div>
  <div class="card" style="margin-top:16px"><h2>Ocupación por evento</h2><div class="chartbars">${L.map((e) => { const p = Math.round(e.taken / e.cap * 100); return `<div class="cb"><span>${esc(e.title)}</span><div class="bar ${p >= 100 ? "full" : ""}"><span style="width:${p}%"></span></div><strong>${p} %</strong></div>`; }).join("")}</div></div>`; };

function eventsTable(list, withActions) {
  return `<div class="card tscroll"><table class="rt"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Inscritos</th><th>Estado</th>${withActions ? "<th>Acciones</th>" : ""}</tr></thead><tbody>
  ${list.map((e) => `<tr><td data-l="Evento"><strong>${esc(e.title)}</strong></td><td data-l="Fecha">${fmtDate(e.date)} ${e.time}</td><td data-l="Lugar">${esc(venue(e.venue).name)}</td><td data-l="Inscritos">${e.taken.toLocaleString(S.cfg.lang)} / ${e.cap.toLocaleString(S.cfg.lang)}</td><td data-l="Estado">${badgeOf(EV_STATUS[e.status])}</td>
  ${withActions ? `<td class="act">${can("crear_evento") && e.status !== "CANCELLED" ? `<a class="btn sec sm" href="#/org-form/${e.id}">${ico("edit")}Editar</a>` : ""}${can("cancelar_evento") && e.status !== "CANCELLED" && e.status !== "COMPLETED" ? `<button class="btn danger sm" data-ce="${e.id}">${ico("x")}Cancelar</button>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
V["org-eventos"] = () => `${crumbs("Inicio", "Mis eventos")}${head("Mis eventos", "Cree, modifique o cancele sus eventos.", `<a class="btn" href="#/org-form">${ico("plus")}Crear evento</a>`)}${eventsTable(myEvents(), true)}`;
A["org-eventos"] = () => $$("[data-ce]").forEach((b) => (b.onclick = () => { const e = evById(b.dataset.ce); confirmDlg("¿Cancelar el evento?", `«${e.title}» quedará cancelado y no admitirá nuevas inscripciones. Se avisará a los inscritos.`, "Sí, cancelar evento", () => { e.status = "CANCELLED"; toast("Evento cancelado."); route(); }); }));
V["adm-eventos"] = () => `${crumbs("Inicio", "Eventos")}${head("Todos los eventos", "Supervise la programación y busque por nombre o fecha.")}${searchForm()}<div id="list">${eventsTable(filtered(true), false)}</div>`;
A["adm-eventos"] = () => bindSearch(() => { $("#list").innerHTML = eventsTable(filtered(true), false); });

V["org-form"] = (id) => {
  const e = id ? evById(id) : { title: "", desc: "", cat: "musica", date: "", time: "", venue: S.venues[0].id, cap: "", logo: null, status: "DRAFT" };
  return `${crumbs("Inicio", '<a href="#/org-eventos">Mis eventos</a>', id ? "Editar" : "Crear evento")}${head(id ? "Editar evento" : "Crear evento", "Todos los campos con * son obligatorios.")}
  <form class="card" id="fEv" novalidate><div class="grid g2">
    <div>${field("ev-t", "Nombre del evento *", `<input id="ev-t" type="text" value="${esc(e.title)}">`)}
    ${field("ev-c", "Tipo de evento *", `<select id="ev-c">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${e.cat === k ? "selected" : ""}>${c.label}</option>`).join("")}</select>`)}
    ${field("ev-d", "Descripción", `<textarea id="ev-d">${esc(e.desc)}</textarea>`)}</div>
    <div>${field("ev-f", "Fecha *", `<input id="ev-f" type="date" value="${e.date}">`)}${field("ev-h", "Hora *", `<input id="ev-h" type="time" value="${e.time}">`)}
    ${field("ev-v", "Lugar *", `<select id="ev-v">${vopts(e.venue)}</select>`, "El lugar debe estar registrado antes de asignarlo.")}
    ${field("ev-k", "Capacidad *", `<input id="ev-k" type="number" min="1" value="${e.cap}">`, "Debe ser mayor que cero y no superar el aforo del lugar.")}</div></div>
    <h2>Imagen del evento</h2><div class="grid g2">${upload("ev-logo", "Subir logo")}${upload("ev-ban", "Subir banner")}</div>
    <div class="row full" style="margin-top:24px"><button class="btn acc" type="submit" data-st="PUBLISHED">Publicar evento</button><button class="btn sec" type="submit" data-st="DRAFT">Guardar borrador</button><a class="btn ghost" href="#/org-eventos">Cancelar</a></div></form>`;
};
A["org-form"] = (id) => {
  const e = id ? evById(id) : null; let logo = e && e.logo, ban = e && e.banner, st = "DRAFT";
  readImg("ev-logo", (d) => { logo = d; toast("Logo cargado."); }); readImg("ev-ban", (d) => { ban = d; toast("Banner cargado."); });
  $$("#fEv button[type=submit]").forEach((b) => (b.onclick = () => (st = b.dataset.st)));
  $("#fEv").onsubmit = (ev) => {
    ev.preventDefault();
    const t = $("#ev-t").value.trim(), f = $("#ev-f").value, h = $("#ev-h").value, v = +$("#ev-v").value, k = +$("#ev-k").value, ven = venue(v);
    const clash = S.events.find((x) => x.venue === v && x.date === f && x.time === h && x.status !== "CANCELLED" && (!e || x.id !== e.id));
    setErr("ev-t", t.length < 3 ? "Ingrese el nombre del evento." : ""); setErr("ev-f", f ? "" : "Seleccione la fecha."); setErr("ev-h", h ? "" : "Seleccione la hora.");
    setErr("ev-k", !k || k <= 0 ? "La capacidad debe ser mayor que cero." : k > ven.capacity ? `La capacidad no puede superar el aforo del lugar (${ven.capacity.toLocaleString(S.cfg.lang)}).` : "");
    setErr("ev-v", clash ? `«${ven.name}» ya tiene el evento «${clash.title}» en esa fecha y hora. Elija otro lugar u horario.` : "");
    if (t.length >= 3 && f && h && k > 0 && k <= ven.capacity && !clash) {
      const data = { title: t, cat: $("#ev-c").value, desc: $("#ev-d").value.trim(), date: f, time: h, venue: v, cap: k, logo, banner: ban, status: st };
      if (e) Object.assign(e, data); else S.events.push({ id: Date.now(), taken: 0, org: "Producciones Demo", ...data });
      toast(st === "PUBLISHED" ? "Evento publicado." : "Borrador guardado."); go("#/org-eventos");
    }
  };
};

function roster(id) { return (S.roster[id] = S.roster[id] || JSON.parse(JSON.stringify(PEOPLE))); }
const evSelect = (sel) => `<div class="field" style="max-width:420px"><label for="sel-ev">Evento</label><select id="sel-ev">${S.events.filter((e) => e.status !== "DRAFT").map((e) => `<option value="${e.id}" ${+sel === e.id ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div>`;
V.participantes = () => `${crumbs("Inicio", "Participantes")}${head("Participantes", "Lista de inscritos del evento seleccionado.", `<button class="btn ghost" id="exp">${ico("download")}Exportar lista</button>`)}${evSelect(S.sel || 1)}<div id="pl"></div>`;
A.participantes = () => {
  const draw = () => { const e = evById($("#sel-ev").value); S.sel = e.id; const R = roster(e.id).filter((p) => p.s !== "CANCELLED");
    $("#pl").innerHTML = `<div class="row" style="margin-bottom:12px"><span class="badge b-info">${ico("users")}Inscritos: ${e.taken.toLocaleString(S.cfg.lang)} de ${e.cap.toLocaleString(S.cfg.lang)}</span><span class="muted small">Se muestran ${R.length} de muestra.</span></div>
    <div class="card tscroll"><table class="rt"><thead><tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${R.map((p) => `<tr><td data-l="Nombre">${esc(p.n)}</td><td data-l="Correo">${esc(p.e)}</td><td data-l="Estado">${badgeOf(REG_STATUS[p.s])}</td><td data-l="Fecha">${fmtDate(p.d)}</td></tr>`).join("")}</tbody></table></div>`; };
  $("#sel-ev").onchange = draw; draw(); $("#exp").onclick = () => toast("Exportación simulada en el prototipo.");
};

/* --- Administrador --- */
V["adm-panel"] = () => { const pub = S.events.filter((e) => e.status === "PUBLISHED"); const full = pub.filter((e) => avail(e) <= 0).length;
  return `${crumbs("Inicio", "Panel")}${head("Panel de administración", "Resumen general del sistema.")}
  <div class="grid g4 kpis">${[["Eventos publicados", pub.length], ["Lugares", S.venues.length], ["Usuarios activos", S.users.filter((u) => u.a).length], ["Eventos agotados", full]].map(([a, b]) => `<div class="card kpi"><span class="muted small">${a}</span><span class="n">${b}</span></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:16px"><div class="card"><h2>Accesos rápidos</h2><div class="grid">${[["adm-usuarios", "Registrar usuario u organizador", "users"], ["adm-lugares", "Registrar lugar", "pin"], ["adm-reportes", "Generar reporte", "chart"], ["ad-apariencia", "Personalizar apariencia", "palette"]].filter(([r]) => !ROUTE_PERM[r] || can(ROUTE_PERM[r])).map(([r, l, i]) => `<a class="btn sec" href="#/${r}">${ico(i)}${l}</a>`).join("")}</div></div>
  <div class="card"><h2>Actividad reciente</h2><ul style="padding-left:20px;margin:0"><li>Evento «Feria de Emprendimiento Regional» publicado.</li><li>Lugar «Teatro Municipal» registrado.</li><li>Usuario «rafael@camara.test» desactivado.</li></ul></div></div>`; };

V["adm-usuarios"] = () => { const org = S.userTab === "orgs", L = S.users.filter((u) => (org ? u.r === "ORGANIZER" : true));
  return `${crumbs("Inicio", "Usuarios")}${head("Usuarios y organizadores", "Registre quién puede usar el sistema.")}
  <div class="tabs" role="tablist"><a href="#/adm-usuarios" data-tab="users" ${!org ? 'aria-current="page"' : ""}>Todos los usuarios</a><a href="#/adm-usuarios" data-tab="orgs" ${org ? 'aria-current="page"' : ""}>Organizadores</a></div>
  <div class="grid g2" style="align-items:start"><form class="card" id="fUser" novalidate><h2>${org ? "Registrar organizador" : "Registrar usuario"}</h2>
  ${field("us-n", "Nombre completo *", '<input id="us-n" type="text">')}${field("us-m", "Correo *", '<input id="us-m" type="email">')}
  ${org ? '<input type="hidden" id="us-r" value="ORGANIZER">' : field("us-r", "Rol *", '<select id="us-r"><option value="ORGANIZER">Organizador</option><option value="ADMINISTRATOR">Administrador</option></select>')}
  ${field("us-p", "Contraseña temporal *", '<input id="us-p" type="password" autocomplete="new-password">', `Mínimo ${S.cfg.minPass} caracteres. Se pedirá cambiarla al primer ingreso.`)}
  <button class="btn" type="submit">Registrar</button></form>
  <div class="card tscroll"><table class="rt"><thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${L.map((u) => `<tr><td data-l="Nombre"><strong>${esc(u.n)}</strong><br><span class="muted small">${esc(u.e)}</span></td><td data-l="Rol">${u.r === "ADMINISTRATOR" ? "Administrador" : "Organizador"}</td><td data-l="Estado">${u.a ? `<span class="badge b-ok">${ico("check")}Activo</span>` : `<span class="badge">${ico("x")}Inactivo</span>`}</td><td class="act"><button class="btn ghost sm" data-tg="${u.id}">${u.a ? "Desactivar" : "Activar"}</button></td></tr>`).join("")}</tbody></table></div></div>`; };
A["adm-usuarios"] = () => {
  $$("[data-tab]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.userTab = a.dataset.tab; route(); }));
  $$("[data-tg]").forEach((b) => (b.onclick = () => { const u = S.users.find((x) => x.id === +b.dataset.tg); u.a = !u.a; toast(u.a ? "Usuario activado." : "Usuario desactivado."); route(); }));
  $("#fUser").onsubmit = (e) => { e.preventDefault(); const n = $("#us-n").value.trim(), m = $("#us-m").value.trim(), p = $("#us-p").value, r = $("#us-r").value, dup = S.users.some((u) => u.e.toLowerCase() === m.toLowerCase());
    setErr("us-n", n.length < 3 ? "Ingrese el nombre completo." : ""); setErr("us-m", !/^\S+@\S+\.\S+$/.test(m) ? "Ingrese un correo válido." : dup ? "Ya existe un usuario con este correo. No se permiten duplicados." : ""); setErr("us-p", p.length < S.cfg.minPass ? `La contraseña debe tener al menos ${S.cfg.minPass} caracteres.` : "");
    if (n.length >= 3 && /^\S+@\S+\.\S+$/.test(m) && !dup && p.length >= S.cfg.minPass) { S.users.push({ id: Date.now(), n, e: m, r, a: true }); toast("Registro creado."); route(); } };
};

V["adm-lugares"] = () => `${crumbs("Inicio", "Lugares")}${head("Lugares", "Espacios disponibles para realizar eventos.")}
  <div class="grid g2" style="align-items:start"><form class="card" id="fVen" novalidate><h2>Registrar lugar</h2>
  ${field("vn-n", "Nombre *", '<input id="vn-n" type="text">')}${field("vn-a", "Dirección *", '<input id="vn-a" type="text">')}${field("vn-c", "Aforo *", '<input id="vn-c" type="number" min="1">', "Número máximo de personas.")}<button class="btn" type="submit">Registrar lugar</button></form>
  <div class="card tscroll"><table class="rt"><thead><tr><th>Lugar</th><th>Dirección</th><th>Aforo</th></tr></thead><tbody>${S.venues.map((v) => `<tr><td data-l="Lugar"><strong>${esc(v.name)}</strong></td><td data-l="Dirección">${esc(v.address)}</td><td data-l="Aforo">${v.capacity.toLocaleString(S.cfg.lang)}</td></tr>`).join("")}</tbody></table></div></div>`;
A["adm-lugares"] = () => { $("#fVen").onsubmit = (e) => { e.preventDefault(); const n = $("#vn-n").value.trim(), a = $("#vn-a").value.trim(), c = +$("#vn-c").value;
  setErr("vn-n", n ? "" : "Ingrese el nombre del lugar."); setErr("vn-a", a ? "" : "Ingrese la dirección."); setErr("vn-c", c > 0 ? "" : "El aforo debe ser mayor que cero.");
  if (n && a && c > 0) { S.venues.push({ id: Date.now(), name: n, address: a, capacity: c }); toast("Lugar registrado."); route(); } }; };

V["adm-inscripciones"] = () => `${crumbs("Inicio", "Inscripciones")}${head("Gestionar inscripciones", "Elimine la inscripción de un participante si es necesario.")}${evSelect(S.sel || 1)}<div id="pl"></div>`;
A["adm-inscripciones"] = () => {
  const draw = () => { const e = evById($("#sel-ev").value); S.sel = e.id; const R = roster(e.id);
    $("#pl").innerHTML = `<div class="card tscroll"><table class="rt"><thead><tr><th>Participante</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${R.map((p, i) => `<tr><td data-l="Participante"><strong>${esc(p.n)}</strong><br><span class="muted small">${esc(p.e)}</span></td><td data-l="Estado">${badgeOf(REG_STATUS[p.s])}</td><td class="act"><button class="btn danger sm" data-del="${i}">${ico("trash")}Eliminar inscripción</button></td></tr>`).join("") || `<tr><td>No hay inscripciones.</td></tr>`}</tbody></table></div>`;
    $$("[data-del]").forEach((b) => (b.onclick = () => { const p = R[+b.dataset.del]; confirmDlg("¿Eliminar inscripción?", `Se retirará a ${p.n} del evento y se liberará su cupo.`, "Sí, eliminar", () => { if (p.s !== "CANCELLED") e.taken = Math.max(0, e.taken - 1); R.splice(+b.dataset.del, 1); toast("Inscripción eliminada. Cupo liberado."); draw(); }); })); };
  $("#sel-ev").onchange = draw; draw();
};

V["adm-reportes"] = () => `${crumbs("Inicio", "Reportes")}${head("Reportes", "Información de eventos y participantes para la toma de decisiones.")}
  <form class="card row" id="fRep" style="align-items:flex-end"><div class="field" style="margin:0;min-width:200px"><label for="rp-t">Tipo de reporte</label><select id="rp-t"><option value="ev">Ocupación por evento</option><option value="pa">Participantes por estado</option></select></div>
  <div class="field" style="margin:0"><label for="rp-a">Desde</label><input id="rp-a" type="date" value="2027-01-01"></div><div class="field" style="margin:0"><label for="rp-b">Hasta</label><input id="rp-b" type="date" value="2027-12-31"></div><button class="btn" type="submit">Generar reporte</button></form><div id="rep" style="margin-top:16px"></div>`;
A["adm-reportes"] = () => { $("#fRep").onsubmit = (e) => { e.preventDefault(); const a = $("#rp-a").value, b = $("#rp-b").value;
  if (a && b && a > b) { setErr("rp-b", "La fecha final debe ser posterior a la inicial."); } else { setErr("rp-b", "");
  const L = S.events.filter((x) => x.status === "PUBLISHED" && (!a || x.date >= a) && (!b || x.date <= b));
  $("#rep").innerHTML = L.length ? `<div class="card"><div class="row between"><h2>${$("#rp-t").value === "ev" ? "Ocupación por evento" : "Participantes por estado"}</h2><div class="row"><button class="btn ghost sm" data-x="PDF">${ico("download")}PDF</button><button class="btn ghost sm" data-x="CSV">${ico("download")}CSV</button></div></div>
  <div class="chartbars">${L.map((x) => { const p = Math.round(x.taken / x.cap * 100); return `<div class="cb"><span>${esc(x.title)}</span><div class="bar ${p >= 100 ? "full" : ""}"><span style="width:${p}%"></span></div><strong>${p} %</strong></div>`; }).join("")}</div></div>` : `<div class="alert info">${ico("info")}<span>No hay datos en el rango seleccionado.</span></div>`;
  $$("[data-x]").forEach((x) => (x.onclick = () => toast("Exportación " + x.dataset.x + " simulada.")));} }; };

/* --- Administración: parametrización del entorno --- */
const adTabs = (c) => `<div class="tabs" role="navigation" aria-label="Secciones de Administración">${[["ad-apariencia", "Apariencia"], ["ad-logos", "Logos y banners"], ["ad-sistema", "Configuración"], ["ad-permisos", "Permisos"]].map(([r, l]) => `<a href="#/${r}" ${r === c ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</div>`;
function contrastLine(label, a, b) { const r = ratio(a, b); const ok = r >= 4.5; return `<li class="row" style="gap:8px;margin-bottom:6px"><span class="badge ${ok ? "b-ok" : "b-err"}">${ico(ok ? "check" : "alert")}${r.toFixed(1)}:1 ${ok ? "Cumple AA" : "No cumple AA"}</span><span class="small">${label}</span></li>`; }
V["ad-apariencia"] = () => { const t = S.theme;
  return `${crumbs("Inicio", "Administración", "Apariencia")}${head("Administración", "Parametrice el entorno visual del sistema.")}${adTabs("ad-apariencia")}
  <div class="grid g2" style="align-items:start"><div class="card"><h2>Tema y color</h2>
    <div class="field"><span class="lbl" id="l-mode">Modo</span><div class="seg" role="group" aria-labelledby="l-mode">${[["light", "Claro"], ["dark", "Oscuro"], ["system", "Sistema"]].map(([k, l]) => `<button data-mode="${k}" aria-pressed="${t.mode === k}">${l}</button>`).join("")}</div></div>
    <div class="field"><span class="lbl" id="l-pri">Color principal (30 %)</span><div class="swatches" role="group" aria-labelledby="l-pri">${Object.entries(PRIMARIES).map(([k, p]) => `<button class="sw" data-pri="${k}" style="background:${p.l}" aria-label="${p.n}" aria-pressed="${!t.custom && t.primary === k}">${!t.custom && t.primary === k ? ico("check") : ""}</button>`).join("")}</div></div>
    <div class="field"><span class="lbl" id="l-acc">Color de acento (10 %)</span><div class="swatches" role="group" aria-labelledby="l-acc">${Object.entries(ACCENTS).map(([k, p]) => `<button class="sw" data-acc="${k}" style="background:${p.c};color:#1B1F3B" aria-label="${p.n}" aria-pressed="${t.accent === k}">${t.accent === k ? ico("check") : ""}</button>`).join("")}</div></div>
    ${field("cu", "Color principal personalizado", `<div class="row"><input type="color" id="cu" value="${t.custom || PRIMARIES[t.primary].l}"><button class="btn sec sm" id="cuApply">Aplicar</button><button class="btn ghost sm" id="cuReset">Quitar</button></div>`, "Se rechaza si el texto del botón no alcanza contraste 4.5:1 (WCAG 2.1 AA).")}
    <h2 style="margin-top:24px">Tipografía y forma</h2>
    ${field("fo", "Familia tipográfica", `<select id="fo">${Object.entries(FONTS).map(([k, f]) => `<option value="${k}" ${t.font === k ? "selected" : ""}>${f.n}</option>`).join("")}</select>`)}
    ${field("sc", `Tamaño base: <span id="scv">${t.scale}</span> %`, `<input type="range" id="sc" min="90" max="125" step="5" value="${t.scale}">`)}
    ${field("ra", "Redondeo de esquinas", `<select id="ra">${[[0, "Recto"], [8, "Suave"], [12, "Medio"], [20, "Redondeado"]].map(([v, l]) => `<option value="${v}" ${t.radius === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
    <div class="row full"><button class="btn" id="save">Guardar cambios</button><button class="btn ghost" id="reset">Restablecer valores</button></div></div>
  <div class="stack"><div class="card"><h2>Vista previa</h2><div class="preview"><h3>Festival de Jazz Nocturno</h3><p class="muted">Texto secundario de ejemplo para evaluar legibilidad.</p><div class="row"><button class="btn">Acción principal</button><button class="btn acc">Reservar cupo</button><button class="btn sec">Secundaria</button></div><div class="row" style="margin-top:12px"><span class="badge b-ok">${ico("check")}Publicado</span><span class="badge b-warn">${ico("alert")}Pocos cupos</span><span class="badge b-err">${ico("x")}Cancelado</span></div></div></div>
  <div class="card" id="ct"><h2>Verificación de contraste</h2><ul id="ctl" style="list-style:none;padding:0;margin:0"></ul><p class="hint">Los estados siempre combinan color, icono y texto para no depender solo del color.</p></div></div></div>`; };
A["ad-apariencia"] = () => {
  const ct = () => { const cs = getComputedStyle(document.documentElement), g = (v) => cs.getPropertyValue(v).trim(); $("#ctl").innerHTML = contrastLine("Texto de botón principal", g("--on-primary"), g("--primary")) + contrastLine("Texto de botón de acento", g("--on-accent"), g("--accent")) + contrastLine("Texto principal sobre fondo", g("--text"), g("--bg")) + contrastLine("Texto secundario sobre tarjeta", g("--muted"), g("--surface")); };
  const redo = () => { const y = window.scrollY; route(); window.scrollTo(0, y); };
  $$("[data-mode]").forEach((b) => (b.onclick = () => { S.theme.mode = b.dataset.mode; redo(); }));
  $$("[data-pri]").forEach((b) => (b.onclick = () => { S.theme.primary = b.dataset.pri; S.theme.custom = null; redo(); }));
  $$("[data-acc]").forEach((b) => (b.onclick = () => { S.theme.accent = b.dataset.acc; redo(); }));
  $("#cuApply").onclick = () => { const c = $("#cu").value.toUpperCase(), r = ratio(bestOn(c), c); if (r < 4.5) { setErr("cu", `El contraste del botón sería ${r.toFixed(1)}:1; se requiere al menos 4.5:1. Elija un tono más oscuro o más claro.`); return; } setErr("cu", ""); S.theme.custom = c; redo(); };
  $("#cuReset").onclick = () => { S.theme.custom = null; redo(); };
  $("#fo").onchange = (e) => { S.theme.font = e.target.value; applyTheme(); ct(); };
  $("#sc").oninput = (e) => { S.theme.scale = +e.target.value; $("#scv").textContent = e.target.value; applyTheme(); };
  $("#ra").onchange = (e) => { S.theme.radius = +e.target.value; applyTheme(); };
  $("#save").onclick = () => toast("Apariencia guardada para todos los usuarios.");
  $("#reset").onclick = () => { S.theme = { mode: "light", primary: "indigo", custom: null, accent: "ambar", font: "sans", scale: 100, radius: 12 }; toast("Valores restablecidos."); redo(); };
  ct();
};

V["ad-logos"] = () => `${crumbs("Inicio", "Administración", "Logos y banners")}${head("Administración", "Identidad visual del sistema y de cada evento.")}${adTabs("ad-logos")}
  <div class="card"><h2>Logo del sistema</h2><div class="row"><div class="logo" style="width:64px;height:64px">${S.cfg.logo ? `<img src="${S.cfg.logo}" alt="Logo actual del sistema">` : esc(S.cfg.sysName.slice(0, 1))}</div>${upload("lg-sys", "Subir logo del sistema")}${S.cfg.logo ? '<button class="btn ghost sm" id="lgDel">Quitar logo</button>' : ""}</div></div>
  <div class="card tscroll"><h2>Logo y banner por evento</h2><table class="rt"><thead><tr><th>Evento</th><th>Logo</th><th>Banner</th><th>Texto alternativo</th></tr></thead><tbody>
  ${S.events.map((e) => `<tr><td data-l="Evento"><strong>${esc(e.title)}</strong></td>
  <td data-l="Logo"><div class="row" style="flex-wrap:nowrap"><div class="thumb">${e.logo ? `<img src="${e.logo}" alt="" style="max-width:100%">` : esc(initials(e.title))}</div>${upload("lo" + e.id, "Subir")}</div></td>
  <td data-l="Banner"><div class="row" style="flex-wrap:nowrap"><div class="thumb" style="width:96px">${e.banner ? `<img src="${e.banner}" alt="" style="max-width:100%">` : "—"}</div>${upload("bn" + e.id, "Subir")}</div></td>
  <td data-l="Alt"><label class="sr" for="alt${e.id}">Texto alternativo de ${esc(e.title)}</label><input id="alt${e.id}" type="text" value="Logo de ${esc(e.title)}"></td></tr>`).join("")}</tbody></table>
  <p class="hint">El texto alternativo es obligatorio para lectores de pantalla. Los cambios se reflejan de inmediato en el catálogo.</p></div>`;
A["ad-logos"] = () => {
  readImg("lg-sys", (d) => { S.cfg.logo = d; toast("Logo del sistema actualizado."); route(); });
  const del = $("#lgDel"); if (del) del.onclick = () => { S.cfg.logo = null; route(); };
  S.events.forEach((e) => { readImg("lo" + e.id, (d) => { e.logo = d; toast("Logo del evento actualizado."); route(); }); readImg("bn" + e.id, (d) => { e.banner = d; toast("Banner del evento actualizado."); route(); }); });
};

V["ad-sistema"] = () => { const c = S.cfg;
  return `${crumbs("Inicio", "Administración", "Configuración")}${head("Administración", "Parámetros de funcionamiento del sistema.")}${adTabs("ad-sistema")}
  <form id="fCfg" novalidate><div class="grid g2" style="align-items:start">
  <div class="card"><h2>General</h2>${field("c-n", "Nombre del sistema *", `<input id="c-n" type="text" value="${esc(c.sysName)}">`)}
    ${field("c-tz", "Zona horaria", `<select id="c-tz">${["America/Bogota", "America/Mexico_City", "America/Lima", "UTC"].map((z) => `<option ${c.tz === z ? "selected" : ""}>${z}</option>`).join("")}</select>`)}
    ${field("c-l", "Idioma", `<select id="c-l">${[["es-CO", "Español (Colombia)"], ["es-MX", "Español (México)"], ["en-US", "English (US)"]].map(([k, l]) => `<option value="${k}" ${c.lang === k ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
    ${field("c-f", "Formato de fecha", `<select id="c-f">${[["corta", "20 mar 2027"], ["dmy", "20/03/2027"], ["ymd", "2027-03-20"]].map(([k, l]) => `<option value="${k}" ${c.dateFmt === k ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
    ${field("c-s", "Correo remitente de confirmaciones *", `<input id="c-s" type="email" value="${esc(c.sender)}">`)}</div>
  <div class="card"><h2>Inscripciones</h2>
    ${field("c-h", "Tiempo de reserva temporal (minutos) *", `<input id="c-h" type="number" value="${c.holdMin}">`, "Entre 5 y 30. Pasado este tiempo el cupo se libera.")}
    ${field("c-p", "Aviso de «pocos cupos» (% restante) *", `<input id="c-p" type="number" value="${c.lowPct}">`, "Entre 1 y 50.")}
    <div class="field"><label class="checkline"><input type="checkbox" checked disabled> Una inscripción por asistente y evento</label><div class="hint">Regla fija RN-008; no se puede desactivar.</div></div>
    <div class="field"><label class="checkline"><input type="checkbox" disabled> Permitir superar la capacidad</label><div class="hint">Regla fija RN-007; el sistema nunca admite sobrecupo.</div></div>
    ${field("c-m", "Mensaje de confirmación", `<textarea id="c-m">${esc(c.confirmMsg)}</textarea>`)}</div>
  <div class="card"><h2>Seguridad</h2>
    ${field("c-w", "Longitud mínima de contraseña *", `<input id="c-w" type="number" value="${c.minPass}">`, "Entre 8 y 32.")}
    ${field("c-e", "Cierre de sesión por inactividad (min) *", `<input id="c-e" type="number" value="${c.sessionMin}">`, "Entre 5 y 240.")}
    <label class="checkline"><input type="checkbox" id="c-mt" ${c.maintenance ? "checked" : ""}> Modo mantenimiento (solo administradores)</label></div></div>
  <div class="row full" style="margin-top:16px"><button class="btn" type="submit">Guardar configuración</button><button class="btn ghost" type="button" id="cfgReset">Restablecer valores</button></div></form>`; };
A["ad-sistema"] = () => {
  $("#fCfg").onsubmit = (e) => { e.preventDefault(); const n = $("#c-n").value.trim(), s = $("#c-s").value.trim(), h = +$("#c-h").value, p = +$("#c-p").value, w = +$("#c-w").value, x = +$("#c-e").value;
    const ok = [[!n, "c-n", "Ingrese el nombre del sistema."], [!/^\S+@\S+\.\S+$/.test(s), "c-s", "Ingrese un correo válido."], [!(h >= 5 && h <= 30), "c-h", "Debe estar entre 5 y 30 minutos."], [!(p >= 1 && p <= 50), "c-p", "Debe estar entre 1 y 50 %."], [!(w >= 8 && w <= 32), "c-w", "Debe estar entre 8 y 32 caracteres."], [!(x >= 5 && x <= 240), "c-e", "Debe estar entre 5 y 240 minutos."]];
    ok.forEach(([bad, id, m]) => setErr(id, bad ? m : ""));
    if (ok.every(([bad]) => !bad)) { Object.assign(S.cfg, { sysName: n, sender: s, holdMin: h, lowPct: p, minPass: w, sessionMin: x, tz: $("#c-tz").value, lang: $("#c-l").value, dateFmt: $("#c-f").value, confirmMsg: $("#c-m").value.trim(), maintenance: $("#c-mt").checked }); applyTheme(); toast("Configuración guardada."); } };
  $("#cfgReset").onclick = () => { Object.assign(S.cfg, { sysName: "GestEvent", tz: "America/Bogota", lang: "es-CO", dateFmt: "corta", holdMin: 10, lowPct: 10, minPass: 8, sessionMin: 30, sender: "no-responder@gestevent.test", maintenance: false }); toast("Valores restablecidos."); route(); };
};

V["ad-permisos"] = () => `${crumbs("Inicio", "Administración", "Permisos")}${head("Administración", "Defina qué puede hacer cada rol.")}${adTabs("ad-permisos")}
  <div class="alert info">${ico("info")}<span>Los permisos marcados con candado no se pueden quitar al Administrador para evitar quedar sin acceso. Los cambios se aplican de inmediato.</span></div>
  <div class="card tscroll"><table class="matrix" aria-label="Matriz de permisos por rol"><thead><tr><th scope="col">Permiso</th>${ROLES.map(([, l]) => `<th scope="col">${l}</th>`).join("")}</tr></thead><tbody>
  ${PERMS.map(([k, t, rf]) => `<tr><th scope="row" style="text-transform:none;letter-spacing:0;font-size:1rem;color:var(--text)">${t}<br><span class="muted small">${rf}</span></th>${ROLES.map(([r, l]) => { const lock = (LOCKED[r] || []).includes(k); return `<td><label class="checkline" style="justify-content:center"><input type="checkbox" data-p="${r}|${k}" ${S.perms[r].includes(k) ? "checked" : ""} ${lock ? "disabled" : ""} aria-label="${l}: ${t}">${lock ? ico("lock") : ""}</label></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="hint">Pruebe el efecto: quite «Inscribirse en un evento» al Asistente y vuelva a entrar con ese rol.</p>`;
A["ad-permisos"] = () => $$("[data-p]").forEach((c) => (c.onchange = () => { const [r, k] = c.dataset.p.split("|"), L = S.perms[r], i = L.indexOf(k); if (c.checked && i < 0) L.push(k); if (!c.checked && i >= 0) L.splice(i, 1); toast("Permiso actualizado."); renderNav("ad-permisos"); }));

/* ---------- Arranque ---------- */
$("#menuBtn").onclick = () => { const o = document.body.classList.toggle("nav-open"); $("#menuBtn").setAttribute("aria-expanded", o); $("#menuBtn").innerHTML = ico(o ? "x" : "menu"); };
$("#scrim").onclick = () => { document.body.classList.remove("nav-open"); $("#menuBtn").innerHTML = ico("menu"); $("#menuBtn").setAttribute("aria-expanded", "false"); };
$("#nav").addEventListener("click", (e) => { if (e.target.closest("a")) { document.body.classList.remove("nav-open"); } });
$("#logoutBtn").onclick = () => { S.role = null; S.user = null; S.hold = null; go("#/login"); route(); };
window.addEventListener("hashchange", route);
const q = new URLSearchParams(location.search);
if (q.get("rol") && USERS_BY_ROLE[q.get("rol")]) { S.role = q.get("rol"); S.user = USERS_BY_ROLE[S.role]; S.loaded = true; }
if (q.get("tema")) S.theme.mode = q.get("tema");
route();
