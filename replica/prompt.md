# Prompt detallado — clon de la referencia Menu4D (carta QR 4D + panel del local) · marca a reemplazar

> Pégalo completo en el agente que va a construir. Es autocontenido: no
> necesita acceso al original. Basado en `replica/recon.md`.

---

## Rol y objetivo

Sos un ingeniero de producto full-stack. Construí desde cero, clean-room, una
plataforma web multi-local llamada **[NOMBRE]** para negocios gastronómicos:
carta pública por QR con plato en 3D/AR y pedido desde la mesa, más un panel
operativo (salón, cocina, caja, métricas, reservas, carta, roles) y cobro con
Mercado Pago sin comisión.

No copies código, textos, fotos, modelos 3D, paleta ni tipografías del
original. Reimplementá **funcionalidad y flujos**. Español rioplatense (voseo)
en toda la UI. Precios en ARS con formato `$ 22.000`.

## Alcance

Dos superficies, un solo backend:

1. **Comensal (público, mobile-first)**: `/` directorio de comercios, `/{slug}`
   carta del local, visor 3D/AR del plato, carrito, pedido, llamar al mozo,
   pedir la cuenta, estado del pedido, reserva.
2. **Panel del local (privado, responsive con foco mobile)**: salón, cocina,
   caja, métricas, reservas, carta, equipo y roles, ajustes y QR por mesa.

## Stack

- **Front**: Next.js 15 (App Router) + TypeScript estricto + Tailwind CSS v4 +
  shadcn/ui (base-ui) + TanStack Query + Zustand (carrito) + Zod.
- **Back**: Next.js route handlers o Fastify separado; **PostgreSQL** +
  **Drizzle ORM** (migraciones versionadas); **Supabase** o Postgres gestionado.
- **Auth**: email+contraseña (argon2) y Google OAuth; sesión por cookie
  httpOnly; tabla `users` con roles por local.
- **Tiempo real**: Supabase Realtime o WebSocket propio; fallback a polling de
  5 s si el socket cae.
- **3D**: `three.js` + `@react-three/fiber` cargando `.glb` con Draco; AR con
  WebXR en Android y `<model-viewer>`/Quick Look (USDZ) en iOS.
- **3D desde foto**: integrar un servicio externo (Luma AI / Tripo / Meshy) por
  API; si no hay clave, permitir subir un `.glb` propio. No implementes
  fotogrametría.
- **Pagos**: Mercado Pago **Checkout API** con credenciales del local
  (OAuth de Mercado Pago), webhook idempotente, nunca dinero en tu cuenta.
- **Emails**: Resend. **Storage**: S3 compatible para fotos y modelos.

## Modelo de datos (SQL, Postgres)

```sql
users(id, email unique, password_hash null, name, avatar_url,
      auth_provider enum(password,google), created_at)
merchants(id, slug unique, name, category, description, logo_url, cover_url,
      phone, whatsapp, address_line, lat, lng, delivery_fee_cents, delivery_min_minutes,
      status enum(active,paused,closed), plan, mp_account_id,
      rating_avg numeric(2,1) default 0, rating_count int default 0, created_at)
merchant_users(merchant_id, user_id, role enum(owner,manager,waiter,kitchen),
      primary key(merchant_id,user_id))
merchant_hours(id, merchant_id, weekday 0-6, open_time, close_time)
categories(id, merchant_id, name, sort_order)
products(id, merchant_id, category_id, name, description, price_cents, currency default 'ARS',
      image_url, model_3d_url, video_url, has_ar bool, available bool default true,
      sort_order, views_count int default 0, created_at)
tables(id, merchant_id, number, label, qr_token unique, zone)
orders(id, merchant_id, channel enum(salon,delivery,takeaway), table_id null,
      customer_id null, status enum(pending,confirmed,in_kitchen,ready,delivered,closed,cancelled),
      subtotal_cents, delivery_fee_cents, total_cents,
      payment_method enum(cash,debit,credit,mercadopago) null,
      notes, created_at, closed_at)
order_items(id, order_id, product_id, name_snapshot, unit_price_cents, quantity, notes)
calls(id, merchant_id, table_id, type enum(waiter,bill),
      status enum(open,resolved), created_at, resolved_at)
shifts(id, merchant_id, opened_by, closed_by, opened_at, closed_at,
      total_cents, cash_cents, debit_cents, credit_cents, mp_cents,
      expected_cents, difference_cents)
reservations(id, merchant_id, customer_name, customer_phone, date, time,
      party_size, status enum(pending,confirmed,rejected,no_show),
      table_id null, notes, notified_at)
menu_views(id, merchant_id, product_id, session_id, type enum(view,view_3d), created_at)
reviews(id, merchant_id, customer_id, order_id null, rating 1-5, comment, created_at)
payments(id, order_id, provider default 'mercadopago', provider_payment_id unique,
      amount_cents, status enum(pending,approved,rejected,refunded), paid_at)
```

