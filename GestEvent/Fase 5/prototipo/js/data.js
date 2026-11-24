/* Datos de demostración e iconos. No hay backend: todo vive en memoria. */
const ICONS = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  ticket: "M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  sliders: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  palette: "M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.4 5.6-5.4C23 6 18 2 12 2z",
  image: "M3 3h18v18H3z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M21 15l-5-5L5 21",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  plus: "M12 5v14 M5 12h14",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  x: "M18 6L6 18 M6 6l12 12",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.35-4.35",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2",
  check: "M20 6L9 17l-5-5",
  alert: "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 16v-4 M12 8h.01",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M3 6h18 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6 M9 6V3h6v3",
  music: "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
};
const ico = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

const CATS = {
  musica: { label: "Música", icon: "music", grad: ["#4338CA", "#DB2777"] },
  feria: { label: "Feria", icon: "users", grad: ["#0F766E", "#65A30D"] },
  teatro: { label: "Teatro", icon: "star", grad: ["#9F1239", "#F59E0B"] },
  conferencia: { label: "Conferencia", icon: "mic", grad: ["#1D4ED8", "#0891B2"] }
};

/* Estados alineados con el esquema SQL de la Fase 4 */
const EV_STATUS = {
  DRAFT: { t: "Borrador", c: "b-info", i: "edit" },
  PUBLISHED: { t: "Publicado", c: "b-ok", i: "check" },
  CANCELLED: { t: "Cancelado", c: "b-err", i: "x" },
  COMPLETED: { t: "Finalizado", c: "", i: "clock" }
};
const REG_STATUS = {
  PENDING: { t: "Reserva pendiente", c: "b-warn", i: "clock" },
  CONFIRMED: { t: "Confirmada", c: "b-ok", i: "check" },
  CANCELLED: { t: "Cancelada", c: "b-err", i: "x" }
};

const VENUES = [
  { id: 1, name: "Auditorio Central", address: "Calle 1 # 2-3", capacity: 500 },
  { id: 2, name: "Estadio Municipal", address: "Avenida 10 # 20-30", capacity: 40000 },
  { id: 3, name: "Centro de Convenciones", address: "Carrera 7 # 40-12", capacity: 1200 },
  { id: 4, name: "Teatro Municipal", address: "Plaza Mayor 5", capacity: 220 }
];

const EVENTS = [
  { id: 1, title: "Festival de Jazz Nocturno", cat: "musica", desc: "Tres bandas en vivo, barra de café y zona de descanso. Puertas abren una hora antes.", date: "2027-03-20", time: "20:00", venue: 1, cap: 500, taken: 412, status: "PUBLISHED", logo: null, org: "Producciones Demo" },
  { id: 2, title: "Concierto de Música Pop en Vivo", cat: "musica", desc: "Gira nacional con repertorio de éxitos. Acceso por localidades numeradas.", date: "2027-05-15", time: "21:00", venue: 2, cap: 40000, taken: 39200, status: "PUBLISHED", logo: null, org: "Producciones Demo" },
  { id: 3, title: "Feria de Emprendimiento Regional", cat: "feria", desc: "Más de 80 stands, charlas cortas y ronda de contactos para emprendedores.", date: "2027-04-02", time: "09:00", venue: 3, cap: 1200, taken: 340, status: "PUBLISHED", logo: null, org: "Cámara Local" },
  { id: 4, title: "La Última Función (teatro)", cat: "teatro", desc: "Obra en dos actos de la compañía municipal. Duración aproximada: 100 minutos.", date: "2027-02-12", time: "19:30", venue: 4, cap: 220, taken: 220, status: "PUBLISHED", logo: null, org: "Compañía Municipal" },
  { id: 5, title: "Jornada de Tecnología e Innovación", cat: "conferencia", desc: "Seis ponencias y un taller práctico. Incluye certificado de asistencia.", date: "2027-06-08", time: "08:00", venue: 1, cap: 500, taken: 120, status: "PUBLISHED", logo: null, org: "Producciones Demo" },
  { id: 6, title: "Noche de Stand-up", cat: "teatro", desc: "Humor en vivo con cuatro invitados.", date: "2027-02-27", time: "20:30", venue: 4, cap: 220, taken: 90, status: "CANCELLED", logo: null, org: "Compañía Municipal" },
  { id: 7, title: "Taller de Fotografía Urbana", cat: "conferencia", desc: "Práctica guiada por el centro histórico. Borrador pendiente de publicar.", date: "2027-07-10", time: "15:00", venue: 3, cap: 40, taken: 0, status: "DRAFT", logo: null, org: "Producciones Demo" }
];

