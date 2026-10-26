# Recon map: Menu4D (web, multi-tenant)

Scope: las dos mitades de la app — **carta pública del comensal** (QR/URL por local, plato 3D/AR, pedido) y **panel del local** (salón, cocina, caja, métricas, reservas, carta, roles, Mercado Pago).
For: [pendiente de confirmar con el usuario — supuesto: negocio gastronómico propio / producto a vender]
Date: 2026-10-26

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | app pública del comensal | https://app.menu4d.com.ar/resto4d | único local demo accesible sin cuenta: "Resto4D" · 4.3 (818) |
| 2 | directorio de comercios | https://app.menu4d.com.ar | listado, buscador, orden, paginación, alta de comercio |
| 3 | auth del comensal | https://app.menu4d.com.ar/autenticacion/iniciar-sesion | login + registro (email/pass, Google) |
| 4 | alta de comercio (CTA) | https://app.menu4d.com.ar/alta-comercio | redirige al auth; el onboarding real es post-login |
| 5 | sitio de marketing | https://menu4d.com.ar | propuesta, 4D, flujo de 4 pasos, 12 funciones, mockups del panel, calculadora de ingresos |
| 6 | términos y condiciones | https://menu4d.com.ar/terminos | sin cláusula que prohíba análisis; el local es dueño del contenido que carga |
| 7 | capturas propias | `replica/screens/` | 15 capturas, desktop 1440 y mobile 390 |

Sin acceso a: panel del local (requiere cuenta de comercio), documentación/ayuda pública (no existe), API docs (no públicas).

## Core loop

El comensal escanea el QR de la mesa → ve la carta con el plato en 3D/AR → pide desde el celular → el pedido cae en salón/cocina → se cobra en caja y se mide qué platos miran. El local paga por la carta 4D (sin comisión por venta; el cobro va a su Mercado Pago).

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Directorio de comercios | `/` | elegir local o darse de alta | header, buscador, orden (4 opciones), items por página (12/24/48), cards de comercio, "Registrá tu comercio" | 1 comercio, paginación "1-1 de 1", vacío no visto |
| S02 | Login comensal | `/autenticacion/iniciar-sesion` | entrar | tabs Iniciar Sesión / Registrarme, email, contraseña, mostrar/ocultar, "Olvidaste tu contraseña", Google | default, loading en botón |
| S03 | Registro comensal | tab Registrarme | crear cuenta | nombre completo, email, contraseña + medidor de fuerza ("Muy corta"), Google | default, contraseña débil |
| S04 | Carta del local (cliente) | `/resto4d` | ver carta y pedir | app bar (logo, buscador global, Ingresar), tabs de categoría con chevrons, sidebar del comercio (media 3D/video, logo circular, badge, estrellas + reseñas, horario + chip Abierto/Cerrado, delivery + minutos), grilla de productos | lleno, mobile 2 col / desktop 3 col, imágenes faltantes |
| S05 | Card de producto | dentro de S04 | elegir plato | título, descripción 2 líneas, precio ARS, imagen, corazón favorito, badge 3D (cubo) | normal, sin 3D, sin stock |
| S06 | Detalle de producto | click en card | ver plato, 3D/AR, agregar | (gate: redirige a S02 sin sesión) | no accesible sin cuenta |
| S07 | Panel · Salón | post-login, tab Salón | operar el turno | tabs de panel, lista de pedidos por mesa/delivery/take away, resumen de ítems, total, chip de estado | En cocina · Confirmado · En camino · Cuenta · Pidió la cuenta |
| S08 | Panel · Cocina | tab Cocina | despachar comandas | columnas por pedido, tiempo transcurrido, ítems, botón "Listo" | 3 min · 9 min · 5 min, listo |
| S09 | Panel · Caja | tab Caja | cerrar turno | turno + total, desglose por medio de pago (Efectivo/Débito/Crédito/Mercado Pago), arqueo | "Arqueo sin diferencias", con diferencia (no visto) |
| S10 | Panel · Métricas | tab Métricas | ver qué mira el cliente | ranking de platos más vistos (30 días), vistas 3D por plato, ticket promedio, horas pico | solo rango 30 días visto |
| S11 | Panel · Reservas | tab Reservas | gestionar reservas | lista por turno: hora, nombre, comensales, estado | Confirmada · Pendiente; rechazo no visto |
| S12 | Panel · Carta | tab Carta | editar carta | filas de plato: ícono 3D, nombre, "Modelo 3D publicado", precio, toggle de disponible | publicado / pausado |
| S13 | Onboarding de comercio | `/alta-comercio` → auth | crear el local | (no visto: requiere cuenta) | — |
| S14 | 3D / AR del plato | dentro de S06 | el diferenciador | visor 3D con órbita, modo video, AR sobre la mesa | carga ("Cargando el plato en 3D"), listo, fallback a foto |

