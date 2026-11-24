# Fase 5 — Mockup / Prototipo web de GestEvent

Prototipo HTML5 + CSS + JavaScript **responsive**, sin backend (datos en memoria). Cubre los tres roles del SRS y el nuevo módulo **Administración**.

- Figma original: ver `../Fase 3/Mockup GestEvent`. El archivo de Figma no pudo editarse desde este entorno; las capturas de `mockups/` y el prototipo están listos para importarse o rehacerse allí.
- Cómo ejecutar: abrir `prototipo/index.html` en el navegador (sin instalar nada). Atajos: `?rol=ATTENDEE`, `?rol=ORGANIZER`, `?rol=ADMINISTRATOR` y `&tema=dark`.

## Estructura
```
Fase 5/
├─ prototipo/ index.html · css/styles.css · js/data.js · js/app.js
└─ mockups/   PNG de cada pantalla en escritorio (1440), tablet (834) y móvil (390)
```

## Respuesta a la evaluación
| Hallazgo | Solución |
|---|---|
| H1 Responsive | Escritorio ≥1024 con menú lateral; <1024 menú de hamburguesa (panel deslizante); <640 una columna y tablas convertidas en tarjetas. Objetivos táctiles ≥44 px. |
| H2 Pantallas faltantes | Mi perfil, Mis inscripciones, cuenta/cambio de contraseña, recuperar contraseña y registro de asistente. |
| H3 Tarjetas | Tarjetas horizontales: imagen a la izquierda; descripción, fecha, lugar, cupos y botón a la derecha. Se apilan en móvil. |
| H4 Paleta | 60 % neutros / 30 % índigo / 10 % ámbar. Contrastes calculados: texto sobre fondo 14.8:1, botón principal 9.9:1, botón de acento 8.7:1, texto secundario 8.0:1 (todos ≥ 4.5:1, WCAG AA). Estados con icono + texto, no solo color. |
| H5 Temas | Claro, oscuro, del sistema y color personalizado, con verificación de contraste. |
| H6 Reserva temporal | Cupo bloqueado con cuenta regresiva (10 min por defecto, configurable 5–30); se libera al vencer o cancelar. Evita sobreventa. |
| H7 Módulos | Lugares, inscripciones (cancelar/eliminar), reportes y navegación distinta por rol. |
| H8 SRS | Conciliado en SRS v1.2, sección 20 (`../Fase 3`). |
| H9 Entrega | Prototipo en `prototipo/` y capturas en `mockups/`. |

## Módulo Administración (solo Administrador)
1. **Apariencia**: modo, color principal y de acento, tipografía, tamaño, redondeo, vista previa y verificador de contraste (RF-019).
2. **Logos y banners**: logo del sistema y logo/banner/texto alternativo por evento (RF-020).
3. **Configuración**: nombre, zona horaria, idioma, formato de fecha, TTL de reserva, umbral de pocos cupos, contraseñas, sesión, mantenimiento (RF-021). RN-007 y RN-008 son reglas fijas.
4. **Permisos**: matriz rol × permiso; el cambio altera de inmediato el menú y el acceso (RF-022).

## Pantallas ↔ requisitos
| Ruta | Rol | Requisitos |
|---|---|---|
| login, registro, recuperar | Todos | RF-001, RF-024 |
| catalogo, evento | Asistente | RF-007, RF-017 |
| reserva, confirmacion | Asistente | RF-015, RF-018, RF-023 |
| mis-inscripciones | Asistente | RF-016 |
| perfil | Todos | RF-024 |
| org-panel, org-eventos, org-form | Organizador | RF-009 a RF-012 |
| participantes | Organizador | RF-013, RF-014 |
| adm-usuarios, adm-lugares | Administrador | RF-002 a RF-004 |
| adm-inscripciones | Administrador | RF-008 |
| adm-reportes | Administrador | RF-006 |
| ad-apariencia, ad-logos, ad-sistema, ad-permisos | Administrador | RF-019 a RF-022 |

## Límites
Es una maqueta: no hay persistencia, correo real ni pasarela de pago (fuera de alcance). En móvil la matriz de permisos y las pestañas se desplazan horizontalmente.
