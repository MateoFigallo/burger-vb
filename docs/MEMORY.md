# MEMORY.md — Memoria Persistente del Proyecto (Burger VB)

## Arquitectura
- **Base:** Next.js 16.4 (App Router) + React 19 + TypeScript (Strict Mode) + Tailwind CSS v4 + shadcn/ui (`@base-ui/react`) + Motion (`motion/react`).
- **Persistencia actual:** Almacenamiento reactivo en navegador mediante `createLocalStore` + `useSyncExternalStore` (`src/lib/local-store.ts`), sin conexión a Supabase en esta etapa por pedido explícito del usuario.
- **Configuración centralizada:** `src/config/business.config.ts` concentra todos los datos estáticos del negocio, módulos del panel, grupos de navegación, teclas de función POS (`F1–F12`), medios de pago, rubros de caja, niveles VIP del Club, constantes operativas de logística, turnos y checklist de cocina (`teamOps`), textos legales base (`webAndLegal`) y categorías de auditoría (`system`). `src/config/site.ts` y `src/config/panel.ts` re-exportan desde `business.config.ts`.
- **Módulos de negocio (`src/features/`):**
  - `commercial`: **Vender POS** (`/dashboard/vender`) y **Gestión de caja y arqueo** (`/dashboard/caja`).
  - `analytics`: **Resumen y centro de análisis** (`/dashboard/resumen`) dividido mediante barra superior (`SectionTabs`) en 4 vistas analíticas.
  - `logistics`: **Logística e inventario** con sus 4 apartados (`inventario`, `mermas`, `presupuestos`, `proveedores`).
  - `customers` & `loyalty`: **Clientes y fidelidad** con Cuenta Corriente / Fiado, Niveles VIP (`Bronce`, `Plata`, `Oro`), Cumpleaños, Monedero digital con Cashback, Gift Cards (`GC-XXXX-XXXX`) y Cupones de descuento (`/dashboard/clientes`, `/dashboard/sellos`, `/dashboard/monedero`, `/dashboard/campanas`).
  - `team`: **Equipo, RRHH y tareas** (`/dashboard/equipo`) dividido en 4 apartados: `Empleados y cuentas`, `Roles y permisos`, `RRHH, fichaje por PIN y adelantos` y `Tareas operativas del día`.
  - `system`: **Menú digital, QR y legales** (`/dashboard/web`) y **Sistema, auditoría y copias** (`/dashboard/sistema`).
  - `menu`, `cart`, `orders`, `store-status`, `campaigns`, `auth`, `account`, `home`, `admin`.

## Decisiones
- **1. Vender POS (`/dashboard/vender`) y atajo global `F1`:**
  - Botón destacado en la parte superior del sidebar con atajo `F1` global desde cualquier pantalla del panel.
  - Barra interactiva `F1–F12`, soporte de **Pago Mixto**, cálculo de vuelto, validación de Gift Cards, descuento de stock automático (incluyendo recetas/combos) y ticket térmico de 80 mm.
- **2. Resumen y análisis (`/dashboard/resumen`) con barra superior divisora:**
  - Dividido en 4 apartados mediante `SectionTabs`: *Pulso de hoy*, *Análisis de ventas y rentabilidad*, *Análisis de stock y costos* y *Análisis de clientes y fidelidad*.
- **3. Operación comercial (`/dashboard` y `/dashboard/caja`):**
  - Tablero guiado del turno en 4 pasos, ingresos/egresos por rubro, `Cortes X`, arqueo transparente, `Historial cerrado (Cortes Z)` con sello determinístico SHA-256 y `Cajas y traspasos` con Boleta de Movimiento de Fondos (`BMF`).
- **4. Clientes y fidelidad (`/dashboard/clientes`, `/dashboard/sellos`, `/dashboard/monedero`, `/dashboard/campanas`):**
  - Competencia automática de beneficios (`evaluateBestBenefit`) entre Nivel VIP, Cumpleaños y Cupón promocional; saldos de fiado y monedero calculados desde libros inmutables.
