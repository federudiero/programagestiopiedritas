# Gestión de productos, costos, pedidos y reparto

App React + Vite + Firebase conectada al proyecto `porgrama-de-productos-costos`.

## Instalación segura

```bash
npm config set ignore-scripts true
npm install
npm run dev
```

## Usuario

El acceso está limitado por reglas a:

```txt
federudiero@gmail.com
```

No guardes contraseñas dentro del código.

## Firebase Rules

Pegá el contenido completo de `firestore.rules` en Firestore Rules.

## Secciones incluidas

- Inicio: resumen general.
- Productos: costos, comisiones, precios por tramos, aliases y stock.
- Calculadora: precio cliente, costo, comisión, ganancia y objetivos.
- Pedidos: carga manual, carga masiva, parser con productos, envío interno, WhatsApp y PDF.
- Clientes: base automática por teléfono.
- Vendedores: administración básica.
- Caja: caja diaria, ingresos/egresos manuales, venta, comisión y ganancia.
- Hoja de ruta: pedidos por fecha/zona, links a WhatsApp y OpenStreetMap, PDF.
- Stock: entradas, salidas, ajustes y alertas de stock bajo.
- Comisiones: liquidación por vendedor e historial.
- Cuenta corriente: pedidos pendientes por cliente y marcar pagado.
- Zonas / mapa: detector local de zonas Córdoba y alrededores sin API paga.
- Estadísticas: ventas por período, producto, vendedor y día.
- Auditoría: cambios importantes del sistema.
- Backups: JSON completo y CSV de pedidos.

## Mapa sin Google API

No usa Google Maps API. El sistema:

- Detecta zonas con una base local de aliases.
- Abre direcciones en OpenStreetMap o respeta links externos pegados por el vendedor.
- No geocodifica automáticamente cada pedido, para evitar costos y lecturas/procesos innecesarios.

## Cargar datos iniciales

```powershell
$env:FIREBASE_EMAIL="federudiero@gmail.com"
$env:FIREBASE_PASSWORD="TU_PASSWORD_DE_FIREBASE"
npm run seed:datos
```

## Optimización de lecturas

- El cambio de estado de pedidos escribe solo el campo `estado` y no refresca todo.
- Auditoría, caja, stock y liquidaciones cargan sus colecciones solo al entrar a cada sección.
- Para sincronizar todo manualmente usá el botón `Actualizar datos` donde corresponda o refrescá la página.

## Paginación y responsive

Todas las secciones con listados tienen paginación visual con selector de 10, 25, 50 o 100 registros por página. En celular las tablas pasan a formato tarjeta para evitar scroll horizontal incómodo.

> Nota: esta paginación organiza la vista en pantalla. Las lecturas principales siguen dependiendo de las consultas a Firebase de cada sección. Para reducir lecturas a nivel base de datos en colecciones muy grandes, el siguiente paso es paginación server-side con `limit()` y cursores por colección.

## Deploy

El proyecto ya incluye:

- `vercel.json`
- `netlify.toml`
- `public/_redirects`
- `DEPLOY.md`

En Vercel o Netlify cargá las variables `VITE_*` del `.env.example` en el panel del hosting.