Índices obligatorios: `products(merchant_id, category_id, sort_order)`,
`orders(merchant_id, status, created_at desc)`, `menu_views(product_id,
created_at)`, `reservations(merchant_id, date, time)`, `tables(qr_token)`.
Todas las tablas con `merchant_id` llevan RLS/filtro por local: un usuario solo
ve los datos de los locales donde tiene fila en `merchant_users`.

## Rutas

```
público
  /                             directorio: buscador, orden, paginación 12/24/48
  /{slug}                       carta del local (+ ?mesa=<qr_token>)
  /{slug}/p/{productId}         detalle del plato: 3D, video, AR, agregar
  /{slug}/carrito               carrito y checkout
  /{slug}/pedido/{orderId}      estado del pedido en vivo
  /{slug}/reserva               reservar mesa
  /entrar /registro /recuperar  auth del comensal
privado (requiere sesión con rol)
  /panel/{merchantSlug}/salon
  /panel/{merchantSlug}/cocina
  /panel/{merchantSlug}/caja
  /panel/{merchantSlug}/metricas
  /panel/{merchantSlug}/reservas
  /panel/{merchantSlug}/carta
  /panel/{merchantSlug}/equipo
  /panel/{merchantSlug}/ajustes  (horarios, delivery, QR por mesa, Mercado Pago)
  /alta-comercio                onboarding: crear local, cargar primer plato, QR
```

## Pantallas y estados (obligatorio implementar cada estado)

**Directorio `/`** — grid de cards de comercio (logo, nombre, categoría, chip
Abierto/Cerrado, rating con conteo, "Envío $ 50 · 30 min"), buscador por
nombre, orden (mejor calificados / A-Z / Z-A / más recientes), selector de
12/24/48 por página, "Mostrando 1-N de M". Estados: con resultados, vacío
("No encontramos comercios"), cargando (skeletons), error de red con
reintento.

**Carta `/{slug}`** — app bar sticky con logo, buscador de productos y botón
Ingresar/avatar. Tabs de categoría horizontales con scroll y chevrons. Sidebar
(desktop) / header colapsable (mobile) con media 3D o video del plato estrella,
logo circular, nombre, badge de estado, rating, horario y chip Abierto/Cerrado,
delivery + minutos. Secciones por categoría con grilla de cards: desktop 3 col,
mobile 2 col. Card: nombre, descripción a 2 líneas con clamp, precio, imagen a
la derecha, corazón de favorito, badge 3D. Estados: lleno, categoría vacía
("Todavía no hay platos acá"), búsqueda sin resultados, local cerrado (banner y
checkout bloqueado), producto pausado (card atenuada, sin botón), sin imagen
(placeholder generado), error de datos.

**Detalle del plato** — visor 3D con órbita y zoom, botón "Ver en tu mesa" (AR),
tabs 3D / video / foto, descripción completa, precio, selector de cantidad,
nota opcional ("sin cebolla"), Agregar al pedido. Estados: modelo cargando con
progreso, modelo fallido → fallback a foto con aviso, AR no soportado en el
dispositivo → ocultar botón y explicar, agregado → toast con "Ver pedido".