- **5. Equipo, RRHH y tareas (`/dashboard/equipo`):**
  - Dividido mediante `SectionTabs` en 4 vistas:
    1. *Empleados y cuentas:* Usuarios, asignación de rol, PIN de 4 dígitos para fichaje, turno habitual y valor hora en ARS.
    2. *Roles y permisos:* Configuración granular de acceso a los 16 módulos del panel.
    3. *RRHH, fichaje y adelantos:* Reloj de asistencia por PIN (entrada/salida automática con cálculo de horas trabajadas y liquidación estimada) y registro de vales/adelantos de sueldo, bonos y liquidaciones.
    4. *Tareas operativas del día:* Checklist gastronómico por puesto (`Cocina`, `Cajero`, `Encargado`) y frecuencia (`Apertura`, `Diaria`, `Cierre`, `Semanal`) con firma de cumplimiento.
- **6. Menú y web (`/dashboard/productos` y `/dashboard/web`):**
  - Agrupados bajo el grupo **Menú y web** del sidebar.
  - `/dashboard/web` ofrece 3 pestañas superiores (`SectionTabs`): *Portada, local y Wi-Fi* (con vista previa móvil en vivo y tarjeta de Wi-Fi para salón), *Código QR y links* (generador vectorial SVG descargable e imprimible para mesas/packaging) y *Legal y botón de arrepentimiento* (Términos, Privacidad Ley 25.326, sello de confirmación del titular/asesor y bandeja de solicitudes Res. SCI 424/2020).
- **7. Sistema y auditoría (`/dashboard/sistema`):**
  - Dividido en 3 pestañas superiores (`SectionTabs`): *Configuración comercial y fiscal* (CUIT, condición IVA, Punto de Venta ARCA, descuentos/recargos por medio de pago, ticket térmico de 80 mm con vista previa en vivo), *Auditoría inmutable* (bitácora filtrable por categoría y exportable a CSV) y *Copias de seguridad y datos demo* (exportación/importación JSON de todos los almacenes `burger-vb:*` y restablecimiento de fábrica).
- **8. Diseño full-width, Navigation Drawer y Tienda Pública:**
  - **Ancho completo responsivo (`PAGE_CONTAINER`):** Todo el sitio público y el panel utilizan `max-w-[1920px] px-3 sm:px-5 lg:px-8` para aprovechar el ancho completo de pantalla con márgenes laterales sutiles y evitar solapamientos de texto en móvil (`SectionTabs` con scroll horizontal, `StatCards` y `PageHeader` con `min-w-0` y `break-words`).
  - **Navigation Drawer moderno (`AdminShell`):** Menú lateral en escritorio y `Sheet` deslizable en móvil, con íconos en contenedores de color diferenciados por módulo, apartados desplegables/colapsables (`ChevronDown`) y sin `transition-colors` en los enlaces activos para evitar parpadeos de color al cambiar de módulo.
  - **Tienda pública (`src/app/(shop)/page.tsx` y `layout.tsx`):**
    - Se eliminó el botón y la sección *"Cómo pedir"* del inicio.
    - Debajo de la tienda (`MenuSection`) se incorporó `LoyaltyShowcase` (registro/ingreso + tarjeta de fidelidad de ejemplo, cupones, monedero y niveles Bronce/Plata/Oro), `ReviewsLocation` (reseña en Google + mapa embebido de ubicación y horarios), `SocialSection` (Instagram, TikTok, Facebook y WhatsApp configurables desde `/dashboard/web`) y `StoreFooter` con enlaces a las rutas legales dinámicas (`/terminos`, `/privacidad`, `/arrepentimiento`).

## Supuestos
- Los precios, costos, valores hora de empleados, límites de crédito y saldos de monedero se expresan en pesos argentinos (`ARS`).
- Se precargan empleados de demostración (`Agustín Pereyra` PIN `1024`, `Valentina Gómez` PIN `2048`, `Tomás Sosa` PIN `3090`), fichajes, vales, checklist de cocina y eventos de auditoría para poder probar todos los flujos de inmediato.

## Workarounds
- Para cumplir con las reglas estrictas de pureza e inmutabilidad de React 19 (`react-hooks/purity` y `react-hooks/set-state-in-effect`), se utiliza `useIsClient()` (`useSyncExternalStore`) en lugar de `setState` dentro de `useEffect`.

## Pendientes
- Integración con Supabase (`@supabase/ssr`, migraciones SQL y políticas RLS) cuando el usuario indique avanzar con la capa de base de datos.