## Flows

```
F01 El comensal abre la carta
    QR -> S04 (categoría, buscador, ficha del comercio)
    happy path clicks: 0 (1 escaneo)
    edge: local cerrado, plato sin foto/3D, categoría vacía, URL con slug inexistente

F02 El comensal pide desde la mesa
    S04/S05 -> S02 login -> S06 detalle -> carrito -> confirmar -> estado del pedido
    happy path clicks: 6-7
    edge: sin sesión (gate duro a login), plato pausado por stock, mesa inválida, pedido duplicado

F03 Llamar al mozo / pedir la cuenta
    S04 -> acción rápida -> aparece en S07 -> mozo resuelve
    happy path clicks: 1
    edge: doble llamada, mesa sin pedido abierto

F04 El local carga un plato y publica el 3D
    S02/onboarding -> S12 -> nuevo plato (foto) -> generación 3D -> QR
    happy path clicks: 5+
    edge: foto rechazada, generación fallida, plato sin categoría

F05 La cocina despacha
    S07 -> S08 -> "Listo" -> vuelve a S07 como entregado
    happy path clicks: 2
    edge: pedido cancelado desde el salón, ítem sin stock a mitad de cocina

F06 La caja cierra el turno
    S07 -> S09 -> arqueo por medio de pago -> cierre -> historial
    happy path clicks: 3
    edge: diferencia de caja, turno sin apertura, pago por Mercado Pago sin confirmar

F07 El dueño mira métricas
    S10 -> ranking / vistas 3D / ticket / horas pico -> decide (precio, destacar plato)
    happy path clicks: 1
    edge: local sin datos, rango sin pedidos

F08 La reserva se confirma
    (cliente, canal no visto) -> S11 -> confirmar/rechazar -> aviso automático
    happy path clicks: 2
    edge: dos reservas al mismo horario, sin mesas disponibles, no-show
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| App bar | público, panel | sticky, con/sin buscador, con avatar | S01, S04, S07-S12 |
| Category tabs | scroll horizontal con chevrons, chips del panel | active, hover, scroll | S01, S04, S07-S12 |
| Search input | global (productos), por comercio (directorio) | default, focus, sin resultados | S01, S04 |
| Product card | desktop 3 col, mobile 2 col | normal, favorito, 3D, sin imagen, pausado | S04 |
| Merchant card (sidebar) | desktop lateral, mobile colapsada | abierto, cerrado, con rating, sin rating | S04 |
| Rating | estrellas + conteo | parcial 4.3 | S01, S04 |
| Status chip | En cocina, Confirmado, En camino, Cuenta, Pendiente, Publicado | color por estado | S07, S08, S11, S12 |
| Order row | mesa/delivery/take away | con detalle, solo total, pidió la cuenta | S07 |
| Kitchen card | columnas | timer, listo | S08 |
| Money summary | desglose por medio de pago, arqueo | cuadrado, con diferencia | S09 |
| Ranking bar | barra horizontal con doble tono | top 4, sin datos | S10 |
| Reservation row | hora + nombre + comensales | confirmada, pendiente, rechazada | S11 |
| Toggle | disponible / pausado | on, off, loading | S12 |
| Auth tabs | Iniciar Sesión / Registrarme | activo | S02, S03 |
| Password field | con medidor de fuerza | vacío, muy corta, ok | S03 |
| 3D viewer | órbita, video, AR | cargando, listo, error, fallback foto | S14 |
| Toast | éxito, error | auto-dismiss | global |

## Inferred data model

```
Merchant     id, slug, name, logo_url, cover_url, category, description,
             phone, address, hours[], delivery_fee, delivery_min_minutes,
             rating_avg, rating_count, plan, status (active|paused|closed), owner_user_id
             evidence: S01 card, S04 sidebar, marketing "Carta/QR/planes"
             confidence: high