**Carrito / checkout** — lista con cantidad editable y swipe para borrar,
subtotal, envío, total; datos de entrega si es delivery; medio de pago
(Efectivo, Débito, Crédito, Mercado Pago); botón Confirmar pedido. Gate: sin
sesión redirige a `/entrar` y vuelve al carrito. Estados: vacío, ítem pausado
mientras se compra (sacar y avisar), pago rechazado, pago aprobado,
confirmación con número de pedido y link a estado.

**Estado del pedido** — timeline horizontal (Confirmado → En cocina → Listo /
En camino → Entregado), tiempo estimado, total, botones Llamar al mozo y Pedir
la cuenta. En vivo por realtime. Estados: cancelado por el local, ítems
faltantes, sin conexión.

**Auth** — una sola tarjeta con tabs Iniciar Sesión / Registrarme. Login:
email, contraseña con mostrar/ocultar, "¿Olvidaste tu contraseña?", Continuar
con Google. Registro: nombre completo, email, contraseña con medidor de fuerza
("Muy corta" / "Aceptable" / "Fuerte"), Continuar con Google. Errores inline
por campo, no alerts.

**Panel · Salón** — tabs de navegación del panel (Salón, Cocina, Caja, Métricas,
Reservas, Carta). Lista de pedidos activos: mesa o canal, resumen de ítems,
total, chip de estado, tiempo transcurrido. Acciones por pedido: confirmar,
pasar a cocina, marcar entregado, cerrar cuenta. Los llamados al mozo y
"pidió la cuenta" aparecen como alertas arriba con acción Resolver. Estados:
sin pedidos abiertos ("Todo al día"), muchos pedidos (agrupados por canal),
pedido nuevo entrando en vivo (animación sutil + contador).

**Panel · Cocina** — columnas o cards por comanda, ordenadas por llegada, con
timer en minutos, ítems en texto grande, botón "Listo" de un toque. Estados:
pendientes, listo (se va de la vista con animación de salida), pedido
cancelado, sin comandas.

**Panel · Caja** — turno actual con total grande, desglose por medio de pago
(Efectivo, Débito, Crédito, Mercado Pago), apertura con responsable, cierre con
arqueo (esperado vs contado → diferencia), historial de cierres por fecha.
Estados: turno sin abrir, turno abierto, diferencia negativa (rojo) y cero
("Arqueo sin diferencias"), cerrado (solo lectura).

**Panel · Métricas** — selector de rango (7/30/90 días), ranking de platos más
vistos con barra proporcional y conteo, vistas 3D por plato, ticket promedio,
horas pico (barras por hora), comparación con período anterior en %. Estados:
sin datos suficientes, un solo plato, rango largo.

**Panel · Reservas** — vista por día/turno: hora, nombre, comensales, teléfono,
estado; acciones confirmar / rechazar / marcar no-show; aviso al cliente por
email al confirmar. Estados: pendiente, confirmada, rechazada, no-show, día
vacío, dos reservas solapadas (advertencia).

**Panel · Carta** — lista de platos con ícono 3D, nombre, "Modelo 3D publicado"
o "Sin 3D", precio editable inline, toggle disponible/pausado, drag para
reordenar, editar/eliminar. Alta de plato: nombre, categoría, descripción,
precio, foto (drag & drop con recorte), generar 3D desde la foto o subir `.glb`,
preview antes de publicar. Estados: guardando, error de validación, subida al
50%, generación 3D en curso con progreso y notificación al terminar.

**Panel · Equipo** — miembros con rol (dueño, encargado, mozo, cocina),
invitación por email, cambiar rol, quitar. El rol condiciona qué tabs ve:
cocina no ve caja ni métricas; mozo solo salón.