const PEOPLE = [
  { n: "Alba Asistente", e: "alba@correo.test", s: "CONFIRMED", d: "2027-01-04" },
  { n: "Bruno Mendoza", e: "bruno@correo.test", s: "CONFIRMED", d: "2027-01-05" },
  { n: "Camila Ríos", e: "camila@correo.test", s: "PENDING", d: "2027-01-06" },
  { n: "Diego Salazar", e: "diego@correo.test", s: "CONFIRMED", d: "2027-01-06" },
  { n: "Elena Torres", e: "elena@correo.test", s: "CANCELLED", d: "2027-01-07" }
];

const USERS = [
  { id: 1, n: "Ana Admin", e: "admin@gestevent.test", r: "ADMINISTRATOR", a: true },
  { id: 2, n: "Oscar Organizador", e: "organizador@gestevent.test", r: "ORGANIZER", a: true },
  { id: 3, n: "Paula Producciones", e: "paula@produccion.test", r: "ORGANIZER", a: true },
  { id: 4, n: "Rafael Gómez", e: "rafael@camara.test", r: "ORGANIZER", a: false }
];

/* Catálogo de permisos (Administración > Permisos). [clave, texto, requisito] */
const PERMS = [
  ["catalogo", "Consultar y buscar eventos", "RF-007, RF-017"],
  ["inscribirse", "Inscribirse en un evento", "RF-015"],
  ["cancelar_insc", "Cancelar la inscripción propia", "RF-016"],
  ["crear_evento", "Crear y modificar eventos propios", "RF-009, RF-010"],
  ["cancelar_evento", "Cancelar eventos", "RF-011"],
  ["asignar_lugar", "Asignar lugar a un evento", "RF-012"],
  ["ver_participantes", "Consultar participantes e inscritos", "RF-013, RF-014"],
  ["gestionar_usuarios", "Registrar usuarios y organizadores", "RF-002, RF-003"],
  ["gestionar_lugares", "Registrar lugares", "RF-004"],
  ["gestionar_insc", "Eliminar inscripciones de otros", "RF-008"],
  ["reportes", "Generar reportes", "RF-006"],
  ["administracion", "Acceder al módulo Administración", "RF-019 a RF-022"]
];
const ROLES = [["ATTENDEE", "Asistente"], ["ORGANIZER", "Organizador"], ["ADMINISTRATOR", "Administrador"]];
const LOCKED = { ADMINISTRATOR: ["administracion", "gestionar_usuarios"] };

const DEFAULT_PERMS = {
  ATTENDEE: ["catalogo", "inscribirse", "cancelar_insc"],
  ORGANIZER: ["catalogo", "crear_evento", "cancelar_evento", "asignar_lugar", "ver_participantes"],
  ADMINISTRATOR: ["catalogo", "ver_participantes", "gestionar_usuarios", "gestionar_lugares", "gestionar_insc", "reportes", "administracion"]
};

const PRIMARIES = {
  indigo: { n: "Índigo", l: "#3730A3", d: "#A5B4FC" },
  esmeralda: { n: "Esmeralda", l: "#0F6B4F", d: "#6EE7B7" },
  granate: { n: "Granate", l: "#9F1239", d: "#FDA4AF" },
  pizarra: { n: "Pizarra", l: "#334155", d: "#CBD5E1" }
};
const ACCENTS = {
  ambar: { n: "Ámbar", c: "#F5B301" },
  turquesa: { n: "Turquesa", c: "#2EC4B6" },
  coral: { n: "Coral", c: "#FF7A59" },
  lima: { n: "Lima", c: "#A3E635" }
};
const FONTS = {
  sans: { n: "Sans moderna (Inter / sistema)", v: 'Inter, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  humanista: { n: "Humanista (Trebuchet / Verdana)", v: '"Trebuchet MS", Verdana, "Segoe UI", sans-serif' },
  serif: { n: "Serif (Georgia)", v: 'Georgia, "Times New Roman", serif' },
  mono: { n: "Monoespaciada", v: 'ui-monospace, Menlo, Consolas, monospace' }
};