Category     id, merchant_id, name, sort_order
             evidence: S04 tabs + encabezados de sección
             confidence: high

Product      id, merchant_id, category_id, name, description, price_cents,
             currency (ARS), image_url, model_3d_url, video_url,
             has_ar, available (bool), sort_order, views_count
             evidence: S04/S05 cards, S12 filas + toggle, S10 ranking de vistas
             confidence: high

Table        id, merchant_id, number, qr_token, zone (salón/terraza)
             evidence: S07 "Mesa 04/07/11", marketing "QR por mesa"
             confidence: high

Order        id, merchant_id, channel (salon|delivery|takeaway),
             table_id?, customer_id?, status (pending|confirmed|in_kitchen|ready|delivered|closed|cancelled),
             subtotal, delivery_fee, total, payment_method?, created_at, closed_at
             evidence: S07 chips, S08 tiempos, S09 desglose
             confidence: high

OrderItem    id, order_id, product_id, quantity, unit_price, notes
             evidence: S07 "2 Milanesas · 1 Ensalada"
             confidence: high

Call         id, merchant_id, table_id, type (waiter|bill), status, created_at
             evidence: S07 "Pidió la cuenta", marketing "Llamados al mozo y cuentas"
             confidence: medium

Shift        id, merchant_id, opened_by, closed_by, opened_at, closed_at,
             total, by_payment_method (json: cash|debit|credit|mercadopago),
             expected_total, difference
             evidence: S09 turno/cierre/arqueo
             confidence: high

Reservation  id, merchant_id, customer_name, customer_phone, date, time,
             party_size, status (pending|confirmed|rejected|no_show),
             table_id?, notes, notified_at
             evidence: S11 filas + "aviso automático al cliente"
             confidence: high

User         id, role (owner|manager|waiter|kitchen), email, name,
             auth_provider (password|google), merchant_ids[]
             evidence: S02/S03, marketing "Equipo con roles"
             confidence: high

MenuView     id, merchant_id, product_id, session_id?, type (view|3d_view),
             created_at
             evidence: S10 "vistas", "vistas 3D por plato"
             confidence: medium

Review       id, merchant_id, customer_id, rating (1-5), comment, created_at
             evidence: "4.3 (818)" en S01/S04; pantalla de reseña no vista
             confidence: medium

Payment      id, order_id, provider (mercadopago), provider_payment_id,
             amount, status, paid_at
             evidence: términos §4 y S09 "Mercado Pago"
             confidence: medium
```

Relationships: Merchant 1-n Category, Merchant 1-n Product, Category 1-n Product; Merchant 1-n Table; Table 1-n Order; Order 1-n OrderItem; Product 1-n OrderItem; Merchant 1-n Shift; Order 1-n Payment; Merchant 1-n Reservation; User n-n Merchant (roles); Product 1-n MenuView.

## Feature matrix

See `features.csv`. Must: 19, should: 8, could: 5, skip: 4.

## Out of scope (cannot or should not be cloned)

- **Generación de modelos 3D desde una foto**: es el core técnico del producto (fotogrametría/NeRF propietario). Se puede integrar con un servicio externo (Luma AI, Tripo, Meshy) o cargar `.glb` hechos a mano; no se replica el pipeline.
- **Assets del original**: fotos de platos, modelos 3D, logo, textos, nombres de platos de la demo, paleta y tipografías exactas.
- **Datos de la red**: locales, reseñas, 818 valoraciones, historial de pedidos.
- **Integración real de Mercado Pago**: requiere cuenta y credenciales propias; se integra con la API oficial, no con la del original.
- **Dominio, marca "Menu4D"** y los links de WhatsApp/redes del original.
- **Facturación electrónica**: el propio original no la tiene (FAQ), no es una brecha que copiar.

## Size

Screens 14, flows 8, entities 13. Hard parts: multi-tenant con roles, tiempo real (pedidos/cocina/mozo/cuenta), visor 3D + AR en web móvil, caja con arqueo por medio de pago, pagos con Mercado Pago, generación/ingesta de modelos 3D. Size: **L** (un trimestre para una persona; M si se recorta a carta + pedidos y se simula el 3D con `.glb` fijos).