**Panel · Ajustes** — datos del local, horarios por día, delivery (costo y
demora), Mercado Pago (conectar/desconectar cuenta), QR por mesa (generar,
descargar PNG y PDF con el logo).

**Onboarding `/alta-comercio`** — 3 pasos: cuenta → datos del local → primer
plato y QR. Barra de progreso, se puede abandonar y retomar. Al terminar, link
público `/{slug}` y QRs listos.

## Design system

Dark-first, alto contraste, acentos azul y ámbar; superficies `#0B1220`,
`#121A2B`, `#1B2438`; texto `#E6EDF7` / `#93A2BC`; azul `#3B9CFF`, ámbar
`#F0A83C`, verde éxito `#35C48A`, rojo error `#F2555A`. Radios 10/14/20 px,
sombras suaves, bordes 1 px `rgba(255,255,255,.08)`. Tipografía variable Geist
o Inter; títulos 24-32 px, cuerpo 15-16 px, precios con `font-variant-numeric:
tabular-nums`. Sin imágenes del original: fotos de platos de un banco de uso
libre y modelos `.glb` genéricos.

## Reglas mobile-native (no negociable)

- Áreas táctiles ≥ 44 px; `-webkit-tap-highlight-color: transparent`.
- `100dvh`, `env(safe-area-inset-*)` en app bar y barra de carrito fija.
- Inputs con `font-size: 16px` mínimo para no hacer zoom en iOS.
- `overscroll-behavior: contain` en modales y sheets; cart como bottom sheet con
  arrastre y snap.
- `prefers-reduced-motion` respetado en todas las animaciones.
- Probar en un teléfono real: carrusel de categorías, sheet del carrito, visor
  3D con WebGL y scroll largo de la carta.

## Criterios de aceptación

1. Un comensal sin cuenta abre `/{slug}`, ve la carta con categorías,
   encuentra un plato por búsqueda y lo ve en 3D con fallback a foto.
2. Con cuenta, agrega dos platos, elige delivery, paga con Mercado Pago en
   sandbox y ve el pedido en estado "Confirmado" actualizándose en vivo al
   pasar a "En cocina".
3. El local ve el pedido en Salón en < 2 s, lo manda a Cocina, Cocina lo marca
   Listo y Salón lo entrega.
4. "Llamar al mozo" y "Pedir la cuenta" generan alertas resolubles en Salón.
5. Caja: abrir turno con responsable, cobrar tres pedidos con medios distintos,
   cerrar con arqueo y ver la diferencia calculada y el historial.
6. Métricas muestran ranking de vistas reales (contadas al abrir el detalle) y
   vistas 3D separadas.
7. Reservas: crear, confirmar con email al cliente, rechazar, marcar no-show.
8. Un usuario con rol `kitchen` no puede abrir Caja ni Métricas (403 en API,
   no solo oculto en UI).
9. Ningún endpoint filtra datos de otro local (test automatizado con dos
   locales y dos usuarios).
10. Lighthouse mobile ≥ 90 en `/{slug}`; la carta abre con 200 platos sin
    bloquear el hilo principal.

## Fuera de alcance

Generación propia de modelos 3D desde foto (se integra un servicio), facturación
electrónica, app nativa, marketplace de terceros, y todo asset o dato del
original.

## Orden de construcción

1. Esquema + migraciones + seed (1 local, 4 categorías, 20 platos con fotos y
   2 `.glb`).
2. Carta pública + búsqueda + detalle con visor 3D (sin AR).
3. Auth + carrito + pedido + estado en vivo.
4. Panel: Salón y Cocina con realtime.
5. Caja y Métricas.
6. Reservas y QR por mesa.
7. Carta editable + subida de fotos + ingesta de `.glb`.
8. Roles, RLS y tests de aislamiento.
9. Mercado Pago sandbox + emails.
10. Onboarding y pulido mobile (bottom sheets, safe areas, reduced motion).

Cada paso cierra con: tipos sin `any`, lint limpio, tests del flujo tocado y
una captura mobile.
